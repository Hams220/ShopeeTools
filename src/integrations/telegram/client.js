import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { loadSession, saveSession } from "./session.js";
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in .env before running this command.`);
  return value;
}
async function connectTelegram(prompt) {
  const apiId = Number(required("TELEGRAM_API_ID"));
  if (!Number.isInteger(apiId) || apiId <= 0) throw new Error("TELEGRAM_API_ID must be a positive integer.");
  const apiHash = required("TELEGRAM_API_HASH");
  const client = new TelegramClient(new StringSession(await loadSession()), apiId, apiHash, { connectionRetries: 5 });
  let loginErrorReported = false;
  await client.start({
    phoneNumber: () => prompt.question("Telegram phone number: "),
    phoneCode: () => prompt.question("Telegram login code: "),
    password: () => prompt.question("Telegram 2FA password (if enabled): "),
    onError: () => {
      if (loginErrorReported) return;
      loginErrorReported = true;
      console.error("Telegram login failed; details omitted.");
    }
  });
  await saveSession(client.session.save());
  return client;
}
export {
  connectTelegram
};
