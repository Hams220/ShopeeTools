import "dotenv/config";
import { Api } from "teleproto";
import { chromium } from "playwright";

const DEFAULT_MINIAPP_LINK = "https://t.me/Shopee8DevsBot/checkout";

class CancelOrderError extends Error {
  constructor(message) {
    super(message);
    this.name = "CancelOrderError";
  }
}

function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function getRequestAction(request) {
  const postData = request.postData() || "";
  try {
    const parsed = JSON.parse(postData);
    if (typeof parsed?.action === "string") return parsed.action;
  } catch {
    const action = new URLSearchParams(postData).get("action");
    if (action) return action;
  }
  try { return new URL(request.url()).searchParams.get("action"); }
  catch { return null; }
}

function isApiAction(response, host, action) {
  try {
    return new URL(response.url()).hostname.toLowerCase() === host &&
      getRequestAction(response.request()) === action;
  } catch {
    return false;
  }
}

function normalizeHost(value) {
  const input = String(value ?? "").trim();
  if (!input) throw new CancelOrderError("API_HOST kosong.");
  try { return new URL(input.includes("://") ? input : `https://${input}`).hostname.toLowerCase(); }
  catch { throw new CancelOrderError("API_HOST tidak valid."); }
}

function parseMiniAppLink(link) {
  let url;
  try { url = new URL(link); }
  catch { throw new CancelOrderError("TELEGRAM_MINIAPP_LINK tidak valid."); }
  if (!["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) {
    throw new CancelOrderError("TELEGRAM_MINIAPP_LINK harus berupa link t.me.");
  }
  const [botUsername, shortName] = url.pathname.split("/").filter(Boolean);
  if (!botUsername || !shortName) throw new CancelOrderError("Link Mini App tidak lengkap.");
  return { botUsername: botUsername.replace(/^@/, ""), shortName, startParam: url.searchParams.get("startapp") ?? undefined };
}

async function launchMiniApp(client, page, apiHost) {
  const link = process.env.TELEGRAM_MINIAPP_LINK?.trim() || DEFAULT_MINIAPP_LINK;
  const { botUsername, shortName, startParam } = parseMiniAppLink(link);
  const bot = await client.getEntity(botUsername);
  if (!(bot instanceof Api.User) || bot.accessHash === undefined) {
    throw new CancelOrderError("Telegram tidak berhasil menemukan bot Mini App.");
  }
  const botUser = new Api.InputUser({ userId: bot.id, accessHash: bot.accessHash });
  const botPeer = new Api.InputPeerUser({ userId: bot.id, accessHash: bot.accessHash });
  const appInfo = await client.api.messages.getBotApp({
    app: new Api.InputBotAppShortName({ botId: botUser, shortName }),
    hash: 0,
  });
  if (!(appInfo instanceof Api.messages.BotApp) || !(appInfo.app instanceof Api.BotApp)) {
    throw new CancelOrderError("Metadata Mini App tidak ditemukan.");
  }
  const webView = await client.api.messages.requestAppWebView({
    peer: botPeer,
    app: new Api.InputBotAppID({ id: appInfo.app.id, accessHash: appInfo.app.accessHash }),
    startParam,
    platform: "web",
  });
  if (!webView?.url || typeof webView.url !== "string") {
    throw new CancelOrderError("Telegram tidak memberikan URL Mini App.");
  }
  const loadUi = page.waitForResponse((response) => isApiAction(response, apiHost, "load_ui"), { timeout: 45_000 });
  const [, loadUiResponse] = await Promise.all([page.goto(webView.url, { waitUntil: "domcontentloaded" }), loadUi]);
  if (!loadUiResponse.ok()) throw new CancelOrderError(`load_ui gagal (HTTP ${loadUiResponse.status()}).`);
  await page.waitForFunction(
    () => Boolean(window.Telegram?.WebApp?.initData && typeof window.getSecureHeaders === "function"),
    null,
    { timeout: 20_000 },
  );
}

async function requestMiniAppApi(page, apiHost, action, fields = {}) {
  const result = await page.evaluate(async ({ apiUrl, requestAction, requestFields }) => {
    const initData = window.Telegram?.WebApp?.initData || "";
    const getSecureHeaders = window.getSecureHeaders;
    if (!initData || typeof getSecureHeaders !== "function") {
      throw new Error("Data autentikasi Mini App tidak tersedia.");
    }
    const body = new URLSearchParams({ initData, action: requestAction, ...requestFields });
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: getSecureHeaders(requestAction),
      body: body.toString(),
    });
    const text = await response.text();
    let payload;
    try {
      const losslessText = text.replace(/("order_id"\s*:\s*)(\d+)(?=\s*[,}])/g, '$1"$2"');
      payload = JSON.parse(losslessText);
    }
    catch { payload = { message: text || "Respons API bukan JSON." }; }
    return { httpStatus: response.status, payload };
  }, {
    apiUrl: `https://${apiHost}/api.php`,
    requestAction: action,
    requestFields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)])),
  });
  return result;
}

function apiError(result, action) {
  const payload = asRecord(result.payload);
  return result.httpStatus < 200 || result.httpStatus >= 300 ||
    String(payload.status ?? "").toLowerCase() !== "success";
}

function getApiMessage(payload, fallback) {
  const root = asRecord(payload);
  const ordersData = asRecord(root.orders_data);
  const nestedData = asRecord(asRecord(root.data).data);
  return asString(root.message ?? root.error ?? root.msg ?? ordersData.error_msg ?? nestedData.message ?? nestedData.error) || fallback;
}

function findOrderCollection(value, depth = 0) {
  if (depth > 8 || !value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    if (value.some((item) => {
      const row = asRecord(item);
      return Object.hasOwn(row, "order_list_detail") || Object.hasOwn(row, "order_detail") ||
        (Object.hasOwn(row, "info_card") && Object.hasOwn(row, "status"));
    })) return value;
    for (const item of value) {
      const nested = findOrderCollection(item, depth + 1);
      if (nested) return nested;
    }
    return undefined;
  }
  if (Object.hasOwn(value, "order_or_checkout_data")) {
    const rows = value.order_or_checkout_data;
    if (Array.isArray(rows)) return rows;
    const nested = findOrderCollection(rows, depth + 1);
    if (nested) return nested;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === "order_or_checkout_data") continue;
    const nested = findOrderCollection(item, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

function findNextOffset(value, depth = 0) {
  if (depth > 8 || !value || typeof value !== "object") return undefined;
  if (!Array.isArray(value) && Object.hasOwn(value, "next_offset")) return Number(value.next_offset);
  for (const item of Array.isArray(value) ? value : Object.values(value)) {
    const nested = findNextOffset(item, depth + 1);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

async function getAccounts(page, apiHost) {
  const result = await requestMiniAppApi(page, apiHost, "get_order_accounts");
  if (apiError(result, "get_order_accounts")) {
    throw new CancelOrderError(getApiMessage(result.payload, `get_order_accounts gagal (HTTP ${result.httpStatus}).`));
  }
  const accounts = Array.isArray(asRecord(result.payload).accounts) ? result.payload.accounts : [];
  const usernames = [...new Set(accounts.map((account) => asString(asRecord(account).username).trim()).filter(Boolean))];
  return usernames;
}

async function getLabelToShipOrders(page, apiHost, username) {
  const orders = new Map();
  const visitedOffsets = new Set();
  let offset = 0;
  let pageCount = 0;
  while (true) {
    if (pageCount++ >= 500) throw new CancelOrderError("Pagination pesanan melebihi batas aman 500 halaman.");
    if (visitedOffsets.has(offset)) throw new CancelOrderError("API mengulang offset saat mengambil pesanan.");
    visitedOffsets.add(offset);
    const result = await requestMiniAppApi(page, apiHost, "fetch_shopee_orders", {
      account_username: username,
      offset,
    });
    if (apiError(result, "fetch_shopee_orders")) {
      throw new CancelOrderError(getApiMessage(result.payload, `Gagal mengambil pesanan (HTTP ${result.httpStatus}).`));
    }
    const ordersData = asRecord(asRecord(result.payload).orders_data);
    if (Number(ordersData.error ?? 0) !== 0) {
      throw new CancelOrderError(asString(ordersData.error_msg) || "API gagal mengambil daftar pesanan.");
    }
    const pageOrders = findOrderCollection(ordersData);
    const nextOffset = findNextOffset(ordersData);
    if (!pageOrders || pageOrders.length === 0) {
      if (Number.isFinite(nextOffset) && nextOffset > offset) {
        offset = nextOffset;
        continue;
      }
      break;
    }
    for (const row of pageOrders) {
      const record = asRecord(row);
      const detail = asRecord(record.order_list_detail ?? record.order_detail ?? record);
      const status = asString(asRecord(detail.status).list_view_status_label?.text);
      if (status !== "label_to_ship") continue;
      const info = asRecord(detail.info_card);
      const firstCard = Array.isArray(info.order_list_cards) ? asRecord(info.order_list_cards[0]) : {};
      const orderId = asString(info.order_id ?? firstCard.order_id).trim();
      if (orderId) orders.set(orderId, { orderId, username });
    }
    if (!Number.isFinite(nextOffset) || nextOffset <= offset) break;
    offset = nextOffset;
  }
  return [...orders.values()];
}

function formatProgress(username, orders, results, totalCount) {
  const succeeded = results.filter((item) => item.status === "success").length;
  const failed = results.filter((item) => item.status === "failed").length;
  const lines = [
    `⏳ Memproses cancel order — ${username}`,
    `Order ${results.length}/${totalCount} · ✅ ${succeeded} · ❌ ${failed}`,
    "",
    ...orders.map((order) => {
      const result = results.find((item) => item.orderId === order.orderId);
      if (!result) return `⏳ ${order.orderId}`;
      const detail = result.message?.replace(/[\r\n]+/g, " ");
      const icon = result.status === "success" ? "✅" : result.status === "failed" ? "❌" : "⏳";
      return `${icon} ${order.orderId}${detail ? ` — ${detail}` : ""}`;
    }),
  ];
  return lines.join("\n");
}

async function editOrReplace(ctx, messageId, text) {
  try {
    await ctx.editMessage(messageId, text);
    return messageId;
  } catch {
    const replacement = await ctx.notify(text);
    return replacement?.message_id ?? messageId;
  }
}

const cancelOrderService = {
  name: "cancel-order",
  commands: ["/cancelorder"],
  async execute(ctx) {
    let browser;
    try {
      await ctx.prompt.update("Mengambil list akun...");
      const apiHost = normalizeHost(process.env.API_HOST || "miniapp.bot-devs.com");
      const channel = process.env.PLAYWRIGHT_CHANNEL?.trim();
      const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();
      browser = await chromium.launch({
        headless: true,
        ...(channel ? { channel } : {}),
        ...(executablePath ? { executablePath } : {}),
      });
      const page = await browser.newPage();
      await launchMiniApp(ctx.client, page, apiHost);
      const usernames = await getAccounts(page, apiHost);
      if (usernames.length === 0) {
        await ctx.prompt.update("Tidak ada username yang tersedia untuk dipilih.");
        return;
      }
      const username = await ctx.prompt.select("Silakan pilih username akun:", usernames.map((name) => ({ label: name, value: name })));
      await ctx.prompt.update(`Username ${username} dipilih`);

      const loadingMessage = await ctx.notify("Mengambil semua data pesanan...");
      const orders = await getLabelToShipOrders(page, apiHost, username);
      await editOrReplace(ctx, loadingMessage?.message_id, `Data pesanan selesai diambil.\nUsername: ${username}\nStatus: label_to_ship\nJumlah: ${orders.length}`);
      if (orders.length === 0) return;

      const results = [];
      const chunkSize = 35;
      for (let startIndex = 0; startIndex < orders.length; startIndex += chunkSize) {
        const batch = orders.slice(startIndex, startIndex + chunkSize);
        const progressMessage = await ctx.notify(formatProgress(username, batch, results, orders.length));
        let progressMessageId = progressMessage?.message_id;
        for (const order of batch) {
          const resultIndex = results.push({ orderId: order.orderId, status: "processing", message: "Mengambil detail order" }) - 1;
          progressMessageId = await editOrReplace(
            ctx,
            progressMessageId,
            formatProgress(username, batch, results, orders.length),
          );
          try {
            const detailResult = await requestMiniAppApi(page, apiHost, "fetch_shopee_order_detail", {
              account_username: username,
              order_id: order.orderId,
              type: "order",
            });
            if (apiError(detailResult, "fetch_shopee_order_detail")) {
              results[resultIndex] = { orderId: order.orderId, status: "failed", message: `Detail gagal: ${getApiMessage(detailResult.payload, `HTTP ${detailResult.httpStatus}`).slice(0, 90)}` };
            } else {
              const detailPayload = asRecord(detailResult.payload);
              const orderDetail = asRecord(detailPayload.order_detail);
              const currentStatus = asString(asRecord(orderDetail.status).list_view_status_label?.text);
              if (!orderDetail.status || currentStatus !== "label_to_ship") {
                results[resultIndex] = {
                  orderId: order.orderId,
                  status: "failed",
                  message: `Status terbaru ${currentStatus || "tidak diketahui"}; dilewati`,
                };
              } else {
                results[resultIndex].message = "Detail OK; membatalkan";
                progressMessageId = await editOrReplace(
                  ctx,
                  progressMessageId,
                  formatProgress(username, batch, results, orders.length),
                );
                const cancelResult = await requestMiniAppApi(page, apiHost, "cancel_physical_order", {
                  account_username: username,
                  order_id: order.orderId,
                  type: "order",
                });
                if (apiError(cancelResult, "cancel_physical_order")) {
                  results[resultIndex] = { orderId: order.orderId, status: "failed", message: getApiMessage(cancelResult.payload, `HTTP ${cancelResult.httpStatus}`).slice(0, 120) };
                } else {
                  results[resultIndex] = { orderId: order.orderId, status: "success", message: "Berhasil dibatalkan" };
                }
              }
            }
          } catch (error) {
            results[resultIndex] = { orderId: order.orderId, status: "failed", message: (error instanceof Error ? error.message : String(error)).slice(0, 120) };
          }
          progressMessageId = await editOrReplace(
            ctx,
            progressMessageId,
            formatProgress(username, batch, results, orders.length),
          );
        }
      }
    } catch (error) {
      if (error?.name === "PromptCancelledError") throw error;
      await ctx.prompt.update(`❌ Cancel order gagal\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  },
};

export default cancelOrderService;
