export function createCallbackHandler({ ownerId, configEditor, promptManager, answerCallbackQuery, isBusy, logError }) {
  const owner = String(ownerId);

  return async function handleCallbackQuery(query) {
    const fromOwner = query?.from && String(query.from.id) === owner;
    const privateOwnerChat = query?.message?.chat?.type === "private" &&
      String(query.message.chat.id) === owner;
    if (!fromOwner || !privateOwnerChat) {
      await answerCallbackQuery(query.id, "Akses ditolak.", true).catch(logError);
      return;
    }
    const handled = await configEditor.handleCallback(query, isBusy());
    if (handled) return;
    if (await promptManager.handleCallback(query)) return;
    await answerCallbackQuery(query.id).catch(logError);
  };
}
