import "dotenv/config";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Api } from "teleproto";
import { chromium } from "playwright";
import XLSX from "xlsx";

const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
const BLACKHOLE_PATH = path.join(DATA_DIR, "wddrama-blackhole.json");
const DEFAULT_MINIAPP_LINK = "https://t.me/Shopee8DevsBot/checkout";

function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function parseMiniAppLink(link) {
  const url = new URL(link);
  if (!["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) {
    throw new Error("TELEGRAM_MINIAPP_LINK harus berupa link t.me/<bot>/<short_name>.");
  }
  const [botUsername, shortName] = url.pathname.split("/").filter(Boolean);
  if (!botUsername || !shortName) throw new Error("Link Mini App tidak lengkap.");
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

function assertSuccess(action, result) {
  const payload = asRecord(result.payload);
  if (result.httpStatus < 200 || result.httpStatus >= 300 || payload.status !== "success") {
    throw new Error(`${action} gagal | HTTP ${result.httpStatus} | ${payload.message ?? payload.status ?? "status tidak diketahui"}`);
  }
  return payload;
}

function normalizeUsername(username) {
  return String(username ?? "").trim().replace(/^@/, "").toLowerCase();
}

async function loadBlackholeUsernames() {
  const raw = await readFile(BLACKHOLE_PATH, "utf8");
  const usernames = JSON.parse(raw);
  if (!Array.isArray(usernames) || usernames.some((username) => typeof username !== "string")) {
    throw new Error("Format data/wddrama-blackhole.json harus berupa array username.");
  }
  return new Set(usernames.map(normalizeUsername).filter(Boolean));
}

async function addToBlackhole(username, blackholeUsernames) {
  const normalized = normalizeUsername(username);
  if (!normalized || blackholeUsernames.has(normalized)) return false;

  // Add to memory first so a duplicate row later in this batch is also skipped.
  blackholeUsernames.add(normalized);
  const temporaryPath = `${BLACKHOLE_PATH}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify([...blackholeUsernames], null, 2)}\n`, "utf8");
    await rename(temporaryPath, BLACKHOLE_PATH);
  } catch (error) {
    throw new Error(`Username ${username} diblokir untuk batch ini, tetapi daftar blackhole gagal disimpan: ${error instanceof Error ? error.message : String(error)}`);
  }
  return true;
}

async function withdrawDrama(page, account, blackholeUsernames) {
  const username = String(account.accountUsername ?? "").trim();
  if (!username) throw new Error("Username akun diperlukan untuk request fetch_coin_missions.");
  if (blackholeUsernames.has(normalizeUsername(username))) {
    console.log(`[WD DRAMA] ${username} | Diblokir: masuk daftar blackhole`);
    return { skipped: true, blackhole: true };
  }

  const missionResult = await callApi(page, "fetch_coin_missions", account.cookie, {
    fingerprint: account.fingerprint ?? "",
    account_username: username,
  });
  const missions = assertSuccess("fetch_coin_missions", missionResult);
  const coins = missions.current_coins ?? missions.coins ?? "-";
  const drama = asRecord(missions.drama);
  const canWithdrawToday = drama.can_withdrawal_today ?? missions.can_withdrawal_today;

  if (canWithdrawToday === false) {
    const withdrawalBalance = drama.withdrawal_balance ?? missions.withdrawal_balance ?? "-";
    return { skipped: true, username, coins, withdrawalBalance, message: "Penarikan tidak tersedia hari ini; dilewati" };
  }
  if (canWithdrawToday !== true) {
    throw new Error("fetch_coin_missions tidak mengembalikan can_withdrawal_today yang valid.");
  }

  const options = drama.withdrawal_options ?? missions.withdrawal_options;
  const withdrawalBalance = Number(drama.withdrawal_balance ?? missions.withdrawal_balance);
  if (!Number.isFinite(withdrawalBalance) || withdrawalBalance < 0) {
    throw new Error("fetch_coin_missions tidak mengembalikan withdrawal_balance yang valid.");
  }
  const amounts = Array.isArray(options)
    ? options.map((option) => {
        if (typeof option === "number" || typeof option === "string") return Number(option);
        const record = asRecord(option);
        return Number(record.amount ?? record.value ?? record.coins ?? record.withdrawal_amount);
      }).filter((amount) => Number.isFinite(amount) && amount > 0 && amount <= withdrawalBalance)
    : [];
  if (amounts.length === 0) {
    let blackholeAdded = false;
    let blackholeSaveError = "";
    try {
      blackholeAdded = await addToBlackhole(username, blackholeUsernames);
    } catch (error) {
      blackholeAdded = true;
      blackholeSaveError = error instanceof Error ? error.message : String(error);
    }
    if (blackholeSaveError) console.error(`[WD DRAMA] ${blackholeSaveError}`);
    return { skipped: true, blackholeAdded, username, coins, withdrawalBalance, message: `Tidak ada opsi penarikan yang memenuhi saldo; dilewati${blackholeAdded ? " | ditambahkan ke blackhole" : ""}${blackholeSaveError ? " (gagal menyimpan file)" : ""}` };
  }
  const amount = Math.max(...amounts);

  const withdrawalResult = await callApi(page, "withdraw_drama_coins", account.cookie, {
    amount: String(amount),
    fingerprint: account.fingerprint ?? "",
    account_username: username,
  });
  const withdrawalPayload = asRecord(withdrawalResult.payload);
  const message = String(withdrawalPayload.message ?? withdrawalPayload.status ?? "Tidak ada pesan");
  assertSuccess("withdraw_drama_coins", withdrawalResult);
  const withdrawnAmountValue = Number(withdrawalPayload.withdrawn_amount);
  const withdrawnAmount = Number.isFinite(withdrawnAmountValue) && withdrawnAmountValue >= 0
    ? withdrawnAmountValue
    : amount;
  const remainingBalance = withdrawalBalance - withdrawnAmount;
  let blackholeAdded = false;
  let blackholeSaveError = "";
  if (remainingBalance < 1000) {
    try {
      blackholeAdded = await addToBlackhole(username, blackholeUsernames);
    } catch (error) {
      blackholeAdded = true;
      blackholeSaveError = error instanceof Error ? error.message : String(error);
    }
  }
  if (blackholeSaveError) console.error(`[WD DRAMA] ${blackholeSaveError}`);
  return { skipped: false, amount: withdrawnAmount, username, coins, withdrawalBalance, message: `${message}${blackholeAdded ? " | ditambahkan ke blackhole" : ""}${blackholeSaveError ? " (gagal menyimpan file)" : ""}` };
}

function createWithdrawalReport(records, totalWithdrawn) {
  const lines = [
    "REKAP WITHDRAW DRAMA",
    `Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
    `Total akun: ${records.length}`,
    `Total penarikan: ${totalWithdrawn.toLocaleString("id-ID")} koin`,
    "",
    "Username | Koin | Withdrawal balance | Ditarik | Status",
    "-".repeat(100),
  ];
  for (const record of records) {
    lines.push(`${record.username} | ${record.coins ?? "-"} | ${record.withdrawalBalance ?? "-"} | ${(record.amount ?? 0).toLocaleString("id-ID")} | ${record.message}`);
  }
  return `${lines.join("\n")}\n`;
}

async function sendWithdrawalReport(ctx, records, rangeLabel) {
  const totalWithdrawn = records.reduce((total, record) => total + (Number(record.amount) || 0), 0);
  const fileName = `wddrama-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  const report = createWithdrawalReport(records, totalWithdrawn);
  if (ctx.sendDocument) {
    await ctx.sendDocument(Buffer.from(report, "utf8"), fileName, `Total penarikan: ${totalWithdrawn.toLocaleString("id-ID")} koin`);
  }
  console.log(`[WD DRAMA] Rekap ${rangeLabel} | total penarikan ${totalWithdrawn} koin | ${records.length} akun`);
}

function normalizeHeader(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers, names) {
  const accepted = new Set(names.map(normalizeHeader));
  return headers.findIndex((header) => accepted.has(normalizeHeader(header)));
}

function hasPhoneNumber(value) {
  const phone = String(value ?? "").trim();
  if (!phone || ["-", "0", "null", "undefined", "n/a", "na"].includes(phone.toLowerCase())) {
    return false;
  }
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /[1-9]/.test(digits);
}

async function loadAccounts(startRow, endRow, blackholeUsernames) {
  const files = (await readdir(DATA_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.xlsx?$/i.test(entry.name) && !entry.name.startsWith("~$"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) throw new Error("Tidak ada file Excel (.xlsx/.xls) di folder data.");
  const fileName = files.find((name) => normalizeHeader(name) === "accountxlsx") ?? files[0];
  const workbook = XLSX.readFile(path.join(DATA_DIR, fileName), { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`File ${fileName} tidak memiliki sheet.`);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });
  const headers = rows[0] ?? [];
  const usernameColumn = findColumn(headers, ["Username", "Account Username", "User"]);
  const phoneColumn = findColumn(headers, ["Nomor HP", "Nomor HP Shopee", "No HP", "No Hp Shopee", "Nomor Telepon", "Nomor Handphone", "Nomor", "Phone", "Phone Number", "Phone Number Shopee", "Mobile"]);
  const cookieColumn = findColumn(headers, ["Cookie", "Cookies", "Shopee Cookie"]);
  const fingerprintColumn = findColumn(headers, ["Fingerprint", "Device Fingerprint"]);
  if (cookieColumn < 0) throw new Error(`Kolom Cookie tidak ditemukan pada ${fileName}.`);
  if (usernameColumn < 0) throw new Error(`Kolom Username tidak ditemukan pada ${fileName}.`);

  const accounts = [];
  const skipped = { emptyRow: 0, missingNumber: 0, missingCookie: 0, missingUsername: 0, blackhole: 0 };
  for (let excelRow = startRow; excelRow <= endRow; excelRow++) {
    const row = rows[excelRow - 1] ?? [];
    if (!row.some((cell) => String(cell ?? "").trim())) {
      skipped.emptyRow++;
      continue;
    }
    const accountUsername = String(row[usernameColumn] ?? "").trim();
    if (!accountUsername) {
      skipped.missingUsername++;
      continue;
    }
    if (blackholeUsernames.has(normalizeUsername(accountUsername))) {
      skipped.blackhole++;
      continue;
    }
    const phone = String(row[phoneColumn] ?? "").trim();
    if (!hasPhoneNumber(phone)) {
      skipped.missingNumber++;
    }
    const cookie = String(row[cookieColumn] ?? "").trim();
    if (!cookie) {
      skipped.missingCookie++;
      continue;
    }
    accounts.push({
      excelRow,
      cookie,
      phone,
      accountUsername,
      fingerprint: String(row[fingerprintColumn] ?? "").trim(),
    });
  }
  return { fileName, sheetName, accounts, skipped };
}

function parseRange(input) {
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

const wdDramaService = {
  name: "wdDrama",
  commands: ["/wdDrama"],

  async execute(ctx) {
    let blackholeUsernames;
    try {
      blackholeUsernames = await loadBlackholeUsernames();
    } catch (error) {
      ctx.logger.error(`Gagal membaca daftar blackhole: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    const method = (await ctx.prompt.question("Pilih metode : 1 cookie, 2 Excel\n> ")).trim().toLowerCase();
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
        ctx.logger.warn(`${accountUsername} ada di daftar blackhole; request dibatalkan.`);
        return;
      }
      await runWithBrowser(ctx, async (page) => {
        await ctx.prompt.update("Mencoba withdraw saldo drama...");
        const records = [];
        try {
          records.push(await withdrawDrama(page, { cookie, accountUsername }, blackholeUsernames));
        } catch (error) {
          records.push({ username: accountUsername, message: error instanceof Error ? error.message : String(error) });
        }
        await ctx.prompt.update("WD drama untuk akun cookie selesai.");
        await sendWithdrawalReport(ctx, records, "cookie");
      });
      return;
    }
    if (!["2", "excel", "e"].includes(method)) {
      ctx.logger.warn("Metode tidak valid. Pilih 1 (cookie) atau 2 (Excel).");
      return;
    }

    let range;
    try {
      range = parseRange(await ctx.prompt.question("Masukkan rentang baris Excel (contoh 2-100)\n> "));
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return;
    }
    let loaded;
    try {
      loaded = await loadAccounts(range.start, range.end, blackholeUsernames);
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return;
    }

    console.log(`[WD DRAMA] Antrean: ${loaded.accounts.length} | Blackhole: ${loaded.skipped.blackhole}`);
    if (loaded.accounts.length === 0) {
      ctx.logger.warn("Tidak ada akun valid pada rentang tersebut.");
      return;
    }

    await runWithBrowser(ctx, async (page) => {
      let withdrawn = 0;
      let skipped = 0;
      let failed = 0;
      let blackholed = 0;
      const records = [];
      await ctx.prompt.update("Mencoba withdraw saldo drama...");
      for (const account of loaded.accounts) {
        if (blackholeUsernames.has(normalizeUsername(account.accountUsername))) {
          skipped++;
          records.push({ username: account.accountUsername, message: "Blackhole; dilewati" });
          continue;
        }
        try {
          const result = await withdrawDrama(page, account, blackholeUsernames);
          records.push(result);
          if (result.skipped) {
            skipped++;
            if (result.blackholeAdded) blackholed++;
          }
          else {
            withdrawn++;
            if (result.blackholeAdded) blackholed++;
          }
        } catch (error) {
          failed++;
          const message = error instanceof Error ? error.message : String(error);
          records.push({ username: account.accountUsername, message: `Gagal (baris ${account.excelRow}): ${message}` });
        }
      }
      console.log(`[WD DRAMA] Batch selesai | ditarik ${withdrawn} | dilewati ${skipped} | gagal ${failed} | blackhole baru ${blackholed}`);
      await ctx.prompt.update(`WD drama rentang ${range.start}-${range.end} selesai.`);
      await sendWithdrawalReport(ctx, records, `rentang ${range.start}-${range.end}`);
    });
  },
};

export default wdDramaService;
