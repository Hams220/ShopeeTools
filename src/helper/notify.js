async function sendNotif(message, parseMode) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || process.env.TELEGRAM_TOKEN_BOT?.trim();
  const chatId = process.env.TELEGRAM_OWN_CHAT_ID?.trim() || process.env.TELEGRAM_OWNER_ID?.trim() || process.env.TELEGRAM_USER_ID?.trim();
  if (!botToken || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN atau TELEGRAM_OWN_CHAT_ID belum diatur.");
  }
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        ...parseMode ? { parse_mode: parseMode } : {},
        disable_web_page_preview: true
      })
    }
  );
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? `HTTP ${response.status}`);
  }
}
export {
  sendNotif
};
