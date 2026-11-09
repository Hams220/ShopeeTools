import { randomBytes } from "node:crypto";
import { listConfigEntries, updateConfigValue } from "../../../config/config.js";

const CALLBACK_PREFIX = "sc:";
const INPUT_TIMEOUT_MS = 10 * 60 * 1000;
const SECTION_STATES = new Set(["CONFIG_ROOT", "CONFIG_CHECKOUT", "CONFIG_DEALS"]);

function titleForKey(section, key) {
  if (section === "dealsConfig") {
    if (key === "url_deals_25k") return "URL Deals 25K";
    if (key === "url_deals_50k") return "URL Deals 50K";
  }
  const labels = { cookie: "Cookie", url_product: "URL Product", payment_method: "Payment Method" };
  return labels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const token = () => randomBytes(4).toString("hex");

export function createConfigEditor({ sessionManager, messageManager, answerCallback }) {
  function readSession(userId, chatId) {
    const session = sessionManager.getSession(userId, chatId);
    return session?.data?.flow === "setconfig" ? session : undefined;
  }

  function clearInputTimer(session) {
    if (session?.data?.inputTimer) clearTimeout(session.data.inputTimer);
    if (session?.data) delete session.data.inputTimer;
  }

  function createKeyboard(session, rows = [], withCancel = true) {
    const buttons = rows.map((row) => row.map(({ text, action }) => ({
      text,
      callback_data: `${CALLBACK_PREFIX}${session.data.token}:${action}`,
    })));
    if (withCancel) buttons.push([{ text: "Batal", callback_data: `${CALLBACK_PREFIX}${session.data.token}:cancel` }]);
    return { inline_keyboard: buttons };
  }

  async function render(session, state, text, rows = [], withCancel = true) {
    session.data.token = token();
    sessionManager.updateSession(session.userId, session.chatId, { state });
    await messageManager.editOrSendSessionMessage(
      sessionManager,
      session.userId,
      session.chatId,
      text,
      createKeyboard(session, rows, withCancel),
    );
  }

  async function showRoot(session, text = "⚙️ CONFIGURATION MANAGER\n\nSilakan pilih konfigurasi yang ingin diubah.") {
    clearInputTimer(session);
    delete session.data.section;
    delete session.data.key;
    await render(session, "CONFIG_ROOT", text, [[
      { text: "Checkout Config", action: "section:CheckoutConfig" },
      { text: "Deals Config", action: "section:dealsConfig" },
    ]]);
  }

  async function showSection(session, section) {
    clearInputTimer(session);
    const entries = await listConfigEntries(section);
    const buttons = entries.map(({ key }) => ({ text: titleForKey(section, key), action: `key:${section}:${key}` }));
    const rows = [];
    for (let index = 0; index < buttons.length; index += 2) rows.push(buttons.slice(index, index + 2));
    rows.push([{ text: "Kembali", action: "back" }]);
    session.data.section = section;
    delete session.data.key;
    const isCheckout = section === "CheckoutConfig";
    await render(
      session,
      isCheckout ? "CONFIG_CHECKOUT" : "CONFIG_DEALS",
      `${isCheckout ? "⚙️ CHECKOUT CONFIG" : "⚙️ DEALS CONFIG"}\n\nSilakan pilih konfigurasi yang ingin diubah.`,
      rows,
    );
  }

  async function showResult(session, text) {
    clearInputTimer(session);
    delete session.data.section;
    delete session.data.key;
    await render(session, "CONFIG_RESULT", text, [[
      { text: "Kembali ke Menu", action: "home" },
      { text: "Tutup", action: "close" },
    ]], false);
  }

  async function closeSession(session, text = "Pengaturan ditutup.") {
    clearInputTimer(session);
    const messageId = session.messageId;
    sessionManager.clearSession(session.userId, session.chatId);
    if (messageId) {
      try { await messageManager.editMessageText(session.chatId, messageId, text); } catch { /* message might be deleted */ }
      await messageManager.editMessageReplyMarkup(session.chatId, messageId, { inline_keyboard: [] }).catch(() => {});
    }
  }

  async function start(userId, chatId) {
    const previous = sessionManager.getSession(userId, chatId);
    if (previous) {
      clearInputTimer(previous);
      if (previous.messageId) {
        try { await messageManager.editMessageText(previous.chatId, previous.messageId, "Sesi sebelumnya ditutup."); } catch { /* best effort */ }
        await messageManager.editMessageReplyMarkup(previous.chatId, previous.messageId, { inline_keyboard: [] }).catch(() => {});
      }
      sessionManager.clearSession(userId, chatId);
    }
    const session = sessionManager.createSession({ userId, chatId, state: "CONFIG_ROOT", data: { flow: "setconfig", token: token() } });
    await render(session, "CONFIG_ROOT", "⚙️ CONFIGURATION MANAGER\n\nSilakan pilih konfigurasi yang ingin diubah.", [[
      { text: "Checkout Config", action: "section:CheckoutConfig" },
      { text: "Deals Config", action: "section:dealsConfig" },
    ]]);
  }

  async function handleCallback(query, isBusy = false) {
    const data = String(query.data ?? "");
    if (!data.startsWith(CALLBACK_PREFIX)) return false;
    const session = readSession(query.from.id, query.message?.chat?.id);
    const parts = data.split(":");
    const callbackToken = parts[1];
    const action = parts.slice(2).join(":");
    const messageMatches = session && String(query.message?.message_id) === String(session.messageId);
    if (!session || !messageMatches || callbackToken !== session.data.token) {
      await answerCallback(query.id, "Menu ini sudah kedaluwarsa.");
      return true;
    }
    if (!isBusy) {
      session.data.token = token();
      sessionManager.updateSession(session.userId, session.chatId, { data: session.data });
    }
    await answerCallback(query.id, isBusy ? "Bot sedang menjalankan proses. Coba lagi setelah selesai." : undefined, isBusy);
    if (isBusy) return true;

    try {
      if (action === "cancel") {
        await closeSession(session, "Perubahan konfigurasi dibatalkan.");
        return true;
      }
      if (action === "back") {
        if (session.state === "CONFIG_CHECKOUT" || session.state === "CONFIG_DEALS") await showRoot(session);
        else if (session.state === "WAITING_CONFIG_INPUT") await showSection(session, session.data.section);
        return true;
      }
      if (action.startsWith("section:")) {
        const section = action.slice("section:".length);
        if (session.state !== "CONFIG_ROOT" || !["CheckoutConfig", "dealsConfig"].includes(section)) return true;
        await showSection(session, section);
        return true;
      }
      if (action.startsWith("key:")) {
        const [, section, key] = action.split(":");
        if (!SECTION_STATES.has(session.state) || session.data.section !== section) return true;
        const entries = await listConfigEntries(section);
        if (!entries.some((entry) => entry.key === key)) return true;
        session.data.section = section;
        session.data.key = key;
        const inputTimeout = setTimeout(() => {
          const current = readSession(query.from.id, query.message.chat.id);
          if (current === session && current.state === "WAITING_CONFIG_INPUT") {
            void closeSession(current, "Waktu input habis. Sesi konfigurasi dibatalkan.");
          }
        }, 10 * 60 * 1000);
        inputTimeout.unref?.();
        session.data.inputTimer = inputTimeout;
        const label = titleForKey(section, key);
        await render(session, "WAITING_CONFIG_INPUT", `⚙️ UPDATE ${section === "CheckoutConfig" ? "CHECKOUT" : "DEALS"} CONFIG\n\nSilakan kirimkan ${label} baru.`, [
          [{ text: "Kembali", action: "back" }],
        ]);
        return true;
      }
      if (action === "home" && session.state === "CONFIG_RESULT") {
        await showRoot(session);
        return true;
      }
      if (action === "close" && session.state === "CONFIG_RESULT") {
        await closeSession(session);
        return true;
      }
      return true;
    } catch (error) {
      await showResult(session, `❌ Gagal membuka konfigurasi.\n${error instanceof Error ? error.message : String(error)}`).catch(() => {});
      return true;
    }
  }

  async function handleText(userId, chatId, text) {
    const session = readSession(userId, chatId);
    if (session?.state === "CONFIG_SAVING") return true;
    if (!session || session.state !== "WAITING_CONFIG_INPUT") return false;
    if (text.trim().toLowerCase() === "/cancel") {
      await closeSession(session, "Perubahan konfigurasi dibatalkan.");
      return true;
    }
    if (text.startsWith("/")) return false;

    clearInputTimer(session);
    const { section, key } = session.data;
    const label = titleForKey(section, key);
    session.data.input = undefined;
    await render(session, "CONFIG_SAVING", "⏳ Menyimpan konfigurasi...", [], false);
    try {
      await updateConfigValue(section, key, text);
      const message = section === "CheckoutConfig"
        ? `✅ KONFIGURASI BERHASIL DIPERBARUI\n\n${label} berhasil diperbarui.`
        : `✅ KONFIGURASI BERHASIL DIPERBARUI\n\n${key.endsWith("25k") ? "Deals URL 25K" : "Deals URL 50K"} berhasil diperbarui.`;
      await showResult(session, message);
    } catch (error) {
      await showResult(session, `❌ KONFIGURASI GAGAL DIPERBARUI\n\n${error instanceof Error ? error.message : String(error)}`);
    }
    return true;
  }

  async function closeActiveSession(userId, chatId) {
    const session = sessionManager.getSession(userId, chatId);
    if (session?.data?.flow === "setconfig") await closeSession(session, "Sesi konfigurasi ditutup.");
  }

  return { start, handleCallback, handleText, closeActiveSession };
}
