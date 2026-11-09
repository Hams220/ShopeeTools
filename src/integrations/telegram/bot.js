import { format, inspect } from "node:util";
import { createConfigEditor } from "./configEditor.js";
import { createSessionManager } from "./sessionManager.js";
import { createMessageManager } from "./messageManager.js";
import { createPromptManager } from "./promptManager.js";
import { createCallbackHandler } from "./callbackHandler.js";
import { createMessageHandler } from "./messageHandler.js";

const TELEGRAM_API = "https://api.telegram.org/bot";
const MESSAGE_LIMIT = 3500;
function splitMessage(text, limit = MESSAGE_LIMIT) {
  const chunks = [];
  let remaining = String(text ?? "");
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n", limit);
    if (cut < limit * 0.5) cut = limit;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, "");
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function formatConsoleValue(method, args) {
  if (method === "table") {
    const [value, columns] = args;
    return inspect(value, { depth: 3, maxArrayLength: 30, breakLength: 110 }) +
      (columns ? `\nKolom: ${format("%o", columns)}` : "");
  }
  if (method === "dir") {
    const [value, options = {}] = args;
    return inspect(value, { depth: options.depth ?? 4, colors: false, maxArrayLength: 50 });
  }
  return format(...args);
}

export async function startTelegramBot({ app, client, token, ownerId }) {
  const owner = String(ownerId).trim();
  if (!/^\d+$/.test(owner)) {
    throw new Error("TELEGRAM_OWNER_ID harus berupa numeric Telegram user ID.");
  }

  const apiUrl = `${TELEGRAM_API}${token}`;
  const rawConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
    table: console.table.bind(console),
    dir: console.dir.bind(console),
  };

  async function botApi(method, payload = {}, signal) {
    const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
    const response = await fetch(`${apiUrl}/${method}`, {
      method: "POST",
      ...isFormData ? {} : { headers: { "Content-Type": "application/json" } },
      body: isFormData ? payload : JSON.stringify(payload),
      ...(signal ? { signal } : {}),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(`${method} gagal: ${result.description ?? `HTTP ${response.status}`}`);
    }
    return result.result;
  }

  const sessionManager = createSessionManager();
  const messageManager = createMessageManager({ botApi, ownerId: owner, splitMessage });
  const { sendMessage } = messageManager;
  const answerCallback = messageManager.answerCallbackQuery;
  const promptManager = createPromptManager({ sessionManager, messageManager, flushOutput, answerCallback });
  const configEditor = createConfigEditor({ sessionManager, messageManager, answerCallback });

  let offset = 0;
  let stopping = false;
  let running = false;
  let commandReserved = false;
  let activeJob;
  let cancelRequested = false;
  let currentCommand = "";
  let outputBuffer = "";
  let outputTimer;
  let outputFlush = Promise.resolve();
  let pollAbort;

  async function flushOutput() {
    if (outputTimer) {
      clearTimeout(outputTimer);
      outputTimer = undefined;
    }
    if (!outputBuffer) return outputFlush;
    const text = outputBuffer;
    outputBuffer = "";
    outputFlush = outputFlush.then(() => sendMessage(text)).catch((error) => {
      rawConsole.error("Gagal mengirim output service ke Telegram:", error.message);
    });
    return outputFlush;
  }

  function captureOutput(method, args) {
    rawConsole[method](...args);
    if (["/deals", "/checkkout", "/cancelorder", "/wddrama"].includes(currentCommand.toLowerCase())) return;
    const text = formatConsoleValue(method, args);
    if (!text) return;
    outputBuffer += `${text}\n`;
    if (outputBuffer.length >= MESSAGE_LIMIT) {
      void flushOutput();
    } else if (!outputTimer) {
      outputTimer = setTimeout(() => void flushOutput(), 1200);
    }
  }

  function beginOutputCapture() {
    const originals = {};
    for (const method of Object.keys(rawConsole)) {
      originals[method] = console[method];
      console[method] = (...args) => captureOutput(method, args);
    }
    return () => {
      if (outputTimer) clearTimeout(outputTimer);
      for (const [method, original] of Object.entries(originals)) {
        console[method] = original;
      }
    };
  }

  const logger = {
    info(message) { console.log(message); },
    warn(message) { console.warn(message); },
    error(message) {
      if (stopping || (cancelRequested && String(message).includes("Operasi dibatalkan oleh pemilik."))) return;
      console.error(message);
    },
  };

  function helpText() {
    const commands = app.commands.length ? app.commands.join("\n") : "Belum ada command.";
    return `Bot siap. Command yang tersedia:\n${commands}\n\nKirim /cancel saat bot sedang meminta input untuk membatalkan proses.`;
  }

  async function runCommand(text, userId = owner, chatId = owner) {
    currentCommand = text.split(/\s+/, 1)[0];
    running = true;
    cancelRequested = false;
    sessionManager.createSession({
      userId,
      chatId,
      state: "COMMAND_RUNNING",
      data: { command: currentCommand },
    });
    const restoreConsole = beginOutputCapture();
    const ctx = {
      client,
      prompt: promptManager.createPrompt(userId, chatId),
      logger,
      config: process.env,
      configEditor,
      userId: String(userId),
      chatId: String(chatId),
      notify(text, options) { return sendMessage(text, options); },
      sendPhoto(buffer, caption) { return messageManager.sendPhoto(chatId, buffer, caption); },
      sendDocument(buffer, fileName, caption) { return messageManager.sendDocument(chatId, buffer, fileName, caption); },
      editMessage(messageId, text, replyMarkup) {
        return messageManager.editMessageText(chatId, messageId, text, replyMarkup);
      },
    };
    try {
      const handled = await app.dispatch(text, ctx);
      if (!handled) logger.warn(`Command tidak dikenal: ${currentCommand}. Gunakan /help untuk melihat daftar command.`);
    } catch (error) {
      if (error?.name === "PromptCancelledError") cancelRequested = true;
      else logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      restoreConsole();
      await flushOutput();
      const session = sessionManager.getSession(userId, chatId);
      if (session?.data?.flow !== "setconfig") sessionManager.clearSession(userId, chatId);
      currentCommand = "";
      running = false;
      activeJob = undefined;
    }
  }

  const handleMessage = createMessageHandler({
    ownerId: owner,
    sessionManager,
    configEditor,
    promptManager,
    sendMessage,
    runCommand: async (text, userId, chatId) => {
      activeJob = runCommand(text, userId, chatId);
      commandReserved = false;
      await activeJob;
    },
    isBusy: () => running || commandReserved,
    reserveCommand() {
      if (running || commandReserved) return false;
      commandReserved = true;
      return true;
    },
    releaseCommand() { commandReserved = false; },
    currentCommand: () => currentCommand,
    helpText,
    resolvePrompt: (userId, chatId, value) => promptManager.resolve(userId, chatId, value),
    async cancelPrompt(userId, chatId) {
      cancelRequested = true;
      await promptManager.cancel(userId, chatId);
    },
    logError(error) {
      rawConsole.error("Gagal menangani pesan bot:", error instanceof Error ? error.message : String(error));
    },
  });

  const handleCallbackQuery = createCallbackHandler({
    ownerId: owner,
    configEditor,
    promptManager,
    answerCallbackQuery: answerCallback,
    isBusy: () => running || commandReserved,
    logError(error) {
      rawConsole.error("Gagal mengonfirmasi callback Telegram:", error instanceof Error ? error.message : String(error));
    },
  });

  async function discardPendingUpdates() {
    while (true) {
      const updates = await botApi("getUpdates", {
        offset,
        timeout: 0,
        limit: 100,
        allowed_updates: ["message", "callback_query"],
      });
      if (!updates.length) break;
      offset = updates[updates.length - 1].update_id + 1;
      if (updates.length < 100) break;
    }
  }

  function requestStop() {
    stopping = true;
    pollAbort?.abort();
    promptManager.abort(owner, owner);
  }

  process.once("SIGINT", requestStop);
  process.once("SIGTERM", requestStop);

  const webhookInfo = await botApi("getWebhookInfo");
  if (webhookInfo?.url) {
    throw new Error("Bot masih menggunakan webhook. Nonaktifkan webhook untuk memakai long polling.");
  }
  await discardPendingUpdates();
  await sendMessage("Bot aktif. Akses dibatasi ke akun owner ini.\n\n" + helpText());
  rawConsole.info("Telegram bot aktif dengan long polling.");

  try {
    while (!stopping) {
      pollAbort = new AbortController();
      try {
        const updates = await botApi("getUpdates", {
          offset,
          timeout: 25,
          limit: 100,
          allowed_updates: ["message", "callback_query"],
        }, pollAbort.signal);
        for (const update of updates) {
          offset = Math.max(offset, update.update_id + 1);
          if (update.message) {
            void handleMessage(update.message).catch((error) => {
              rawConsole.error("Gagal menangani pesan bot:", error instanceof Error ? error.message : String(error));
            });
          }
          if (update.callback_query) {
            void handleCallbackQuery(update.callback_query).catch((error) => {
              rawConsole.error("Gagal menangani tombol bot:", error instanceof Error ? error.message : String(error));
            });
          }
        }
      } catch (error) {
        if (!stopping) {
          rawConsole.error("Polling Telegram gagal:", error instanceof Error ? error.message : String(error));
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } finally {
        pollAbort = undefined;
      }
    }
  } finally {
    requestStop();
    if (activeJob) await activeJob.catch(() => undefined);
    process.off("SIGINT", requestStop);
    process.off("SIGTERM", requestStop);
    rawConsole.info("Telegram bot berhenti.");
  }
}
