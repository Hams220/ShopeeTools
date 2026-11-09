import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Api } from "teleproto";
import { chromium } from "playwright";
import XLSX from "xlsx";

const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
const BLACKHOLE_PATH = path.join(DATA_DIR, "startdrama-blackhole.json");
const DEFAULT_MINIAPP_LINK = "https://t.me/Shopee8DevsBot/checkout";

function normalizeUsername(value) {
  return String(value ?? "").trim().replace(/^@/, "").toLowerCase();
}

async function loadStartDramaBlackhole() {
  const parsed = JSON.parse(await readFile(BLACKHOLE_PATH, "utf8"));
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    throw new Error("Format data/startdrama-blackhole.json harus berupa array username.");
  }
  return new Set(parsed.map(normalizeUsername).filter(Boolean));
}

function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
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
  if (!botUsername || !shortName) {
    throw new Error("Link Mini App harus memuat username bot dan short name.");
  }
  return {
    botUsername: botUsername.replace(/^@/, ""),
    shortName,
    startParam: url.searchParams.get("startapp") ?? undefined,
  };
}

async function launchMiniApp(client) {
  const appLink = process.env.TELEGRAM_MINIAPP_LINK?.trim() || DEFAULT_MINIAPP_LINK;
  const { botUsername, shortName, startParam } = parseMiniAppLink(appLink);
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
    app: new Api.InputBotAppID({
      id: appInfo.app.id,
      accessHash: appInfo.app.accessHash,
    }),
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

async function callApi(page, action, cookie, fields = {}) {
  return page.evaluate(
    async ({ actionName, cookieValue, extraFields }) => {
      const appWindow = window;
      const initData = appWindow.Telegram?.WebApp?.initData ?? "";
      if (!initData) throw new Error("Telegram WebApp initData tidak tersedia.");
      if (typeof appWindow.getSecureHeaders !== "function") {
        throw new Error("getSecureHeaders tidak tersedia di Mini App.");
      }

      const body = new URLSearchParams({
        initData,
        action: actionName,
        cookie_val: cookieValue,
        ...extraFields,
      });
      const response = await fetch("api.php", {
        method: "POST",
        headers: appWindow.getSecureHeaders(actionName),
        body: body.toString(),
      });
      const raw = await response.text();
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
      return { httpStatus: response.status, payload };
    },
    { actionName: action, cookieValue: cookie, extraFields: fields },
  );
}

async function requestDrama(page, { cookie, accountUsername, fingerprint = "", phone = "", wallet = "" }) {
  const username = String(accountUsername ?? "").trim();
  if (!username) throw new Error("Username akun diperlukan untuk request fetch_coin_missions.");
  const missions = await callApi(page, "fetch_coin_missions", cookie, {
    fingerprint,
    account_username: username,
  });
  const missionsPayload = asRecord(missions.payload);
  if (missions.httpStatus < 200 || missions.httpStatus >= 300 || missionsPayload.status !== "success") {
    throw new Error(`Pengambilan data drama gagal | HTTP ${missions.httpStatus} | ${missionsPayload.message ?? missionsPayload.status ?? "status tidak diketahui"}`);
  }
  const drama = asRecord(missionsPayload.drama);
  console.log(`\n[AKUN] Username: ${username}`);
  console.log(`[AKUN] Coins: ${missionsPayload.current_coins ?? missionsPayload.coins ?? "-"}`);
  console.log(`[AKUN] Wallet: ${wallet || "-"}`);
  console.log(`[AKUN] Phone number: ${phone || "-"}`);
  console.log(`[AKUN] Drama balance: ${drama.drama_balance ?? missionsPayload.drama_balance ?? "-"}`);

  const worker = await callApi(page, "start_drama_worker", cookie, {
    account_username: username,
    target_minutes: "150",
    auto_withdraw: "1",
    fingerprint,
  });
  const workerPayload = asRecord(worker.payload);
  console.log(`[WORKER DRAMA] HTTP ${worker.httpStatus} | status: ${workerPayload.status ?? "-"} | ${workerPayload.message ?? ""}`);
  if (worker.httpStatus < 200 || worker.httpStatus >= 300 || workerPayload.status !== "success") {
    throw new Error(`Request worker drama gagal | HTTP ${worker.httpStatus} | ${workerPayload.message ?? workerPayload.status ?? "status tidak diketahui"}`);
  }
  return workerPayload;
}

function normalizeHeader(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers, names) {
  const accepted = new Set(names.map(normalizeHeader));
  return headers.findIndex((header) => accepted.has(normalizeHeader(header)));
}

function getCell(row, column) {
  return column < 0 ? "" : String(row[column] ?? "").trim();
}

function hasPhoneNumber(value) {
  const phone = String(value ?? "").trim();
  if (!phone || ["-", "0", "null", "undefined", "n/a", "na"].includes(phone.toLowerCase())) {
    return false;
  }
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /[1-9]/.test(digits);
}

async function readExcelAccounts(startRow, endRow, blackholeUsernames) {
  const files = (await readdir(DATA_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.xlsx?$/i.test(entry.name) && !entry.name.startsWith("~$"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) throw new Error("Tidak ada file Excel (.xlsx/.xls) di folder data.");

  const preferredFile = files.find((name) => normalizeHeader(name) === "accountxlsx") ?? files[0];
  const filePath = path.join(DATA_DIR, preferredFile);
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`File ${preferredFile} tidak memiliki sheet.`);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });
  const headers = rows[0] ?? [];
  const usernameColumn = findColumn(headers, ["Username", "Account Username", "User"]);
  const cookieColumn = findColumn(headers, ["Cookie", "Cookies", "Shopee Cookie"]);
  const phoneColumn = findColumn(headers, ["Nomor HP", "Nomor HP Shopee", "No HP", "No Hp Shopee", "Nomor Telepon", "Nomor Handphone", "Nomor", "Phone", "Phone Number", "Phone Number Shopee", "Mobile"]);
  const walletColumn = findColumn(headers, ["Saldo ShopeePay", "Wallet", "ShopeePay Balance"]);
  const fingerprintColumn = findColumn(headers, ["Fingerprint", "Device Fingerprint"]);
  if (cookieColumn < 0) throw new Error(`Kolom Cookie tidak ditemukan pada ${preferredFile}.`);
  if (usernameColumn < 0) throw new Error(`Kolom Username tidak ditemukan pada ${preferredFile}.`);

  const accounts = [];
  const skipped = { emptyRow: 0, missingNumber: 0, missingUsername: 0, missingCookie: 0, blackhole: 0 };
  for (let excelRow = startRow; excelRow <= endRow; excelRow++) {
    const row = rows[excelRow - 1] ?? [];
    if (!row.some((cell) => String(cell ?? "").trim())) {
      skipped.emptyRow++;
      continue;
    }
    const accountUsername = getCell(row, usernameColumn);
    if (!accountUsername) {
      skipped.missingUsername++;
      continue;
    }
    if (blackholeUsernames.has(normalizeUsername(accountUsername))) {
      skipped.blackhole++;
      continue;
    }
    const phone = getCell(row, phoneColumn);
    if (!hasPhoneNumber(phone)) {
      skipped.missingNumber++;
    }
    const cookie = getCell(row, cookieColumn);
    if (!cookie) {
      skipped.missingCookie++;
      continue;
    }
    accounts.push({
      excelRow,
      phone,
      cookie,
      wallet: getCell(row, walletColumn),
      accountUsername,
      fingerprint: getCell(row, fingerprintColumn),
    });
  }

  return { filePath, sheetName, accounts, skipped };
}

function parseRowRange(input) {
  const match = input.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) throw new Error("Format rentang tidak valid. Gunakan contoh 2-100.");
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 2 || end < start) {
    throw new Error("Rentang harus dimulai dari baris 2 atau lebih dan angka akhir harus >= angka awal.");
  }
  return { start, end };
}

async function runWithBrowser(ctx, worker) {
  let browser;
  try {
    const launched = await launchMiniApp(ctx.client);
    browser = launched.browser;
    await worker(launched.page);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

const startDramaService = {
  name: "startDrama",
  commands: ["/startDrama"],

  async execute(ctx) {
    let blackholeUsernames;
    try {
      blackholeUsernames = await loadStartDramaBlackhole();
    } catch (error) {
      ctx.logger.error(`Gagal membaca daftar startDrama blackhole: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    const method = (await ctx.prompt.question(
      "Silahkan pilih metode : 1. cookie, 2. excel\n> ",
    )).trim().toLowerCase();

    if (["1", "cookie", "c"].includes(method)) {
      const cookie = (await ctx.prompt.question("Masukan cookie\n> ")).trim();
      if (!cookie) {
        ctx.logger.warn("Cookie kosong, proses dibatalkan.");
        return;
      }
      const accountUsername = (await ctx.prompt.question("Masukan username akun\n> ")).trim();
      if (!accountUsername) {
        ctx.logger.warn("Username kosong, proses dibatalkan.");
        return;
      }
      if (blackholeUsernames.has(normalizeUsername(accountUsername))) {
        ctx.logger.warn(`${accountUsername} ada di daftar startDrama blackhole; request dibatalkan.`);
        return;
      }
      await runWithBrowser(ctx, async (page) => {
        try {
          await requestDrama(page, { cookie, accountUsername });
        } catch (error) {
          ctx.logger.error(error instanceof Error ? error.message : String(error));
        }
      });
      return;
    }

    if (!["2", "excel", "e"].includes(method)) {
      ctx.logger.warn("Metode tidak valid. Pilih 1 (cookie) atau 2 (excel).");
      return;
    }

    let range;
    try {
      range = parseRowRange(await ctx.prompt.question("Masukkan rentang baris Excel (contoh 2-100)\n> "));
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return;
    }

    let loaded;
    try {
      loaded = await readExcelAccounts(range.start, range.end, blackholeUsernames);
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return;
    }

    console.log(`[START DRAMA] File: ${loaded.filePath} | Sheet: ${loaded.sheetName}`);
    console.log(`[START DRAMA] Rentang ${range.start}-${range.end} | antrean ${loaded.accounts.length} | blackhole ${loaded.skipped.blackhole} | tanpa nomor HP (tetap diproses) ${loaded.skipped.missingNumber} | skip username kosong ${loaded.skipped.missingUsername} | skip cookie kosong ${loaded.skipped.missingCookie} | baris kosong ${loaded.skipped.emptyRow}`);
    if (loaded.accounts.length === 0) {
      ctx.logger.warn("Tidak ada akun valid pada rentang tersebut.");
      return;
    }

    await runWithBrowser(ctx, async (page) => {
      let succeeded = 0;
      let failed = 0;
      for (const [index, account] of loaded.accounts.entries()) {
        console.log(`\n[START DRAMA] ${index + 1}/${loaded.accounts.length} | baris Excel ${account.excelRow}`);
        try {
          await requestDrama(page, account);
          succeeded++;
          console.log(`[START DRAMA] Baris ${account.excelRow} selesai.`);
        } catch (error) {
          failed++;
          console.error(`[START DRAMA] Baris ${account.excelRow} gagal: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      console.log(`\n[START DRAMA] Batch selesai | berhasil ${succeeded} | gagal ${failed} | dilewati ${loaded.skipped.emptyRow + loaded.skipped.missingUsername + loaded.skipped.missingCookie + loaded.skipped.blackhole}`);
    });
  },
};

export default startDramaService;
