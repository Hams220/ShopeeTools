import "dotenv/config";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Api } from "teleproto";
import { chromium } from "playwright";

const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
const OUTPUT_PATH = path.join(DATA_DIR, "drama_task.json");
const BLACKHOLE_PATH = path.join(DATA_DIR, "startdrama-blackhole.json");
const DEFAULT_MINIAPP_LINK = "https://t.me/Shopee8DevsBot/checkout";

function normalizeUsername(value) {
  return String(value ?? "").trim().replace(/^@/, "").toLowerCase();
}

async function loadBlackhole() {
  try {
    const parsed = JSON.parse(await readFile(BLACKHOLE_PATH, "utf8"));
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
      throw new Error("Format startdrama-blackhole.json harus berupa array username.");
    }
    return new Set(parsed.map(normalizeUsername).filter(Boolean));
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
}

async function addFailedTaskUsernames(tasks) {
  const blackhole = await loadBlackhole();
  const before = blackhole.size;
  for (const task of tasks) {
    const status = String(task?.status ?? "").trim().toLowerCase();
    if (!["gagal", "failed", "failure", "error"].includes(status)) continue;
    const username = normalizeUsername(task?.username);
    if (username) blackhole.add(username);
  }
  const added = blackhole.size - before;
  if (added > 0) {
    const temporaryPath = `${BLACKHOLE_PATH}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify([...blackhole], null, 2)}\n`, "utf8");
    await rename(temporaryPath, BLACKHOLE_PATH);
  }
  return { added, total: blackhole.size };
}

function parseMiniAppLink(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new Error("TELEGRAM_MINIAPP_LINK bukan URL yang valid.");
  }
  if (!["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) {
    throw new Error("TELEGRAM_MINIAPP_LINK harus berupa link t.me/<bot>/<short_name>.");
  }
  const [botUsername, shortName] = url.pathname.split("/").filter(Boolean);
  if (!botUsername || !shortName) throw new Error("Link Mini App harus memuat username bot dan short name.");
  return {
    botUsername: botUsername.replace(/^@/, ""),
    shortName,
    startParam: url.searchParams.get("startapp") ?? undefined,
  };
}

async function launchMiniApp(client) {
  const link = process.env.TELEGRAM_MINIAPP_LINK?.trim() || DEFAULT_MINIAPP_LINK;
  const { botUsername, shortName, startParam } = parseMiniAppLink(link);
  const bot = await client.getEntity(botUsername);
  if (!(bot instanceof Api.User) || bot.accessHash === undefined) {
    throw new Error("Telegram tidak berhasil menemukan bot Mini App.");
  }
  const botUser = new Api.InputUser({ userId: bot.id, accessHash: bot.accessHash });
  const botPeer = new Api.InputPeerUser({ userId: bot.id, accessHash: bot.accessHash });
  const appInfo = await client.api.messages.getBotApp({
    app: new Api.InputBotAppShortName({ botId: botUser, shortName }),
    hash: 0,
  });
  if (!(appInfo instanceof Api.messages.BotApp) || !(appInfo.app instanceof Api.BotApp)) {
    throw new Error("Metadata Mini App tidak ditemukan.");
  }
  const webView = await client.api.messages.requestAppWebView({
    peer: botPeer,
    app: new Api.InputBotAppID({ id: appInfo.app.id, accessHash: appInfo.app.accessHash }),
    startParam,
    platform: "web",
  });
  if (!("url" in webView) || typeof webView.url !== "string") {
    throw new Error("Telegram tidak memberikan URL Mini App.");
  }

  const channel = process.env.PLAYWRIGHT_CHANNEL?.trim();
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();
  const browser = await chromium.launch({
    headless: true,
    ...(channel ? { channel } : {}),
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    const page = await browser.newPage();
    await page.goto(webView.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => Boolean(window.Telegram?.WebApp?.initData && typeof window.getSecureHeaders === "function"),
      null,
      { timeout: 30_000 },
    );
    return { browser, page };
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
}

async function fetchDramaTasks(page) {
  return page.evaluate(async () => {
    const appWindow = window;
    const action = "get_worker_tasks";
    const initData = appWindow.Telegram?.WebApp?.initData ?? "";
    if (!initData) throw new Error("Telegram WebApp initData tidak tersedia.");
    if (typeof appWindow.getSecureHeaders !== "function") {
      throw new Error("getSecureHeaders tidak tersedia di Mini App.");
    }

    const body = new URLSearchParams({ initData, action });
    const response = await fetch("api.php", {
      method: "POST",
      headers: appWindow.getSecureHeaders(action),
      body: body.toString(),
    });
    const raw = await response.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw || "Respons API bukan JSON." };
    }
    return { httpStatus: response.status, payload };
  });
}

const getDramaTaskService = {
  name: "getDramaTask",
  commands: ["/getDramaTask"],

  async execute(ctx) {
    let browser;
    try {
      const launched = await launchMiniApp(ctx.client);
      browser = launched.browser;
      const result = await fetchDramaTasks(launched.page);

      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(OUTPUT_PATH, `${JSON.stringify(result.payload, null, 2)}\n`, "utf8");

      const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
      const taskCount = Array.isArray(payload.drama_tasks) ? payload.drama_tasks.length : 0;
      console.log(`[GET DRAMA TASK] HTTP ${result.httpStatus} | status ${payload.status ?? "-"}`);
      console.log(`[GET DRAMA TASK] Drama task tersimpan: ${taskCount} | ${OUTPUT_PATH}`);
      if (result.httpStatus < 200 || result.httpStatus >= 300 || payload.status !== "success") {
        ctx.logger.error(payload.message ?? "Request get_worker_tasks gagal.");
      } else {
        const blacklistResult = await addFailedTaskUsernames(Array.isArray(payload.drama_tasks) ? payload.drama_tasks : []);
        console.log(`[GET DRAMA TASK] Username task gagal ditambahkan ke startdrama-blackhole.json: ${blacklistResult.added} | total ${blacklistResult.total}`);
      }
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  },
};

export default getDramaTaskService;
