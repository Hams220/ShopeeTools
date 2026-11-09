function makeKey(userId, chatId) {
  return `${String(userId)}:${String(chatId)}`;
}

export function createSessionManager() {
  const sessions = new Map();

  function getSession(userId, chatId) {
    return sessions.get(makeKey(userId, chatId));
  }

  function createSession({ userId, chatId, state = "IDLE", data = {}, messageId = null }) {
    const now = Date.now();
    const session = {
      userId: String(userId),
      chatId: String(chatId),
      state,
      data,
      messageId,
      createdAt: now,
      updatedAt: now,
    };
    sessions.set(makeKey(userId, chatId), session);
    return session;
  }

  function updateSession(userId, chatId, changes = {}) {
    const session = getSession(userId, chatId) ?? createSession({ userId, chatId });
    if (Object.hasOwn(changes, "data")) session.data = changes.data ?? {};
    if (Object.hasOwn(changes, "state")) session.state = changes.state;
    if (Object.hasOwn(changes, "messageId")) session.messageId = changes.messageId;
    session.updatedAt = Date.now();
    return session;
  }

  function clearSession(userId, chatId) {
    return sessions.delete(makeKey(userId, chatId));
  }

  function getUserState(userId, chatId) {
    return getSession(userId, chatId)?.state ?? null;
  }

  function setUserState(userId, chatId, state, data) {
    return updateSession(userId, chatId, {
      state,
      ...(data === undefined ? {} : { data }),
    });
  }

  return { getSession, createSession, updateSession, clearSession, getUserState, setUserState };
}
