import "dotenv/config";
import { Api } from "teleproto";
import { chromium } from "playwright";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sendNotif } from "../helper/notify.js";
import path from "node:path";
class GetOrderError extends Error {
  constructor(message) {
    super(message);
    this.name = "GetOrderError";
  }
}
const DEFAULT_MINIAPP_LINK = "https://t.me/Shopee8DevsBot/checkout";
const API_ACTION = "fetch_digital_order_detail";
const API_HOST = normalizeHost(
  process.env.API_HOST || "miniapp.bot-devs.com"
);
const LIST_ORDER_PATHS = [
  fileURLToPath(new URL("../../data/listOrder.json", import.meta.url)),
  fileURLToPath(new URL("../../data/listorder.json", import.meta.url))
];
const CODES_PATH = fileURLToPath(
  new URL("../../data/codes.json", import.meta.url)
);
function normalizeHost(value) {
  const input = value.trim();
  try {
    return new URL(input.includes("://") ? input : `https://${input}`).hostname.toLowerCase();
  } catch {
    throw new GetOrderError(`API_HOST tidak valid: ${value}`);
  }
}
function parseMiniAppLink(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new GetOrderError("TELEGRAM_MINIAPP_LINK bukan URL yang valid.");
  }
  if (!["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) {
    throw new GetOrderError(
      "TELEGRAM_MINIAPP_LINK harus berupa link t.me/<bot>/<short_name>."
    );
  }
  const [botUsername, shortName] = url.pathname.split("/").filter(Boolean);
  if (!botUsername || !shortName) {
    throw new GetOrderError(
      "Link Mini App harus memuat username bot dan short name."
    );
  }
  return {
    botUsername: botUsername.replace(/^@/, ""),
    shortName,
    startParam: url.searchParams.get("startapp") ?? void 0
  };
}
function getRequestAction(request) {
  try {
    const url = new URL(request.url());
    const body = request.postData() || "";
    if (body) {
      try {
        const json = JSON.parse(body);
        if (typeof json.action === "string") return json.action;
      } catch {
        const form = new URLSearchParams(body);
        const action = form.get("action");
        if (action) return action;
      }
    }
    return url.searchParams.get("action");
  } catch {
    return null;
  }
}
function isApiAction(response, host, action) {
  try {
    const url = new URL(response.url());
    return url.hostname.toLowerCase() === host && getRequestAction(response.request()) === action;
  } catch {
    return false;
  }
}
function asRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function getOrderIdentity(value) {
  const row = asRecord(value);
  const data = asRecord(row.data);
  const username = String(
    row.username ?? data.username ?? ""
  ).trim();
  const orderId = String(
    row.order_id ?? data.order_id ?? ""
  ).trim();
  if (!username || !orderId) return null;
  return { username, orderId };
}
async function removeNotifiedOrders(usernames) {
  const notified = new Set(
    usernames.map((username) => username.trim().toLowerCase()).filter(Boolean)
  );
  if (notified.size === 0) return 0;
  for (const path2 of LIST_ORDER_PATHS) {
    let raw;
    try {
      raw = await readFile(path2, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new GetOrderError(`JSON tidak valid saat membersihkan: ${path2}`);
    }
    const root = asRecord(parsed);
    const isArrayRoot = Array.isArray(parsed);
    const rows = isArrayRoot ? parsed : Array.isArray(root.orders) ? root.orders : null;
    if (!rows) {
      throw new GetOrderError(
        `Format listOrder.json tidak dikenali saat membersihkan: ${path2}`
      );
    }
    const remaining = rows.filter((row) => {
      const data = asRecord(asRecord(row).data);
      const username = String(
        asRecord(row).username ?? data.username ?? ""
      ).trim().toLowerCase();
      return !notified.has(username);
    });
    const removedCount = rows.length - remaining.length;
    if (removedCount === 0) return 0;
    const updated = isArrayRoot ? remaining : { ...root, orders: remaining };
    const tempPath = `${path2}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(updated, null, 2)}\\n`, "utf8");
    await rename(tempPath, path2);
    console.log(
      `[GET ORDER] listOrder dibersihkan: ${removedCount} order dari ${notified.size} username yang notifikasinya terkirim.`
    );
    return removedCount;
  }
  throw new GetOrderError(
    "File listOrder.json tidak ditemukan saat proses pembersihan."
  );
}
async function readListOrder() {
  let raw;
  let selectedPath = "";
  for (const path2 of LIST_ORDER_PATHS) {
    try {
      raw = await readFile(path2, "utf8");
      selectedPath = path2;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  if (!raw) {
    throw new GetOrderError(
      `File listOrder.json tidak ditemukan. Letakkan di folder data/.`
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GetOrderError(`JSON tidak valid: ${selectedPath}`);
  }
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(asRecord(parsed).orders) ? asRecord(parsed).orders : [];
  if (rows.length === 0) {
    throw new GetOrderError("listOrder.json tidak memiliki data pesanan.");
  }
  const orders = rows.map(getOrderIdentity).filter((item) => item !== null);
  if (orders.length === 0) {
    throw new GetOrderError(
      "Tidak ditemukan pasangan username dan order_id yang valid."
    );
  }
  const unique = /* @__PURE__ */ new Map();
  for (const order of orders) {
    unique.set(`${order.username.toLowerCase()}:${order.orderId}`, order);
  }
  console.log(`[GET ORDER] File: ${selectedPath}`);
  console.log(`[GET ORDER] Pesanan valid: ${orders.length}`);
  console.log(`[GET ORDER] Pesanan unik: ${unique.size}`);
  return [...unique.values()];
}
function getCodeKey(code) {
  const uniqueId = String(code.unique_id ?? "").trim();
  if (uniqueId) return `unique:${uniqueId}`;
  const serial = String(code.serial ?? "").trim();
  if (serial) return `serial:${serial}`;
  const url = String(code.url ?? "").trim();
  if (url) return `url:${url}`;
  return `raw:${JSON.stringify(code)}`;
}
async function readExistingCodes() {
  try {
    const raw = await readFile(CODES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const codes = asRecord(parsed).codes;
    if (!Array.isArray(codes)) {
      throw new GetOrderError(
        "Format data/codes.json tidak valid. Properti 'codes' harus berupa array."
      );
    }
    return codes.filter(
      (item) => item !== null && typeof item === "object" && !Array.isArray(item)
    );
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
let saveCodesQueue = Promise.resolve();
async function saveCodes(codes) {
  const task = saveCodesQueue.then(async () => {
    await mkdir(path.dirname(CODES_PATH), {
      recursive: true
    });
    const temporaryPath = `${CODES_PATH}.${process.pid}.${Date.now()}.tmp`;
    const output = { codes };
    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(output, null, 2)}
`,
        "utf8"
      );
      let lastError;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await rename(temporaryPath, CODES_PATH);
          return;
        } catch (error) {
          lastError = error;
          const code = error.code;
          if (!["EPERM", "EACCES", "EBUSY"].includes(code ?? "")) {
            throw error;
          }
          if (attempt < 4) {
            await new Promise(
              (resolve) => setTimeout(resolve, 200 * (attempt + 1))
            );
          }
        }
      }
      throw lastError;
    } finally {
      await import("node:fs/promises").then(
        ({ unlink }) => unlink(temporaryPath).catch(() => {
        })
      );
    }
  });
  saveCodesQueue = task.catch(() => {
  });
  return task;
}
function mergeCodes(current, incoming) {
  const merged = /* @__PURE__ */ new Map();
  for (const code of [...current, ...incoming]) {
    merged.set(getCodeKey(code), code);
  }
  return [...merged.values()];
}
async function launchMiniApp(client, page) {
  const appLink = process.env.TELEGRAM_MINIAPP_LINK?.trim() || DEFAULT_MINIAPP_LINK;
  const { botUsername, shortName, startParam } = parseMiniAppLink(appLink);
  const bot = await client.getEntity(botUsername);
  if (!(bot instanceof Api.User) || bot.accessHash === void 0) {
    throw new GetOrderError(
      "Telegram tidak berhasil menemukan bot Mini App."
    );
  }
  const botUser = new Api.InputUser({
    userId: bot.id,
    accessHash: bot.accessHash
  });
  const botPeer = new Api.InputPeerUser({
    userId: bot.id,
    accessHash: bot.accessHash
  });
  const appInfo = await client.api.messages.getBotApp({
    app: new Api.InputBotAppShortName({
      botId: botUser,
      shortName
    }),
    hash: 0
  });
  if (!(appInfo instanceof Api.messages.BotApp) || !(appInfo.app instanceof Api.BotApp)) {
    throw new GetOrderError("Metadata Mini App tidak ditemukan.");
  }
  const webView = await client.api.messages.requestAppWebView({
    peer: botPeer,
    app: new Api.InputBotAppID({
      id: appInfo.app.id,
      accessHash: appInfo.app.accessHash
    }),
    startParam,
    platform: "web"
  });
  if (!("url" in webView) || typeof webView.url !== "string") {
    throw new GetOrderError("Telegram tidak memberikan URL Mini App.");
  }
  const detectedRequests = [];
  page.on("request", (request) => {
    try {
      const url = new URL(request.url());
      if (url.hostname.toLowerCase() !== API_HOST) return;
      const action = getRequestAction(request) || "(action tidak terbaca)";
      detectedRequests.push(`${request.method()} ${url.pathname} action=${action}`);
    } catch {
    }
  });
  page.on("pageerror", (error) => {
    console.error(`[GET ORDER] Browser error: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    console.warn(
      `[GET ORDER] Request gagal: ${request.method()} ${request.url()} - ${request.failure()?.errorText ?? "unknown"}`
    );
  });
  const loadUiPromise = page.waitForResponse(
    (response) => isApiAction(response, API_HOST, "load_ui"),
    { timeout: 45e3 }
  );
  try {
    const [, loadUiResponse] = await Promise.all([
      page.goto(webView.url, { waitUntil: "domcontentloaded" }),
      loadUiPromise
    ]);
    if (!loadUiResponse.ok()) {
      throw new GetOrderError(
        `load_ui gagal: HTTP ${loadUiResponse.status()}.`
      );
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new GetOrderError(
      `Mini App gagal diinisialisasi: ${detail}
Host yang diharapkan: ${API_HOST}
Request terdeteksi:
${detectedRequests.length ? detectedRequests.map((item) => `  - ${item}`).join("\n") : "  - Tidak ada request API yang terdeteksi."}`
    );
  }
  await page.waitForFunction(
    () => {
      const w = window;
      return Boolean(
        w.Telegram?.WebApp?.initData && typeof w.getSecureHeaders === "function"
      );
    },
    null,
    { timeout: 2e4 }
  );
}
async function fetchOrderBatch(page, orders) {
  return page.evaluate(
    async ({ apiUrl, action, batch }) => {
      const appWindow = window;
      const initData = appWindow.Telegram?.WebApp?.initData || "";
      const getSecureHeaders = appWindow.getSecureHeaders;
      if (!initData) {
        throw new Error("Telegram WebApp initData tidak tersedia.");
      }
      if (typeof getSecureHeaders !== "function") {
        throw new Error("getSecureHeaders tidak tersedia.");
      }
      return Promise.all(
        batch.map(async (order) => {
          try {
            const body = new URLSearchParams({
              initData,
              action,
              account_username: order.username,
              order_id: order.orderId,
              dp_platform: "shopee",
              spay_token: ""
            });
            const response = await fetch(apiUrl, {
              method: "POST",
              headers: getSecureHeaders(action),
              body: body.toString()
            });
            const raw = await response.text();
            let payload;
            try {
              payload = JSON.parse(raw);
            } catch {
              payload = raw;
            }
            return {
              username: order.username,
              orderId: order.orderId,
              httpStatus: response.status,
              payload
            };
          } catch (error) {
            return {
              username: order.username,
              orderId: order.orderId,
              httpStatus: 0,
              payload: null,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );
    },
    {
      apiUrl: `https://${API_HOST}/api.php`,
      action: API_ACTION,
      batch: orders
    }
  );
}
function extractItemName(payload) {
  const root = asRecord(payload);
  const responseData = asRecord(root.data);
  const detail = asRecord(responseData.data);
  const order = asRecord(detail.order);
  return String(order.item_name ?? "").trim() || "Produk tidak diketahui";
}
function extractCodes(payload) {
  const root = asRecord(payload);
  const responseData = asRecord(root.data);
  const detail = asRecord(responseData.data);
  const dealVoucher = asRecord(detail.deal_voucher);
  if (String(root.status ?? "").toLowerCase() !== "success" || Number(responseData.err_code ?? 0) !== 0) {
    return [];
  }
  if (!Array.isArray(dealVoucher.codes)) return [];
  return dealVoucher.codes.filter(
    (item) => item !== null && typeof item === "object" && !Array.isArray(item)
  );
}
function isSuccessfulResponse(result) {
  const root = asRecord(result.payload);
  const responseData = asRecord(root.data);
  return result.httpStatus >= 200 && result.httpStatus < 300 && String(root.status ?? "").toLowerCase() === "success" && Number(responseData.err_code ?? 0) === 0;
}
function getFailureReason(result) {
  if (result.error) return result.error;
  const root = asRecord(result.payload);
  const data = asRecord(root.data);
  const nestedData = asRecord(data.data);
  const candidates = [
    data.err_msg,
    data.message,
    root.message,
    root.err_msg,
    nestedData.err_msg,
    nestedData.message
  ];
  const message = candidates.map((value) => String(value ?? "").trim()).find(Boolean);
  return message || `HTTP ${result.httpStatus}`;
}
function isOrderNotFound(result, reason) {
  const payloadText = JSON.stringify(result.payload ?? "").toLowerCase();
  const text = `${reason} ${payloadText}`.toLowerCase();
  return [
    "pesanan tidak ditemukan",
    "pesanan tidak ada",
    "order tidak ditemukan",
    "order not found",
    "no order found",
    "order does not exist",
    "data pesanan tidak ditemukan"
  ].some((phrase) => text.includes(phrase));
}
function escapeHtml(value) {
  return String(value ?? "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function chunkLines(lines, maxLength = 3500) {
  const chunks = [];
  let current = "";
  for (const line of lines) {
    const next = current ? `${current}
${line}` : line;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
async function sendOrderNotifications(args) {
  const {
    total,
    successUsernames,
    failedUsers,
    notFoundUsers,
    zeroCodeUsers,
    codeLines,
    codeCount
  } = args;
  const summaryLines = [
    "<b>\u{1F4E6} GET ORDER SELESAI</b>",
    "",
    `Total order: <b>${total}</b>`,
    `Berhasil: <b>${successUsernames.length}</b>`,
    `Gagal: <b>${failedUsers.length + notFoundUsers.length}</b>`,
    `Pesanan tidak ditemukan: <b>${notFoundUsers.length}</b>`,
    `Kode tidak ditemukan (0 kode): <b>${zeroCodeUsers.length}</b>`,
    `Kode ditemukan: <b>${codeCount}</b>`,
    "",
    "<b>\u2705 BERHASIL</b>",
    ...successUsernames.length ? successUsernames.map((username) => `\u2022 <code>${escapeHtml(username)}</code>`) : ["\u2022 -"],
    "",
    "<b>\u274C GAGAL</b>",
    ...failedUsers.length ? failedUsers.map(
      ({ username, reason }) => `\u2022 <code>${escapeHtml(username)}</code> \u2014 ${escapeHtml(reason)}`
    ) : ["\u2022 -"],
    "",
    "<b>\u{1F50E} PESANAN TIDAK DITEMUKAN</b>",
    ...notFoundUsers.length ? notFoundUsers.map((username) => `\u2022 <code>${escapeHtml(username)}</code>`) : ["\u2022 -"],
    "",
    "<b>\u26A0\uFE0F KODE TIDAK DITEMUKAN (0 KODE)</b>",
    ...zeroCodeUsers.length ? zeroCodeUsers.flatMap((username) => [
      `\u{1F464} <code>${escapeHtml(username)}</code>`,
      "Kode pada username tidak ditemukan, mungkin belum selesai atau voucher code belum terbit. Silahkan cek pesanan anda secara manual.",
      ""
    ]) : ["\u2022 -"]
  ];
  for (const chunk of chunkLines(summaryLines, 3500)) {
    await sendNotif(chunk, "HTML");
  }
  const codeHeader = `<b>\u{1F511} LIST KODE VOUCHER</b>
Total kode: <b>${codeLines.length}</b>`;
  if (codeLines.length === 0) {
    await sendNotif(`${codeHeader}

<code>Tidak ada kode baru.</code>`, "HTML");
    return;
  }
  const groupedCodes = /* @__PURE__ */ new Map();
  for (const item of codeLines) {
    const group = groupedCodes.get(item.itemName) ?? [];
    group.push({
      username: item.username,
      value: item.value,
      type: item.type
    });
    groupedCodes.set(item.itemName, group);
  }
  await sendNotif(codeHeader, "HTML");
  for (const [itemName, items] of groupedCodes) {
    const groupHeader = `<b>${items.length} x ${escapeHtml(itemName)}</b>`;
    let currentLines = [groupHeader, ""];
    let currentLength = groupHeader.length + 1;
    for (const item of items) {
      const entry = `<b>${item.type}:</b> <code>${escapeHtml(item.value)}</code>
\u{1F464} ${escapeHtml(item.username)}`;
      if (currentLength + entry.length + 2 > 3500 && currentLines.length > 2) {
        await sendNotif(currentLines.join("\n"), "HTML");
        currentLines = [`<b>${items.length} x ${escapeHtml(itemName)} (lanjutan)</b>`, ""];
        currentLength = currentLines[0].length + 1;
      }
      currentLines.push(entry, "");
      currentLength += entry.length + 2;
    }
    if (currentLines.length > 2) {
      await sendNotif(currentLines.join("\n"), "HTML");
    }
  }
}
const getOrderService = {
  name: "getOrder",
  commands: ["/getOrder"],
  async execute(ctx) {
    let browser;
    try {
      const orders = await readListOrder();
      const existingCodes = await readExistingCodes();
      let allCodes = existingCodes;
      const concurrencyRaw = Number(
        process.env.GET_ORDER_CONCURRENCY ?? 5
      );
      const concurrency = Number.isFinite(concurrencyRaw) ? Math.max(1, Math.min(10, Math.floor(concurrencyRaw))) : 5;
      console.log("\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      console.log(" [GET ORDER] FETCH DIGITAL ORDER DETAIL");
      console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      console.log(`Pesanan       : ${orders.length}`);
      console.log(`Concurrency   : ${concurrency}`);
      console.log(`Kode tersimpan: ${existingCodes.length}`);
      const channel = process.env.PLAYWRIGHT_CHANNEL?.trim();
      const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();
      browser = await chromium.launch({
        headless: true,
        ...channel ? { channel } : {},
        ...executablePath ? { executablePath } : {}
      });
      const page = await browser.newPage();
      await launchMiniApp(ctx.client, page);
      console.log("[GET ORDER] Mini App siap. Mulai mengambil detail pesanan.");
      let successCount = 0;
      let failedCount = 0;
      let fetchedCodeCount = 0;
      const successUsernames = [];
      const failedUsers = [];
      const notFoundUsers = [];
      const zeroCodeUsers = [];
      const notificationCodeMap = /* @__PURE__ */ new Map();
      for (let index = 0; index < orders.length; index += concurrency) {
        const batch = orders.slice(index, index + concurrency);
        const results = await fetchOrderBatch(page, batch);
        const incomingCodes = [];
        for (const result of results) {
          if (!isSuccessfulResponse(result)) {
            failedCount++;
            const root = asRecord(result.payload);
            const data = asRecord(root.data);
            const message = getFailureReason(result);
            if (isOrderNotFound(result, message)) {
              notFoundUsers.push(result.username);
            } else {
              failedUsers.push({ username: result.username, reason: message });
            }
            console.warn(
              `  \u2717 ${result.username} (${result.orderId}): ${message}`
            );
            continue;
          }
          const codes = extractCodes(result.payload);
          if (codes.length === 0) {
            zeroCodeUsers.push(result.username);
            console.warn(
              `  \u26A0 ${result.username}: 0 kode ditemukan (pesanan mungkin belum selesai atau voucher belum terbit)`
            );
            continue;
          }
          successCount++;
          successUsernames.push(result.username);
          incomingCodes.push(...codes);
          fetchedCodeCount += codes.length;
          const itemName = extractItemName(result.payload);
          for (const code of codes) {
            const codeValue = String(code.code ?? "").trim();
            const codeUrl = String(code.url ?? "").trim();
            const value = codeValue || codeUrl;
            if (!value) continue;
            notificationCodeMap.set(`${itemName}:${getCodeKey(code)}`, {
              itemName,
              username: result.username,
              value,
              type: codeValue ? "KODE" : "URL"
            });
          }
          console.log(
            `  \u2713 ${result.username}: ${codes.length} kode ditemukan`
          );
        }
        if (incomingCodes.length > 0) {
          allCodes = mergeCodes(allCodes, incomingCodes);
          await saveCodes(allCodes);
        }
        console.log(
          `[GET ORDER] Batch ${Math.min(index + batch.length, orders.length)}/${orders.length} | Berhasil ${successCount} | Gagal ${failedCount} | Kode baru ${fetchedCodeCount} | Total tersimpan ${allCodes.length}`
        );
      }
      await saveCodes(allCodes);
      console.log("\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      console.log(" [GET ORDER] SELESAI");
      console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      console.log(`Pesanan berhasil : ${successCount}`);
      console.log(`Pesanan gagal    : ${failedCount}`);
      console.log(`Kode ditemukan   : ${fetchedCodeCount}`);
      console.log(`Total kode file  : ${allCodes.length}`);
      console.log(`Output           : ${CODES_PATH}`);
      try {
        await sendOrderNotifications({
          total: orders.length,
          successUsernames,
          failedUsers,
          notFoundUsers,
          zeroCodeUsers,
          codeLines: [...notificationCodeMap.values()],
          codeCount: fetchedCodeCount
        });
        console.log("[GET ORDER] Notifikasi Telegram berhasil dikirim.");
        const notifiedUsernames = [
          ...new Set(
            [...notificationCodeMap.values()].map((item) => item.username)
          )
        ];
        if (notifiedUsernames.length > 0) {
          const removedCount = await removeNotifiedOrders(notifiedUsernames);
          console.log(
            `[GET ORDER] ${removedCount} order dihapus dari listOrder.json.`
          );
        } else {
          console.log(
            "[GET ORDER] Tidak ada username berkode yang perlu dibersihkan dari listOrder.json."
          );
        }
      } catch (notificationError) {
        const notificationMessage = notificationError instanceof Error ? notificationError.message : String(notificationError);
        console.error(`[GET ORDER] Gagal mengirim notifikasi: ${notificationMessage}`);
        ctx.logger.error(`Gagal mengirim notifikasi Telegram: ${notificationMessage}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[GET ORDER] ${message}`);
      ctx.logger.error(message);
    } finally {
      if (browser) {
        await browser.close().catch((error) => {
          console.warn(
            `[GET ORDER] Gagal menutup browser: ${error instanceof Error ? error.message : String(error)}`
          );
        });
      }
    }
  }
};
var stdin_default = getOrderService;
export {
  stdin_default as default
};
