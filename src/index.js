import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { connectTelegram } from "./integrations/telegram/client.js";
import { startTelegramBot } from "./integrations/telegram/bot.js";
import { createApp } from "./core/app.js";

function requiredEnv(names, label) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Konfigurasi ${label} wajib diisi di .env (${names.join(" atau ")}).`);
}

async function main() {
  const botToken = requiredEnv(["TELEGRAM_BOT_TOKEN", "TELEGRAM_TOKEN_BOT"], "bot Telegram");
  const ownerId = requiredEnv(["TELEGRAM_OWNER_ID", "TELEGRAM_USER_ID"], "Telegram owner");
  const prompt = createInterface({ input: stdin, output: stdout });
  let client;

  try {
    // Prompt terminal hanya dipakai untuk login MTProto pertama kali; semua command dijalankan dari bot.
    client = await connectTelegram(prompt);
    const app = await createApp();
    await startTelegramBot({ app, client, token: botToken, ownerId });
  } finally {
    prompt.close();
    if (client) await client.disconnect().catch(() => void 0);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Gagal menjalankan aplikasi.");
  process.exitCode = 1;
});
