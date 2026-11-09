import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const filePath = path.join(dataDir, "listorder.json");
async function saveOrder(order) {
  await fs.mkdir(dataDir, { recursive: true });
  let history = [];
  try {
    const contents = await fs.readFile(filePath, "utf-8");
    const savedData = JSON.parse(contents);
    history = Array.isArray(savedData) ? savedData : savedData === null || savedData === void 0 ? [] : [savedData];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  const orderRecord = order !== null && typeof order === "object" ? order : void 0;
  history.push({
    saved_at: (/* @__PURE__ */ new Date()).toISOString(),
    ...orderRecord?.order_id !== void 0 ? { order_id: orderRecord.order_id } : {},
    data: order
  });
  await fs.writeFile(filePath, `${JSON.stringify(history, null, 2)}
`, "utf-8");
}
export {
  saveOrder
};
