export function createMessageManager({ botApi, ownerId, splitMessage }) {
  async function sendMessage(text, options = {}) {
    let lastMessage;
    for (const chunk of splitMessage(text)) {
      lastMessage = await botApi("sendMessage", {
        chat_id: options.chatId ?? ownerId,
        text: chunk,
        disable_web_page_preview: true,
        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
        ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
      });
    }
    return lastMessage;
  }

  function editMessageText(chatId, messageId, text, replyMarkup) {
    return botApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
    return botApi("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });
  }

  function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
    return botApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
      ...(showAlert ? { show_alert: true } : {}),
    });
  }

  function sendPhoto(chatId, imageBuffer, caption = "") {
    const form = new FormData();
    form.append("chat_id", String(chatId ?? ownerId));
    form.append("photo", new Blob([imageBuffer], { type: "image/png" }), "checkout-qris.png");
    if (caption) form.append("caption", caption);
    return botApi("sendPhoto", form);
  }

  function sendDocument(chatId, documentBuffer, fileName, caption = "") {
    const form = new FormData();
    form.append("chat_id", String(chatId ?? ownerId));
    form.append("document", new Blob([documentBuffer], { type: "text/plain" }), fileName);
    if (caption) form.append("caption", caption);
    return botApi("sendDocument", form);
  }

  async function editOrSendSessionMessage(sessionManager, userId, chatId, text, replyMarkup) {
    const session = sessionManager.getSession(userId, chatId);
    if (session?.messageId) {
      try {
        await editMessageText(chatId, session.messageId, text, replyMarkup ?? { inline_keyboard: [] });
        sessionManager.updateSession(userId, chatId, { messageId: session.messageId });
        return session.messageId;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (detail.toLowerCase().includes("message is not modified")) return session.messageId;
        await editMessageReplyMarkup(chatId, session.messageId, { inline_keyboard: [] }).catch(() => {});
      }
    }
    const message = await sendMessage(text, { chatId, ...(replyMarkup ? { replyMarkup } : {}) });
    sessionManager.updateSession(userId, chatId, { messageId: message.message_id });
    return message.message_id;
  }

  return {
    sendMessage,
    editMessageText,
    editMessageReplyMarkup,
    answerCallbackQuery,
    sendPhoto,
    sendDocument,
    editOrSendSessionMessage,
  };
}
