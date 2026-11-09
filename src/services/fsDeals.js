import "dotenv/config";
import { chromium } from "playwright";
import { Api } from "teleproto";
import { rupiah } from "../helper/toRopiah.js";
import { readFile } from "node:fs/promises";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { saveOrder } from "../helper/saveOrder.js";
class LocalConfigError extends Error {
}
class DealsStepError extends Error {
  constructor(message, step, detail) {
    super(message);
    this.step = step;
    this.detail = detail;
    this.name = "DealsStepError";
  }
  step;
  detail;
}
function getPayloadMessage(payload) {
  const record = asRecord(payload);
  const candidates = [record.message, record.error, record.msg, record.reason];
  const message = candidates.find(
    (value) => typeof value === "string" && value.trim()
  );
  if (typeof message === "string") return message.trim();
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  return "API tidak memberikan keterangan error.";
}
function assertApiSuccess(result, step) {
  const payload = asRecord(result.payload);
  const apiStatus = String(payload.status ?? "").toLowerCase();
  const httpOk = result.httpStatus >= 200 && result.httpStatus < 300;
  const apiOk = apiStatus === "success";
  if (result.error || !httpOk || !apiOk) {
    const detail = result.error ?? getPayloadMessage(result.payload);
    throw new DealsStepError(
      `${step} gagal (HTTP ${result.httpStatus}): ${getPayloadMessage(result.payload)}`,
      step,
      detail
    );
  }
  return payload;
}
let telegramClient;
function setTelegramClient(client) {
  telegramClient = client;
}
function parseMiniAppLink(link) {
  const url = new URL(link);
  if (!["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) {
    throw new LocalConfigError(
      "[DEALS] error: TELEGRAM_MINIAPP_LINK must be a t.me/<bot>/<short_name> link."
    );
  }
  const [botUsername, shortName] = url.pathname.split("/").filter(Boolean);
  if (!botUsername || !shortName) {
    throw new LocalConfigError(
      "The Telegram link must include both a bot username and Mini App short name."
    );
  }
  return {
    botUsername: botUsername.replace(/^@/, ""),
    shortName,
    startParam: url.searchParams.get("startapp") ?? void 0
  };
}
function normalizeHost(value) {
  const input = value.trim().toLowerCase();
  if (!input) return "";
  try {
    return new URL(input.includes("://") ? input : `https://${input}`).hostname.toLowerCase();
  } catch {
    return input.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  }
}
function getRequestAction(request) {
  const postData = request.postData() || "";
  try {
    const parsed = JSON.parse(postData);
    if (parsed && typeof parsed === "object") {
      const action = parsed.action;
      if (typeof action === "string") return action;
    }
  } catch {
  }
  const formAction = new URLSearchParams(postData).get("action");
  if (formAction) return formAction;
  try {
    return new URL(request.url()).searchParams.get("action");
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
function debugLog(label, value) {
}
function asRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function toNumber(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
const LOG_PREFIX = "[DEALS]";
const LOG_LINE = "\u2500".repeat(58);
function logSection(title) {
  console.log(`
${LOG_LINE}
 ${LOG_PREFIX} ${title}
${LOG_LINE}`);
}
function logInfo(label, value) {
  console.log(`  ${label.padEnd(17)} ${String(value ?? "-")}`);
}
function logSuccess(message) {
  console.log(`  \u2713 ${message}`);
}
function logWarn(message) {
  console.warn(`  ! ${message}`);
}
function logError(message, detail) {
  console.error(`  \u2717 ${message}`);
  if (detail !== void 0) {
    console.error(typeof detail === "string" ? `    ${detail}` : detail);
  }
}
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
async function checkoutDeals(cookie, voucherUrl, sz, targetPrice) {
  if (!telegramClient) {
    throw new LocalConfigError(
      "Telegram client belum diinisialisasi. Panggil setTelegramClient(client) dulu."
    );
  }
  if (!cookie.trim()) throw new LocalConfigError("Cookie input was empty.");
  if (!sz.trim()) throw new LocalConfigError("Nilai sz kosong.");
  const appLink = process.env.TELEGRAM_MINIAPP_LINK || "https://t.me/Shopee8DevsBot/checkout";
  const { botUsername, shortName, startParam } = parseMiniAppLink(appLink);
  const client = telegramClient;
  const customSz = sz.trim();
  let browser;
  try {
    let parsedVoucherUrl;
    try {
      parsedVoucherUrl = new URL(voucherUrl);
    } catch {
      throw new LocalConfigError("Enter a valid Shopee voucher URL.");
    }
    const voucherHost = parsedVoucherUrl.hostname.toLowerCase();
    if (parsedVoucherUrl.protocol !== "https:" || !(voucherHost === "shope.ee" || voucherHost.endsWith(".shopee.co.id") || voucherHost === "shopee.co.id" || voucherHost === "app.shopeepay.co.id" || voucherHost === "id.shp.ee")) {
      throw new LocalConfigError(
        "Voucher URL must use HTTPS on shopee.co.id or shope.ee."
      );
    }
    const apiHost = normalizeHost(
      process.env.API_HOST || "miniapp.bot-devs.com"
    );
    if (!apiHost) {
      throw new LocalConfigError("API_HOST kosong atau tidak valid.");
    }
    const bot = await client.getEntity(botUsername);
    if (!(bot instanceof Api.User) || bot.accessHash === void 0) {
      throw new Error("Telegram did not resolve the Mini App bot as a user.");
    }
    const botUser = new Api.InputUser({
      userId: bot.id,
      accessHash: bot.accessHash
    });
    const botPeer = new Api.InputPeerUser({
      userId: bot.id,
      accessHash: bot.accessHash
    });
    const appRef = new Api.InputBotAppShortName({ botId: botUser, shortName });
    const appInfo = await client.api.messages.getBotApp({
      app: appRef,
      hash: 0
    });
    if (!(appInfo instanceof Api.messages.BotApp) || !(appInfo.app instanceof Api.BotApp)) {
      throw new Error("Telegram did not return Mini App metadata.");
    }
    const appInput = new Api.InputBotAppID({
      id: appInfo.app.id,
      accessHash: appInfo.app.accessHash
    });
    const webView = await client.api.messages.requestAppWebView({
      peer: botPeer,
      app: appInput,
      startParam,
      platform: "web"
    });
    if (!("url" in webView) || typeof webView.url !== "string") {
      throw new Error("Telegram did not return a Mini App launch URL.");
    }
    const launchUrl = webView.url;
    const channel = process.env.PLAYWRIGHT_CHANNEL?.trim();
    const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();
    browser = await chromium.launch({
      headless: true,
      ...channel ? { channel } : {},
      ...executablePath ? { executablePath } : {}
    });
    const page = await browser.newPage();
    let loadUiHtml = "";
    const observedApiRequests = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.text().includes("[DEBUG]")) {
        console.error(`  [BROWSER:${message.type().toUpperCase()}] ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      logError(`Browser ${error.name}: ${error.message}`, error.stack || void 0);
    });
    page.on("request", (request) => {
      try {
        const url = new URL(request.url());
        const action = getRequestAction(request);
        if (action) {
          observedApiRequests.push(`${request.method()} ${url.hostname}${url.pathname} action=${action}`);
          if (observedApiRequests.length > 12) observedApiRequests.shift();
        }
        if (url.hostname.toLowerCase() !== apiHost) return;
        const headers = request.headers();
        const timestamp = Number(headers["x-app-timestamp"]);
        const params = new URLSearchParams(request.postData() || "");
        debugLog("API REQUEST", {
          method: request.method(),
          url: `${url.origin}${url.pathname}`,
          action: action || params.get("action") || void 0,
          body: Object.fromEntries(params.entries()),
          headers: {
            "x-app-timestamp": headers["x-app-timestamp"] || null,
            "x-app-nonce": headers["x-app-nonce"] || null,
            "x-app-signature": headers["x-app-signature"] || null,
            "x-app-session": headers["x-app-session"] || null
          },
          timestampFresh: Number.isFinite(timestamp) && Math.abs(Date.now() - timestamp) < 12e4
        });
      } catch (error) {
        logWarn(`Gagal mencatat request debug: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    page.on("response", async (response) => {
      try {
        const url = new URL(response.url());
        if (url.hostname.toLowerCase() !== apiHost) return;
        const raw = await response.text();
        let body = raw;
        try {
          body = JSON.parse(raw);
        } catch {
        }
        debugLog("API RESPONSE", {
          status: response.status(),
          statusText: response.statusText(),
          url: `${url.origin}${url.pathname}`,
          body
        });
      } catch (error) {
        logWarn(`Gagal mencatat response debug: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    const loadUiResponsePromise = page.waitForResponse(
      (response) => isApiAction(response, apiHost, "load_ui"),
      { timeout: 45e3 }
    );
    let loadUiResponse;
    try {
      const [, response] = await Promise.all([
        page.goto(launchUrl, {
          waitUntil: "domcontentloaded",
          timeout: 45e3
        }),
        loadUiResponsePromise
      ]);
      loadUiResponse = response;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const observed = observedApiRequests.length ? observedApiRequests.join("\n  - ") : "Tidak ada request dengan parameter action yang terdeteksi.";
      throw new DealsStepError(
        `Mini App tidak mengirim response action=load_ui ke host '${apiHost}'. ${detail}
Request terdeteksi:
  - ${observed}
Periksa API_HOST dan status halaman Mini App.`,
        "LOAD MINI APP",
        { error: detail, expectedHost: apiHost, observedApiRequests }
      );
    }
    const loadUiPayload = await loadUiResponse.json();
    loadUiHtml = typeof loadUiPayload.html === "string" ? loadUiPayload.html : "";
    const initDataAvailable = await page.waitForFunction(
      () => Boolean(
        window.Telegram?.WebApp?.initData
      ),
      null,
      { timeout: 15e3 }
    ).then(() => true).catch(() => false);
    logInfo("Telegram initData", initDataAvailable ? "tersedia" : "tidak tersedia");
    if (initDataAvailable) {
      const telegramInitData = await page.evaluate(
        () => window.Telegram?.WebApp?.initData || ""
      );
      debugLog("TELEGRAM INIT DATA", telegramInitData);
    }
    const securityState = await page.evaluate(() => {
      const w = window;
      return {
        getSecureHeadersAvailable: typeof w.getSecureHeaders === "function",
        appSessionAvailable: Boolean(w.__app_session),
        appSessionLength: w.__app_session?.length ?? 0
      };
    });
    debugLog("SECURITY STATE AFTER load_ui", securityState);
    const cookieValue = cookie.trim();
    if (!cookieValue.trim())
      throw new LocalConfigError("Cookie input was empty.");
    debugLog("COOKIE INPUT", cookieValue);
    logSection("STEP 1/4 \xB7 VALIDASI AKUN");
    const validation = await page.evaluate(
      async ({ cookie: cookie2 }) => {
        const appWindow = window;
        const initData = appWindow.Telegram?.WebApp?.initData || "";
        if (!initData)
          throw new Error("Telegram WebApp initData is unavailable.");
        if (typeof appWindow.getSecureHeaders !== "function") {
          throw new Error(
            "getSecureHeaders is unavailable in the Mini App page."
          );
        }
        const body = new URLSearchParams({
          initData,
          action: "validate_cookie",
          cookie_val: cookie2
        });
        const response = await fetch("api.php", {
          method: "POST",
          headers: appWindow.getSecureHeaders("validate_cookie"),
          body: body.toString()
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
      { cookie: cookieValue }
    );
    await sleep(2e3);
    const validationPayload = validation.payload !== null && typeof validation.payload === "object" ? validation.payload : {};
    debugLog("COOKIE VALIDATION FULL PAYLOAD", validation.payload);
    logInfo("Username", validationPayload.username);
    logInfo("Nomor HP", validationPayload.phone);
    logInfo("Saldo koin", await rupiah(Number(validationPayload.coins ?? 0)));
    if (validation.httpStatus < 200 || validation.httpStatus >= 300 || String(validationPayload.status ?? "").toLowerCase() !== "success") {
      throw new DealsStepError(
        `Validasi cookie gagal: ${getPayloadMessage(validation.payload)}`,
        "VALIDASI AKUN",
        validation.payload
      );
    }
    logSection("STEP 2/4 \xB7 VALIDASI VOUCHER");
    let voucherResult;
    let voucherPayload;
    let voucherData;
    let matchedPrice = 0;
    const MAX_VOUCHER_ATTEMPTS = 10;
    for (let attempt = 1; attempt <= MAX_VOUCHER_ATTEMPTS; attempt++) {
      try {
        voucherResult = await page.evaluate(
          async ({ cookie: cookie2, voucherUrl: voucherUrl2 }) => {
            const appWindow = window;
            const initData = appWindow.Telegram?.WebApp?.initData || "";
            if (!initData) {
              throw new Error("Telegram WebApp initData is unavailable.");
            }
            if (typeof appWindow.getSecureHeaders !== "function") {
              throw new Error(
                "getSecureHeaders is unavailable in the Mini App page."
              );
            }
            const body = new URLSearchParams({
              initData,
              action: "fetch_deal_voucher",
              cookie_val: cookie2,
              voucher_url: voucherUrl2
            });
            const response = await fetch("api.php", {
              method: "POST",
              headers: appWindow.getSecureHeaders("fetch_deal_voucher"),
              body: body.toString()
            });
            const raw = await response.text();
            let payload;
            let error;
            try {
              payload = JSON.parse(raw);
            } catch {
              payload = raw;
              error = raw;
            }
            return { httpStatus: response.status, payload, error };
          },
          { cookie: cookieValue, voucherUrl }
        );
        const responsePayload = asRecord(voucherResult.payload);
        const responseData = asRecord(responsePayload.data);
        const currentVoucherData = responseData;
        if (!voucherResult.error && voucherResult.httpStatus >= 200 && voucherResult.httpStatus < 300 && String(responsePayload.status ?? "").toLowerCase() === "success") {
          const rawPrice = toNumber(currentVoucherData.discount_price);
          const currentPrice = rawPrice / 1e5;
          logInfo(
            `Cek harga ${attempt}/${MAX_VOUCHER_ATTEMPTS}`,
            `${await rupiah(currentPrice)} (target ${await rupiah(targetPrice)})`
          );
          if (rawPrice > 0 && currentPrice <= targetPrice) {
            voucherPayload = responsePayload;
            voucherData = currentVoucherData;
            matchedPrice = currentPrice;
            logSuccess(
              `Harga cocok pada percobaan ${attempt}: ${await rupiah(currentPrice)}`
            );
            break;
          }
        } else {
          logWarn(
            `Percobaan ${attempt}/${MAX_VOUCHER_ATTEMPTS}: ${getPayloadMessage(voucherResult.payload)}`
          );
        }
      } catch (error) {
        logWarn(
          `Percobaan ${attempt}/${MAX_VOUCHER_ATTEMPTS} gagal: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      if (attempt < MAX_VOUCHER_ATTEMPTS) {
        await sleep(300);
      }
    }
    if (!voucherPayload || !voucherData) {
      throw new DealsStepError(
        `Harga target ${await rupiah(targetPrice)} tidak ditemukan setelah ${MAX_VOUCHER_ATTEMPTS} percobaan. Order tidak dibuat.`,
        "TARGET HARGA",
        voucherResult?.payload
      );
    }
    logInfo("Nama voucher", voucherData.item_name);
    logInfo("Harga voucher", await rupiah(matchedPrice));
    const voucherItemId = voucherData.item_id ?? voucherData.id;
    if (!voucherItemId) {
      throw new DealsStepError(
        `Data voucher tidak memiliki item_id. ${getPayloadMessage(voucherPayload)}`,
        "VALIDASI VOUCHER",
        voucherPayload
      );
    }
    const orderPayload = {
      item_id: voucherItemId,
      quantity: 1,
      market_price: voucherData.market_price,
      discount_price: voucherData.discount_price ?? voucherData.market_price,
      original_discount_price: voucherData.original_discount_price ?? voucherData.discount_price ?? voucherData.market_price,
      promotion_activity_id: voucherData.promotion_activity_id ?? voucherData.effective_promotion_activity_id ?? 0,
      category_id: voucherData.category_id ?? 70101,
      carrier_id: voucherData.carrier_id ?? 150
    };
    logSection("STEP 3/4 \xB7 MEMBUAT ORDER");
    const createdOrder = await createOrder(orderPayload);
    const createResponse = asRecord(createdOrder.payload);
    const createData = asRecord(createResponse.data);
    const createdPayload = { ...voucherData, ...createData, ...createResponse };
    const orderId = String(createdPayload.order_id ?? "").trim();
    if (createdOrder.httpStatus < 200 || createdOrder.httpStatus >= 300 || createdOrder.error || String(createResponse.status ?? "").toLowerCase() !== "success" || !orderId) {
      throw new DealsStepError(
        `Gagal membuat order: ${getPayloadMessage(createdOrder.payload)}`,
        "MEMBUAT ORDER",
        createdOrder.payload
      );
    }
    logSuccess(`Order berhasil dibuat: ${orderId}`);
    const coinBalanceResult = await getCoinBalance(cookieValue);
    const coinBalancePayload = asRecord(coinBalanceResult.payload);
    if (coinBalanceResult.httpStatus < 200 || coinBalanceResult.httpStatus >= 300 || coinBalanceResult.error) {
      throw new DealsStepError(
        `Gagal mengambil saldo koin: ${getPayloadMessage(coinBalanceResult.payload)}`,
        "CEK SALDO KOIN",
        coinBalanceResult.payload
      );
    }
    const availableCoins = toNumber(coinBalancePayload.coins);
    const checkoutResult = await selectVoucherCheckout(orderId, {
      ...createdPayload,
      ...orderPayload,
      quantity: orderPayload.quantity
    });
    const checkoutPayload = asRecord(checkoutResult.payload);
    const checkoutData = asRecord(checkoutPayload.data);
    if (checkoutResult.httpStatus < 200 || checkoutResult.httpStatus >= 300 || String(checkoutPayload.status ?? "").toLowerCase() !== "success") {
      throw new DealsStepError(
        `Pemilihan checkout gagal: ${getPayloadMessage(checkoutResult.payload)}`,
        "PILIH CHECKOUT",
        checkoutResult.payload
      );
    }
    const channels = Array.isArray(checkoutData.channels) ? checkoutData.channels : [];
    const useCoin = checkoutPayload.user_coins !== void 0 ? toNumber(checkoutPayload.user_coins) > 0 : availableCoins > 0;
    const priceResult = await changeVoucherPrice(
      orderId,
      {
        ...createdPayload,
        ...orderPayload,
        quantity: orderPayload.quantity
      },
      {
        channelName: "SeaBank",
        useCoin,
        snapshotId: toNumber(createdPayload.snapshot_id),
        channels
      }
    );
    const pricePayload = asRecord(priceResult.payload);
    const priceData = asRecord(pricePayload.data);
    if (priceResult.httpStatus < 200 || priceResult.httpStatus >= 300 || String(pricePayload.status ?? "").toLowerCase() !== "success") {
      throw new DealsStepError(
        `Perhitungan ulang harga gagal: ${getPayloadMessage(priceResult.payload)}`,
        "HITUNG HARGA",
        priceResult.payload
      );
    }
    const quantity = toNumber(orderPayload.quantity) || 1;
    const unitPrice = toNumber(
      createdPayload.discount_price ?? createdPayload.market_price
    );
    const subtotal = unitPrice * quantity;
    const voucherDiscountRaw = toNumber(
      priceData.voucher_discount ?? asRecord(
        asRecord(priceData.payment_channel_promotion_info).discount_info
      ).reduction_price
    );
    const voucherDiscount = voucherDiscountRaw > 1e6 ? voucherDiscountRaw : voucherDiscountRaw * 1e5;
    const coinsRedeemed = useCoin ? toNumber(
      priceData.coins_redeemed ?? asRecord(
        asRecord(
          asRecord(priceData.payment_channel_promotion_info).shopee_pay_info
        )
      ).coin_cashback
    ) || toNumber(priceData.coins_spend) * 1e5 : 0;
    const coinsSpend = useCoin ? toNumber(priceData.coins_spend) || Math.round(coinsRedeemed / 1e5) : 0;
    const pricingInfo = asRecord(asRecord(priceData.pricing_info).data);
    const calculatedFinalPrice = Math.max(
      0,
      subtotal - voucherDiscount - coinsRedeemed
    );
    const finalPrice = pricingInfo.pricing_final_price !== void 0 ? toNumber(pricingInfo.pricing_final_price) : calculatedFinalPrice;
    const itemData = {
      id: createdPayload.item_id ?? createdPayload.id,
      quantity,
      market_price: toNumber(createdPayload.market_price),
      discount_price: unitPrice,
      name: String(createdPayload.item_name ?? "Voucher Deals"),
      snapshot_id: createdPayload.snapshot_id ?? 0,
      iss_item_id: createdPayload.iss_item_id ?? 0,
      model_id: createdPayload.model_id ?? 0,
      hub_product_id: createdPayload.hub_product_id ?? 0
    };
    let payResult;
    try {
      payResult = await payVoucherOrder({
        username: String(
          createdPayload.username ?? validationPayload.username ?? ""
        ),
        order_id: orderId,
        channel_name: "SeaBank",
        item_data: itemData,
        final_price: finalPrice,
        coins_spend: coinsSpend,
        coins_redeemed: coinsRedeemed,
        category_id: toNumber(createdPayload.category_id ?? 70101),
        carrier_id: toNumber(createdPayload.carrier_id ?? 150)
      });
    } catch (error) {
      throw new DealsStepError(
        `Status pembayaran belum dapat dipastikan untuk order ${orderId}. Jangan retry otomatis; periksa status order terlebih dahulu.`,
        "PEMBAYARAN - STATUS UNKNOWN",
        error instanceof Error ? error.message : error
      );
    }
    const payPayload = assertApiSuccess(payResult, "PEMBAYARAN");
    if (payPayload.total_payable === void 0) {
      logWarn(
        `API pembayaran success tetapi total_payable tidak ditemukan untuk order ${orderId}. Simpan respons untuk pemeriksaan.`
      );
    }
    logSection("STEP 4/4 \xB7 HASIL CHECKOUT");
    logSuccess("Proses checkout selesai.");
    logInfo("Username", createdPayload.username ?? validationPayload.username);
    logInfo("Order ID", orderId);
    logInfo("Total pembayaran", await rupiah(Number(payPayload?.total_payable ?? 0) / 1e5));
    try {
      await saveOrder(payPayload);
    } catch (error) {
      logError(
        `Pembayaran berhasil untuk order ${orderId}, tetapi gagal menyimpan riwayat order.`,
        error instanceof Error ? error.message : error
      );
    }
    return true;
    async function callMiniAppApi(action, cookie2, fields = {}) {
      return page.evaluate(
        async ({ action: action2, cookieValue: cookieValue2, fields: fields2 }) => {
          const appWindow = window;
          const initData = appWindow.Telegram?.WebApp?.initData || "";
          if (!initData) {
            throw new Error("Telegram WebApp initData is unavailable.");
          }
          if (typeof appWindow.getSecureHeaders !== "function") {
            throw new Error(
              "getSecureHeaders is unavailable in the Mini App page."
            );
          }
          const body = new URLSearchParams({
            initData,
            action: action2,
            cookie_val: cookieValue2,
            ...fields2
          });
          const response = await fetch("api.php", {
            method: "POST",
            headers: appWindow.getSecureHeaders(action2),
            body: body.toString()
          });
          const raw = await response.text();
          let payload;
          let error;
          try {
            payload = JSON.parse(raw);
          } catch {
            payload = raw;
            error = raw;
          }
          return { httpStatus: response.status, payload, error };
        },
        { action, cookieValue: cookie2, fields }
      );
    }
    async function createOrder(payload) {
      const fields = {
        item_id: String(payload.item_id ?? payload.id ?? ""),
        quantity: String(payload.quantity ?? 1),
        market_price: String(payload.market_price ?? 0),
        discount_price: String(
          payload.discount_price ?? payload.market_price ?? 0
        ),
        original_discount_price: String(
          payload.original_discount_price ?? payload.discount_price ?? payload.market_price ?? 0
        ),
        promotion_activity_id: String(
          payload.promotion_activity_id ?? payload.effective_promotion_activity_id ?? 0
        ),
        category_id: String(payload.category_id ?? 70101),
        carrier_id: String(payload.carrier_id ?? 150),
        custom_sz: customSz
      };
      const result = await callMiniAppApi(
        "create_voucher_order",
        cookieValue,
        fields
      );
      return result;
    }
    async function getCoinBalance(cookie2) {
      const result = await callMiniAppApi("get_coin_balance", cookie2);
      const payload = asRecord(result.payload);
      logInfo("Saldo koin", await rupiah(Number(payload.coins ?? 0)));
      logInfo("Saldo wallet", await rupiah(Number(payload.wallet ?? 0)));
      return result;
    }
    async function selectVoucherCheckout(orderId2, product, channelName = "SeaBank") {
      return callMiniAppApi("select_voucher_checkout", cookieValue, {
        order_id: orderId2,
        item_id: String(product.item_id ?? product.id ?? ""),
        quantity: String(product.quantity ?? 1),
        unit_price: String(product.discount_price ?? product.market_price ?? 0),
        category_id: String(product.category_id ?? 70101),
        carrier_id: String(product.carrier_id ?? 150),
        channel_name: channelName,
        custom_sz: customSz
      });
    }
    async function changeVoucherPrice(orderId2, product, options = {}) {
      const fields = {
        order_id: orderId2,
        item_id: String(product.item_id ?? product.id ?? ""),
        quantity: String(product.quantity ?? 1),
        market_price: String(product.market_price ?? 0),
        unit_price: String(product.discount_price ?? product.market_price ?? 0),
        category_id: String(product.category_id ?? 70101),
        carrier_id: String(product.carrier_id ?? 150),
        snapshot_id: String(options.snapshotId ?? product.snapshot_id ?? 0),
        channel_name: options.channelName ?? "SeaBank",
        user_use_coin: options.useCoin ? "1" : "0",
        custom_sz: customSz
      };
      if (options.voucherUsedInfo) {
        fields.voucher_used_info = JSON.stringify(options.voucherUsedInfo);
      }
      if (options.channels?.length) {
        fields.channels = JSON.stringify(options.channels);
      }
      return callMiniAppApi("change_voucher_price", cookieValue, fields);
    }
    async function payVoucherOrder(payload) {
      await sleep(2e3);
      return callMiniAppApi("pay_voucher_order", cookieValue, {
        username: payload.username,
        order_id: payload.order_id,
        channel_name: payload.channel_name,
        item_data: JSON.stringify(payload.item_data),
        final_price: String(payload.final_price),
        coins_spend: String(payload.coins_spend),
        coins_redeemed: String(payload.coins_redeemed),
        category_id: String(payload.category_id),
        carrier_id: String(payload.carrier_id),
        custom_sz: customSz
      });
    }
  } finally {
    if (browser) await browser.close().catch(() => void 0);
  }
}
const DEFAULT_VOUCHER_URL = "https://id.shp.ee/uUCZT8MW";
const US_FS_PATH = fileURLToPath(new URL("../../data/usFs.json", import.meta.url));
const DEALS_PROGRESS_PATH = fileURLToPath(
  new URL("../../data/deals-progress.json", import.meta.url)
);
function asObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function getJsonField(row, candidates) {
  const normalizedCandidates = new Set(
    candidates.map((key) => key.toLowerCase().replace(/[\\s_-]/g, ""))
  );
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().replace(/[\\s_-]/g, "");
    if (normalizedCandidates.has(normalizedKey)) return value;
  }
  return void 0;
}
function extractFsRows(parsed) {
  if (Array.isArray(parsed)) return parsed;
  const root = asObject(parsed);
  for (const key of ["data", "accounts", "users", "items", "list"]) {
    if (Array.isArray(root[key])) return root[key];
  }
  if (getJsonField(root, ["cookie"]) !== void 0 || getJsonField(root, ["sz"]) !== void 0) {
    return [root];
  }
  const values = Object.entries(root).filter(([, value]) => value !== null && typeof value === "object").map(([username, value]) => ({
    username,
    ...asObject(value)
  }));
  return values;
}
async function loadFsQueue() {
  let raw;
  try {
    raw = await readFile(US_FS_PATH, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new LocalConfigError(`File usFs.json tidak ditemukan: ${US_FS_PATH}`);
    }
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LocalConfigError("Format JSON usFs.json tidak valid.");
  }
  const rows = extractFsRows(parsed);
  if (rows.length === 0) {
    throw new LocalConfigError("usFs.json tidak memiliki data akun.");
  }
  const queue = [];
  const skipped = { missingCookie: 0, missingSz: 0 };
  for (const [index, value] of rows.entries()) {
    const row = asObject(value);
    const username = String(
      getJsonField(row, ["username", "user", "email", "userid", "user_id", "name"]) ?? `Akun ${index + 1}`
    ).trim();
    const cookie = String(getJsonField(row, ["cookie", "cookies"]) ?? "").trim();
    const sz = String(getJsonField(row, ["sz", "custom_sz", "customSz"]) ?? "").trim();
    if (!cookie) {
      skipped.missingCookie++;
      continue;
    }
    if (!sz) {
      skipped.missingSz++;
      continue;
    }
    const checkpointKey = createHash("sha256").update(`${username.toLowerCase()}\\n${cookie}\\n${sz}`).digest("hex");
    queue.push({
      username,
      cookie,
      sz,
      checkpointKey,
      status: "WAITING",
      note: "Menunggu giliran"
    });
  }
  logSection("SCAN usFs.json");
  logInfo("File", US_FS_PATH);
  logInfo("Data dibaca", rows.length);
  logInfo("Masuk antrean", queue.length);
  logInfo("Cookie kosong", skipped.missingCookie);
  logInfo("SZ kosong", skipped.missingSz);
  if (queue.length === 0) {
    throw new LocalConfigError(
      "Tidak ada akun valid. Setiap data harus memiliki cookie dan sz."
    );
  }
  return queue;
}
async function readDealsProgress() {
  try {
    const contents = await readFile(DEALS_PROGRESS_PATH, "utf-8");
    const progress = JSON.parse(contents);
    if (progress === null || typeof progress !== "object" || progress.version !== 1 || !Array.isArray(progress.completed)) {
      throw new LocalConfigError("Format data progress deals tidak valid.");
    }
    return progress;
  } catch (error) {
    if (error.code === "ENOENT") {
      return { version: 1, completed: [], updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    }
    throw error;
  }
}
async function writeDealsProgress(completed, outcomes) {
  await mkdir(fileURLToPath(new URL("../../data/", import.meta.url)), { recursive: true });
  const temporaryPath = `${DEALS_PROGRESS_PATH}.tmp`;
  const progress = {
    version: 1,
    completed: [...completed],
    outcomes,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  await writeFile(temporaryPath, `${JSON.stringify(progress, null, 2)}
`, "utf-8");
  await rename(temporaryPath, DEALS_PROGRESS_PATH);
}
function renderQueue(queue, currentIndex) {
  const success = queue.filter((item) => item.status === "SUCCESS").length;
  const failedItems = queue.filter((item) => item.status === "FAILED");
  const failed = failedItems.length;
  const waiting = queue.filter((item) => item.status === "WAITING").length;
  const processing = queue.filter((item) => item.status === "PROCESSING").length;
  const done = success + failed;
  console.clear();
  console.log(`
${LOG_LINE}
 ${LOG_PREFIX} BATCH QUEUE \xB7 ${done}/${queue.length} selesai
${LOG_LINE}`);
  console.log(
    `Progres: ${done}/${queue.length} | Berhasil: ${success} | Gagal: ${failed} | Proses: ${processing} | Menunggu: ${waiting}`
  );
  if (currentIndex >= 0 && currentIndex < queue.length) {
    const current = queue[currentIndex];
    console.log(`Akun aktif: ${current.username} (${current.status})`);
    console.log(`Keterangan: ${current.note}`);
  }
  if (failedItems.length > 0) {
    console.log("\nAKUN GAGAL TERAKHIR:");
    for (const item of failedItems.slice(-5)) {
      console.log(`  \u2022 ${item.username}: ${item.note}`);
    }
  }
}
function parseStartTime(input) {
  const match = input.trim().match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
  if (!match) {
    throw new LocalConfigError(
      "Format jam tidak valid. Gunakan HH:mm:ss.ms, contoh 12:30:00.500."
    );
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4].padEnd(3, "0"));
  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new LocalConfigError("Jam mulai berada di luar rentang yang valid.");
  }
  const now = /* @__PURE__ */ new Date();
  const scheduled = new Date(now);
  scheduled.setHours(hours, minutes, seconds, milliseconds);
  if (scheduled.getTime() <= now.getTime()) {
    throw new LocalConfigError(
      "Jam mulai harus lebih besar dari waktu sekarang (hari ini)."
    );
  }
  return scheduled;
}
function parseTargetPrice(input) {
  const normalized = input.trim().replace(/[^\d]/g, "");
  const price = Number(normalized);
  if (!normalized || !Number.isSafeInteger(price) || price <= 0) {
    throw new LocalConfigError(
      "Target harga tidak valid. Masukkan nominal rupiah, contoh 50000."
    );
  }
  return price;
}
async function waitUntilStart(startAt) {
  const target = startAt.getTime();
  logSection("MENUNGGU JAM FS");
  logInfo("Mulai pada", startAt.toLocaleTimeString("id-ID", {
    hour12: false
  }));
  while (true) {
    const remaining = target - Date.now();
    if (remaining <= 0) break;
    if (remaining > 1e3) {
      await sleep(Math.min(1e3, remaining - 250));
    } else {
      await sleep(remaining);
    }
  }
  logSuccess("Waktu FS tercapai. Memulai batch.");
}
const dealsService = {
  name: "fsdeals",
  commands: ["/fsdeals"],
  async execute(ctx) {
    setTelegramClient(ctx.client);
    const voucherUrl = process.env.VOUCHER_URL?.trim() || DEFAULT_VOUCHER_URL;
    let startAt;
    let targetPrice;
    try {
      const startTimeInput = await ctx.prompt.question(
        "Jam mulai FS (HH:mm:ss.ms): "
      );
      startAt = parseStartTime(startTimeInput);
      const targetPriceInput = await ctx.prompt.question(
        "Target harga (Rupiah, contoh 50000): "
      );
      targetPrice = parseTargetPrice(targetPriceInput);
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return;
    }
    let queue;
    try {
      queue = await loadFsQueue();
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return;
    }
    logSection("MEMULAI BATCH DEALS");
    logInfo("Total antrean", queue.length);
    logInfo("Sumber data", "usFs.json");
    logInfo("Data wajib", "cookie + sz");
    logInfo("Jam mulai FS", startAt.toLocaleTimeString("id-ID", { hour12: false }));
    logInfo("Target harga", await rupiah(targetPrice));
    logInfo("Maks. fetch voucher", "10 kali per akun");
    let completed;
    let outcomes;
    try {
      const savedProgress = await readDealsProgress();
      completed = new Set(savedProgress.completed);
      outcomes = savedProgress.outcomes ?? {};
    } catch (error) {
      ctx.logger.error(`Gagal membaca progress deals: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    for (const item of queue) {
      if (completed.has(item.checkpointKey)) {
        item.status = "SUCCESS";
        item.note = "Selesai pada sesi sebelumnya";
      }
    }
    if (queue.every((item) => item.status === "SUCCESS")) {
      completed.clear();
      queue.forEach((item) => {
        item.status = "WAITING";
        item.note = "Menunggu giliran";
      });
      outcomes = {};
      await writeDealsProgress(completed, outcomes);
    }
    const resumedCount = queue.filter((item) => item.status === "SUCCESS").length;
    if (resumedCount > 0) logInfo("Dilanjutkan", `${resumedCount} akun sebelumnya dilewati`);
    renderQueue(queue, -1);
    await waitUntilStart(startAt);
    let interrupted = false;
    const onSigint = () => {
      interrupted = true;
      logWarn("Ctrl+C diterima. Akun yang sedang berjalan akan diselesaikan dulu; antrean berikutnya dihentikan.");
    };
    process.once("SIGINT", onSigint);
    try {
      for (let index = 0; index < queue.length; index++) {
        const item = queue[index];
        if (item.status === "SUCCESS") continue;
        if (interrupted) break;
        item.status = "PROCESSING";
        item.note = "Checkout sedang diproses";
        renderQueue(queue, index);
        try {
          const succeeded = await checkoutDeals(item.cookie, voucherUrl, item.sz, targetPrice);
          if (succeeded) {
            item.status = "SUCCESS";
            item.note = "Checkout selesai";
            completed.add(item.checkpointKey);
          } else {
            item.status = "FAILED";
            item.note = "Checkout dihentikan tanpa detail error";
          }
        } catch (error) {
          item.status = "FAILED";
          item.note = error instanceof Error ? error.message : String(error);
          logError(`Checkout gagal untuk ${item.username}.`, item.note);
        }
        outcomes[item.checkpointKey] = {
          username: item.username,
          status: item.status === "SUCCESS" ? "SUCCESS" : "FAILED",
          note: item.note,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        await writeDealsProgress(completed, outcomes);
        renderQueue(queue, index);
        if (interrupted) break;
      }
    } finally {
      process.off("SIGINT", onSigint);
    }
    if (interrupted) {
      logWarn("Batch dihentikan dengan aman. Progress akun yang sudah diproses tersimpan.");
    }
    logSection("BATCH SELESAI");
    logInfo("Total akun", queue.length);
    logInfo("Berhasil", queue.filter((item) => item.status === "SUCCESS").length);
    logInfo("Gagal", queue.filter((item) => item.status === "FAILED").length);
  }
};
var stdin_default = dealsService;
export {
  checkoutDeals,
  stdin_default as default,
  setTelegramClient
};
