import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { default as jsQR } from "jsqr";
import { PNG } from "pngjs";
import { Api } from "teleproto";
import { getConfig } from "../../config/config.js";
class CheckoutError extends Error {
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const checkoutFile = path.join(dataDir, "checkout.json");
const qrisDir = path.join(dataDir, "qris");
const checkoutPreferencesFile = path.join(dataDir, "checkout-preferences.json");
function formatJakartaDate(value = /* @__PURE__ */ new Date()) {
  const date = value instanceof Date ? value : new Date(String(value));
  const validDate = Number.isNaN(date.getTime()) ? /* @__PURE__ */ new Date() : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asString(value) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
function compactCheckoutRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const item = value;
  return {
    tanggal: typeof item.tanggal === "string" ? item.tanggal : formatJakartaDate(item.saved_at ?? /* @__PURE__ */ new Date()),
    username: typeof item.username === "string" ? item.username : "",
    place_order_response: item.place_order_response ?? null
  };
}
async function saveCheckout(record) {
  await fs.mkdir(dataDir, { recursive: true });
  let records = [];
  try {
    const raw = await fs.readFile(checkoutFile, "utf8");
    const parsed = JSON.parse(raw);
    const existing = Array.isArray(parsed) ? parsed : [parsed];
    records = existing.map(compactCheckoutRecord).filter((item) => item !== null);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new CheckoutError(
        `Gagal membaca ${checkoutFile}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  const compactRecord = compactCheckoutRecord(record);
  if (!compactRecord) {
    throw new CheckoutError("Data checkout tidak valid.");
  }
  records.push(compactRecord);
  await fs.writeFile(
    checkoutFile,
    `${JSON.stringify(records, null, 2)}
`,
    "utf8"
  );
}
function parseMiniAppLink(link) {
  const url = new URL(link);
  if (!["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) {
    throw new CheckoutError(
      "TELEGRAM_MINIAPP_LINK harus berupa link t.me/<bot>/<short_name>."
    );
  }
  const [botUsername, shortName] = url.pathname.split("/").filter(Boolean);
  if (!botUsername || !shortName) {
    throw new CheckoutError("Link Mini App tidak memiliki bot/short name.");
  }
  return {
    botUsername: botUsername.replace(/^@/, ""),
    shortName,
    startParam: url.searchParams.get("startapp") ?? void 0
  };
}
function isTrustedProductUrl(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "id.shp.ee" || host.endsWith(".shopee.co.id") || host === "shopee.co.id" || host.endsWith(".shopee.com") || host === "shope.ee");
  } catch {
    return false;
  }
}
function decodeQrisBase64(base64) {
  const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, "").replace(/\s/g, "");
  if (!cleanBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 === 1) {
    throw new CheckoutError("Data Base64 QRIS tidak valid.");
  }
  const imageBuffer = Buffer.from(cleanBase64, "base64");
  const pngSignature = Buffer.from([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10
  ]);
  if (imageBuffer.length < 8 || !imageBuffer.subarray(0, 8).equals(pngSignature)) {
    throw new CheckoutError("Data QRIS bukan gambar PNG yang valid.");
  }
  return imageBuffer;
}
async function saveQrisImage(base64, orderId) {
  const imageBuffer = decodeQrisBase64(base64);
  await fs.mkdir(qrisDir, { recursive: true });
  const safeOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `qris_${safeOrderId || Date.now()}.png`;
  const outputPath = path.join(qrisDir, filename);
  await fs.writeFile(outputPath, imageBuffer);
  return { imageBuffer, outputPath };
}
function scanQris(imageBuffer) {
  let png;
  try {
    png = PNG.sync.read(imageBuffer);
  } catch (error) {
    throw new CheckoutError(
      `Gagal membaca gambar PNG: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const result = jsQR(
    new Uint8ClampedArray(
      png.data.buffer,
      png.data.byteOffset,
      png.data.byteLength
    ),
    png.width,
    png.height,
    {
      inversionAttempts: "attemptBoth"
    }
  );
  if (!result) {
    throw new CheckoutError(
      "QRIS gagal dipindai. Gambar tidak menghasilkan QR yang terbaca."
    );
  }
  return result.data;
}
async function loadCheckoutPreferences() {
  try {
    const parsed = JSON.parse(await fs.readFile(checkoutPreferencesFile, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const quantity = Number(parsed.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
    return {
      quantity,
      productUrl: asString(parsed.productUrl),
      variantId: asString(parsed.variantId),
      variantName: asString(parsed.variantName),
      shippingChannelId: Number(parsed.shippingChannelId),
      shippingName: asString(parsed.shippingName),
    };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new CheckoutError(`Gagal membaca pilihan checkout sebelumnya: ${error.message}`);
  }
}
async function saveCheckoutPreferences(preferences) {
  await fs.mkdir(dataDir, { recursive: true });
  const temporaryPath = `${checkoutPreferencesFile}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(preferences, null, 2)}\n`, "utf8");
  try {
    await fs.rename(temporaryPath, checkoutPreferencesFile);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}
async function launchMiniApp(client) {
  const appLink = process.env.TELEGRAM_MINIAPP_LINK || "https://t.me/Shopee8DevsBot/checkout";
  const { botUsername, shortName, startParam } = parseMiniAppLink(appLink);
  const bot = await client.getEntity(botUsername);
  if (!(bot instanceof Api.User) || bot.accessHash === void 0) {
    throw new CheckoutError("Telegram tidak menemukan bot Mini App.");
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
    throw new CheckoutError("Metadata Mini App tidak berhasil diperoleh.");
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
    throw new CheckoutError("Telegram tidak mengembalikan URL Mini App.");
  }
  const channel = process.env.PLAYWRIGHT_CHANNEL?.trim();
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();
  const browser = await chromium.launch({
    headless: true,
    ...channel ? { channel } : {},
    ...executablePath ? { executablePath } : {}
  });
  try {
    const page = await browser.newPage();
    await page.goto(webView.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const w = window;
        return Boolean(
          w.Telegram?.WebApp?.initData && typeof w.getSecureHeaders === "function"
        );
      },
      null,
      { timeout: 3e4 }
    );
    return { browser, page };
  } catch (error) {
    await browser.close().catch(() => void 0);
    throw error;
  }
}
async function callApi(page, action, cookie, fields = {}) {
  const result = await page.evaluate(
    async ({ actionName, cookieValue, extraFields }) => {
      const w = window;
      const initData = w.Telegram?.WebApp?.initData ?? "";
      if (!initData) {
        throw new Error("Telegram initData tidak tersedia.");
      }
      if (typeof w.getSecureHeaders !== "function") {
        throw new Error("getSecureHeaders tidak tersedia di Mini App.");
      }
      const body = new URLSearchParams({
        initData,
        action: actionName,
        cookie_val: cookieValue,
        ...extraFields
      });
      const response = await fetch("api.php", {
        method: "POST",
        headers: w.getSecureHeaders(actionName),
        body: body.toString()
      });
      const raw = await response.text();
      let payload2;
      try {
        payload2 = JSON.parse(raw);
      } catch {
        payload2 = { message: raw || "Respons API bukan JSON." };
      }
      return {
        httpStatus: response.status,
        payload: payload2
      };
    },
    {
      actionName: action,
      cookieValue: cookie,
      extraFields: fields
    }
  );
  const payload = asRecord(result.payload);
  if (result.httpStatus < 200 || result.httpStatus >= 300) {
    throw new CheckoutError(
      `${action}: HTTP ${result.httpStatus} \u2014 ${asString(payload.message) || "request gagal"}`
    );
  }
  if (payload.status === "error" || payload.status === "failed") {
    throw new CheckoutError(
      `${action}: ${asString(payload.message ?? payload.error) || "API mengembalikan error."}`
    );
  }
  return result;
}
function formatRupiahFromApi(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "Tidak diketahui";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount / 1e5);
}
async function runCheckout(ctx, cookie, productUrl, backupCookie, quantity, previousPreferences) {
  let browser;
  try {
    const launched = await launchMiniApp(ctx.client);
    browser = launched.browser;
    const { page } = launched;
    const customSzEnv = process.env.CUSTOM_SZ?.trim() ?? "1nol+NHMCzPR2PHLCei4pg==|GIJBJrJicrOmbT0EvOZW9RCbi1/cL8mUoO/0m8j21n4aQDaZ5TpJ34/xSsfl9wZWxyTcYA9eyVraZAFpCmSpbQ==|rTuL2QSgk7SbtaJo|08|2";
    await ctx.prompt.update("⏳ Memvalidasi cookie checkout...");
    const validationResult = await callApi(
      page,
      "validate_cookie",
      cookie
    );
    const validation = asRecord(validationResult.payload);
    if (validation.status !== "success") {
      throw new CheckoutError(
        "Cookie tidak valid atau akun tidak dapat divalidasi."
      );
    }
    const username = asString(validation.username);
    const phone = asString(validation.phone ?? validation.nomor_hp);
    const customSz = asString(validation.custom_sz) || customSzEnv;
    if (!username) {
      throw new CheckoutError(
        "Username tidak ditemukan dari validasi cookie."
      );
    }
    await ctx.prompt.update(`✅ Akun ditemukan: ${username}\n⏳ Mengambil detail produk...`);
    const productResult = await callApi(page, "fetch_product", cookie, {
      product_url: productUrl,
      backup_cookie: backupCookie || cookie,
      mode: "normal"
    });
    const product = asRecord(productResult.payload);
    if (product.status !== "success") {
      throw new CheckoutError(
        "Gagal mengambil produk dari URL tersebut."
      );
    }
    const shopId = asString(product.shop_id);
    const itemId = asString(product.item_id);
    const productName = asString(product.product_name);
    const variants = Array.isArray(product.variants) ? product.variants.map(asRecord) : [];
    if (!shopId || !itemId || variants.length === 0) {
      throw new CheckoutError(
        "Respons produk tidak memiliki shop_id/item_id/variants."
      );
    }
    let variant = variants.find((item) => asString(item.id) === previousPreferences?.variantId);
    if (!variant) {
      const selectedVariantId = await ctx.prompt.select(
        `Pilih variasi untuk ${productName || "produk ini"}:`,
        variants.map((item) => ({
          label: `${asString(item.name) || "Varian"} · ${formatRupiahFromApi(item.price)} · stok ${asString(item.stock) || "?"}`,
          value: asString(item.id),
        })),
      );
      variant = variants.find((item) => asString(item.id) === selectedVariantId);
    }
    if (!variant) throw new CheckoutError("Varian yang dipilih tidak tersedia.");
    const variantId = Number(variant.id);
    if (!Number.isFinite(variantId)) {
      throw new CheckoutError("ID varian tidak valid.");
    }
    const stock = Number(variant.stock);
    if (Number.isFinite(stock) && stock > 0 && quantity > stock) {
      throw new CheckoutError(
        `Jumlah ${quantity} melebihi stok ${stock}.`
      );
    }
    const cartItem = {
      shopId,
      itemId,
      productName,
      variantId,
      variantName: asString(variant.name) || "Default",
      price: Number(variant.price ?? 0),
      stock: Number.isFinite(stock) ? stock : 0,
      qty: quantity,
      image: asString(product.image),
      shopName: asString(product.shop_name),
      isFlashSale: Boolean(variant.is_flashsale),
      flashsale_price: asString(variant.flashsale_price),
      flashsale_price_estimate: asString(
        variant.flashsale_price_estimate
      ),
      flashsale_stock: Number(variant.flashsale_stock ?? 0)
    };
    const emptyObject = JSON.stringify({});
    const baseCheckoutFields = {
      cart_items: JSON.stringify([cartItem]),
      shipping_prefs: emptyObject,
      insurance_prefs: emptyObject,
      buyer_remarks: emptyObject,
      payment_name: "Pilih metode pembayaran",
      seabank_item_id: "0",
      is_manual_voucher: "0",
      fsv_voucher: emptyObject,
      discount_voucher: emptyObject,
      custom_sz: customSz
    };
    await ctx.prompt.update(`✅ Variasi: ${cartItem.variantName}\n⏳ Memuat pilihan ongkir...`);
    await callApi(
      page,
      "process_checkout",
      cookie,
      baseCheckoutFields
    );
    const shippingResult = await callApi(
      page,
      "fetch_shipping_info",
      cookie,
      {
        item_id: itemId,
        shop_id: shopId
      }
    );
    const shippingPayload = asRecord(shippingResult.payload);
    const shippingInfos = Array.isArray(shippingPayload.shipping_infos) ? shippingPayload.shipping_infos.map(asRecord) : [];
    const availableShipping = shippingInfos.map((info) => {
      const channelInfo = asRecord(info.channel);
      const channelId = Number(channelInfo.channelid ?? info.channelid);
      const shippingName = asString(
        channelInfo.name ?? channelInfo.channel_name ?? channelInfo.channel_name_en ?? info.name ?? info.channel_name,
      ) || `Ongkir ${channelId}`;
      const shippingFee = info.shipping_fee ?? info.shipping_fee_before_discount ?? channelInfo.shipping_fee;
      const feeLabel = shippingFee === undefined ? "" : ` · ${formatRupiahFromApi(shippingFee)}`;
      return { channelId, shippingName, feeLabel };
    }).filter((item) => Number.isFinite(item.channelId));
    if (availableShipping.length === 0) {
      throw new CheckoutError(
        "Metode pengiriman tidak ditemukan untuk produk ini."
      );
    }
    let selectedShipping = availableShipping.find(
      (item) => item.channelId === previousPreferences?.shippingChannelId,
    );
    if (!selectedShipping) {
      const selectedShippingId = await ctx.prompt.select(
        "Pilih metode pengiriman:",
        availableShipping.map((item) => ({
          label: `${item.shippingName}${item.feeLabel}`,
          value: String(item.channelId),
        })),
      );
      selectedShipping = availableShipping.find((item) => String(item.channelId) === selectedShippingId);
    }
    if (!selectedShipping) throw new CheckoutError("Metode pengiriman yang dipilih tidak tersedia.");
    const channelId = selectedShipping.channelId;
    const selectedPreferences = {
      quantity,
      productUrl,
      variantId: asString(variant.id),
      variantName: cartItem.variantName,
      shippingChannelId: channelId,
      shippingName: selectedShipping.shippingName,
    };
    const shippingFields = {
      ...baseCheckoutFields,
      shipping_prefs: JSON.stringify({ "0": channelId })
    };
    await callApi(
      page,
      "process_checkout",
      cookie,
      shippingFields
    );
    const paymentFields = {
      ...shippingFields,
      payment_name: "QRIS"
    };
    const paymentResult = await callApi(
      page,
      "process_checkout",
      cookie,
      paymentFields
    );
    const paymentPayload = asRecord(paymentResult.payload);
    let checkoutData = asRecord(paymentPayload.shopee_response);
    let deviceInfo = asRecord(paymentPayload.device_info);
    await callApi(page, "get_vouchers", cookie, {
      checkout_data: JSON.stringify(checkoutData)
    });
    const finalCheckoutResult = await callApi(
      page,
      "process_checkout",
      cookie,
      {
        ...paymentFields,
        is_manual_voucher: "1"
      }
    );
    const finalCheckoutPayload = asRecord(finalCheckoutResult.payload);
    checkoutData = asRecord(finalCheckoutPayload.shopee_response);
    deviceInfo = asRecord(finalCheckoutPayload.device_info);
    if (Object.keys(checkoutData).length === 0) {
      throw new CheckoutError(
        "Data checkout tidak dikembalikan API."
      );
    }
    if (checkoutData.can_checkout === false) {
      throw new CheckoutError(
        "Shopee menandai checkout ini tidak dapat dilanjutkan."
      );
    }
    const priceData = asRecord(checkoutData.checkout_price_data);
    await ctx.prompt.update(
      `🧾 Ringkasan checkout\nAkun: ${username}\nProduk: ${productName}\nVariasi: ${cartItem.variantName}\nQty: ${quantity}\nOngkir: ${selectedShipping.shippingName}\nPembayaran: QRIS\nTotal: ${formatRupiahFromApi(priceData.total_payable)}\n\n⏳ Membuat pesanan...`,
    );
    const placeResult = await callApi(page, "place_order", cookie, {
      checkout_data: JSON.stringify(checkoutData),
      device_info: JSON.stringify(deviceInfo),
      username,
      nomor_hp: phone,
      custom_sz: customSz
    });
    const placed = asRecord(placeResult.payload);
    if (placed.status !== "success") {
      throw new CheckoutError(
        `Pembuatan pesanan gagal: ${asString(placed.message ?? placed.error) || "respons tidak sukses."}`
      );
    }
    await ctx.prompt.update(`✅ Pesanan berhasil dibuat\nOrder ID: ${asString(placed.order_sn) || "-"}\n⏳ Menyimpan riwayat...`);
    let historySaveWarning = "";
    try {
      await saveCheckout({
        tanggal: formatJakartaDate(),
        username,
        place_order_response: {
          status: placed.status ?? "success",
          checkout_id: placed.checkout_id ?? null,
          order_sn: placed.order_sn ?? "",
          total_payable: placed.total_payable ?? null,
          payment_channel_id: placed.payment_channel_id ?? null,
          payment_name: placed.payment_name ?? "",
          va_number: placed.va_number ?? "-",
          bank_name: placed.bank_name ?? "",
          qr_code_base64: placed.qr_code_base64 ?? "",
          nmid: placed.nmid ?? ""
        }
      });
    } catch (error) {
      historySaveWarning = `\n⚠️ Riwayat checkout gagal disimpan: ${error instanceof Error ? error.message : String(error)}`;
    }
    let preferenceSaveWarning = "";
    try {
      await saveCheckoutPreferences(selectedPreferences);
    } catch (error) {
      preferenceSaveWarning = `\n⚠️ Pilihan checkout terakhir gagal disimpan: ${error instanceof Error ? error.message : String(error)}`;
    }
    const qrisBase64 = asString(placed.qr_code_base64);
    let qrisImage;
    let qrisWarning = "";
    if (qrisBase64) {
      try {
        const { imageBuffer } = await saveQrisImage(
          qrisBase64,
          asString(placed.order_sn)
        );
        qrisImage = imageBuffer;
        scanQris(imageBuffer);
      } catch (error) {
        qrisWarning = `\n⚠️ QRIS gagal diproses: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      qrisWarning = "\n⚠️ Respons pesanan tidak menyertakan gambar QRIS.";
    }
    const finalSummary = `✅ Pesanan berhasil dibuat\nOrder ID: ${asString(placed.order_sn) || "-"}\nUsername: ${username}\nProduk: ${productName}\nVariasi: ${cartItem.variantName}\nQty: ${quantity}\nOngkir: ${selectedShipping.shippingName}\nPembayaran: ${asString(placed.payment_name) || "QRIS"}\nTotal: ${formatRupiahFromApi(placed.total_payable)}\nStatus: Menunggu pembayaran.${historySaveWarning}${preferenceSaveWarning}${qrisWarning}`;
    await ctx.prompt.update(finalSummary);
    if (qrisImage && ctx.sendPhoto) {
      try {
        await ctx.sendPhoto(qrisImage, `QRIS Order ${asString(placed.order_sn) || ""}`);
      } catch (error) {
        await ctx.prompt.update(`${finalSummary}\n⚠️ QRIS berhasil dibuat, tetapi gambar gagal dikirim ke Telegram.`);
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => void 0);
    }
  }
}
const checkoutService = {
  name: "checkkout",
  commands: ["/checkkout"],
  async execute(ctx) {
    const cookie = asString(getConfig("CheckoutConfig.cookie")).trim();
    if (!cookie) {
      await ctx.prompt.update("❌ Cookie checkout belum diatur di `CheckoutConfig.cookie`.");
      return;
    }
    const productUrl = asString(getConfig("CheckoutConfig.url_product")).trim();
    if (!productUrl) {
      await ctx.prompt.update("❌ URL produk checkout belum diatur di `CheckoutConfig.url_product`.");
      return;
    }
    if (!isTrustedProductUrl(productUrl)) {
      await ctx.prompt.update("❌ URL produk tidak valid. Gunakan URL HTTPS dari domain Shopee.");
      return;
    }
    const backupCookie = "";
    let previousPreferences;
    let usePrevious = false;
    try {
      previousPreferences = await loadCheckoutPreferences();
      if (previousPreferences) {
        const productChanged = previousPreferences.productUrl && previousPreferences.productUrl !== productUrl;
        if (productChanged) {
          previousPreferences = { ...previousPreferences, variantId: "", shippingChannelId: Number.NaN };
        }
        const answer = await ctx.prompt.select(
          productChanged
            ? "URL produk berubah. Gunakan qty sebelumnya dan pilih ulang variasi serta ongkir?"
            : "Gunakan pilihan checkout sebelumnya?",
          [
            { label: "Gunakan config sebelumnya", value: "reuse" },
            { label: "Pilih ulang", value: "custom" },
          ],
        );
        usePrevious = answer === "reuse";
      }

      let quantity = usePrevious ? previousPreferences.quantity : null;
      while (quantity === null) {
        const answer = (await ctx.prompt.question("Masukkan jumlah produk (1–99, default 1): ")).trim();
        const parsed = answer ? Number(answer) : 1;
        if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 99) {
          quantity = parsed;
        } else {
          await ctx.prompt.update("❌ Jumlah harus berupa bilangan bulat dari 1 sampai 99.");
        }
      }
      await runCheckout(
        ctx,
        cookie,
        productUrl,
        backupCookie,
        quantity,
        usePrevious ? previousPreferences : null,
      );
    } catch (error) {
      if (error?.name === "PromptCancelledError") throw error;
      await ctx.prompt.update(`❌ Checkout gagal\n${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
var stdin_default = checkoutService;
export {
  stdin_default as default
};
