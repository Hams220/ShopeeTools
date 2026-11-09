function normalizeTelegramCommand(text) {
  const trimmed = String(text ?? "").trim();
  const [head = "", ...tail] = trimmed.split(/\s+/);
  return [head.replace(/@[^@]+$/, ""), ...tail].join(" ");
}

export function createMessageHandler({
  ownerId,
  sessionManager,
  configEditor,
  sendMessage,
  runCommand,
  isBusy,
  reserveCommand,
  releaseCommand,
  currentCommand,
  helpText,
  resolvePrompt,
  cancelPrompt,
  logError,
}) {
  const owner = String(ownerId);

  return async function handleMessage(message) {
    if (!message?.from || String(message.from.id) !== owner) return;
    if (message.chat?.type !== "private" || String(message.chat.id) !== owner) return;
    const userId = String(message.from.id);
    const chatId = String(message.chat.id);
    const text = typeof message.text === "string" ? message.text.trim() : "";
    if (!text) return;

    if (await configEditor.handleText(userId, chatId, text)) return;

    const session = sessionManager.getSession(userId, chatId);
    if (["WAITING_USER_INPUT", "WAITING_USER_SELECTION"].includes(session?.state)) {
      if (text.toLowerCase() === "/cancel") {
        await cancelPrompt(userId, chatId);
        return;
      }
      if (session.state === "WAITING_USER_INPUT" && !text.startsWith("/")) {
        resolvePrompt(userId, chatId, text);
        return;
      }
      if (session.state === "WAITING_USER_SELECTION" && !text.startsWith("/")) return;
    }

    const normalized = normalizeTelegramCommand(text);
    const command = normalized.split(/\s+/, 1)[0].toLowerCase();
    if (["/start", "/help"].includes(command)) {
      if (isBusy()) {
        await sendMessage(`Sedang menjalankan ${currentCommand()}. Tunggu sampai selesai.`);
      } else {
        await sendMessage(helpText());
      }
      return;
    }
    if (command === "/cancel") {
      await sendMessage(isBusy()
        ? "Tidak ada input yang sedang ditunggu. Proses akan diselesaikan."
        : "Tidak ada proses aktif.");
      return;
    }
    if (!command.startsWith("/")) {
      await sendMessage(isBusy()
        ? `Sedang menjalankan ${currentCommand()}. Tunggu sampai selesai.`
        : "Kirim command atau /help untuk melihat daftar command.");
      return;
    }
    if (isBusy()) {
      await sendMessage(`Sedang menjalankan ${currentCommand()}. Command baru tidak dimasukkan ke antrean.`);
      return;
    }

    if (!reserveCommand()) {
      await sendMessage("Bot sedang memulai proses lain. Tunggu sebentar lalu coba lagi.");
      return;
    }
    try {
      await configEditor.closeActiveSession(userId, chatId);
      void runCommand(normalized, userId, chatId).catch(logError);
    } catch (error) {
      releaseCommand();
      throw error;
    }
  };
}
