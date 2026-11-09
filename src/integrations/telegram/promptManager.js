import { randomBytes } from "node:crypto";

const PROMPT_TIMEOUT_MS = 10 * 60 * 1000;
const SELECT_CALLBACK_PREFIX = "ps:";

export class PromptCancelledError extends Error {
  constructor(message = "Operasi dibatalkan oleh pemilik.") {
    super(message);
    this.name = "PromptCancelledError";
  }
}

export function createPromptManager({ sessionManager, messageManager, flushOutput, answerCallback }) {
  function getPrompt(userId, chatId) {
    const session = sessionManager.getSession(userId, chatId);
    return ["WAITING_USER_INPUT", "WAITING_USER_SELECTION"].includes(session?.state)
      ? session.data.pendingInput
      : undefined;
  }

  function settle(userId, chatId, value, error) {
    const session = sessionManager.getSession(userId, chatId);
    const pending = getPrompt(userId, chatId);
    if (!session || !pending) return false;
    clearTimeout(pending.timeout);
    const data = { ...session.data };
    delete data.pendingInput;
    sessionManager.updateSession(userId, chatId, {
      state: pending.returnState ?? "COMMAND_RUNNING",
      data,
    });
    if (error) pending.reject(error);
    else pending.resolve(value);
    return true;
  }

  function createPrompt(userId, chatId) {
    function ask(questionText, choices) {
      const session = sessionManager.getSession(userId, chatId) ?? sessionManager.createSession({
        userId,
        chatId,
        state: "COMMAND_RUNNING",
        data: {},
      });
      const returnState = session.state;
      const selectionToken = choices ? randomBytes(4).toString("hex") : undefined;
      const state = choices ? "WAITING_USER_SELECTION" : "WAITING_USER_INPUT";

      return new Promise((resolve, reject) => {
        const pendingInput = {
          kind: choices ? "selection" : "text",
          returnState,
          resolve,
          reject,
          ...(choices ? { choices, selectionToken } : {}),
          timeout: setTimeout(() => {
            settle(userId, chatId, undefined, new Error("Waktu input habis. Jalankan command kembali untuk mengulang."));
          }, PROMPT_TIMEOUT_MS),
        };
        pendingInput.timeout.unref?.();
        sessionManager.updateSession(userId, chatId, {
          state,
          data: { ...session.data, pendingInput },
        });

        const replyMarkup = choices
          ? {
              inline_keyboard: [
                ...Array.from({ length: Math.ceil(choices.length / 2) }, (_, row) =>
                  choices.slice(row * 2, row * 2 + 2).map((choice, index) => ({
                    text: choice.label,
                    callback_data: `${SELECT_CALLBACK_PREFIX}${selectionToken}:${row * 2 + index}`,
                  })),
                ),
                [{ text: "Batal", callback_data: `${SELECT_CALLBACK_PREFIX}${selectionToken}:cancel` }],
              ],
            }
          : undefined;
        void Promise.resolve(choices ? undefined : flushOutput?.())
          .then(() => messageManager.editOrSendSessionMessage(sessionManager, userId, chatId, questionText, replyMarkup))
          .catch((error) => settle(userId, chatId, undefined, error));
      });
    }

    return {
      question(questionText) {
        return ask(questionText);
      },
      select(questionText, choices) {
        if (!Array.isArray(choices) || choices.length === 0) {
          return Promise.reject(new Error("Pilihan tidak tersedia."));
        }
        return ask(questionText, choices);
      },
      async update(text) {
        await flushOutput?.();
        return messageManager.editOrSendSessionMessage(sessionManager, userId, chatId, text);
      },
    };
  }

  async function handleCallback(query) {
    const data = String(query.data ?? "");
    if (!data.startsWith(SELECT_CALLBACK_PREFIX)) return false;
    const userId = query.from?.id;
    const chatId = query.message?.chat?.id;
    const session = sessionManager.getSession(userId, chatId);
    const pending = getPrompt(userId, chatId);
    const [, selectionToken, selectedIndex] = data.split(":");
    const matches = session?.state === "WAITING_USER_SELECTION" &&
      pending?.kind === "selection" &&
      String(query.message?.message_id) === String(session.messageId) &&
      selectionToken === pending.selectionToken;
    if (!matches) {
      await answerCallback(query.id, "Pilihan ini sudah kedaluwarsa.");
      return true;
    }
    if (selectedIndex === "cancel") {
      pending.selectionToken = randomBytes(4).toString("hex");
      await answerCallback(query.id);
      await messageManager.editMessageText(session.chatId, session.messageId, "❌ Proses dibatalkan.", { inline_keyboard: [] }).catch(() => {});
      settle(userId, chatId, undefined, new PromptCancelledError());
      return true;
    }
    const index = Number(selectedIndex);
    const choice = pending.choices[index];
    if (!Number.isInteger(index) || !choice) {
      await answerCallback(query.id, "Pilihan tidak valid.");
      return true;
    }
    pending.selectionToken = randomBytes(4).toString("hex");
    await answerCallback(query.id);
    await messageManager.editMessageReplyMarkup(session.chatId, session.messageId, { inline_keyboard: [] }).catch(() => {});
    settle(userId, chatId, choice.value);
    return true;
  }

  function resolve(userId, chatId, value) {
    return settle(userId, chatId, value);
  }

  async function cancel(userId, chatId) {
    const session = sessionManager.getSession(userId, chatId);
    if (session?.messageId && getPrompt(userId, chatId)) {
      await messageManager.editMessageText(session.chatId, session.messageId, "❌ Proses dibatalkan.", { inline_keyboard: [] }).catch(() => {});
    }
    return settle(userId, chatId, undefined, new PromptCancelledError());
  }

  function abort(userId, chatId) {
    return settle(userId, chatId, undefined, new Error("Aplikasi berhenti saat menunggu input."));
  }

  return { createPrompt, resolve, cancel, abort, getPrompt, handleCallback };
}
