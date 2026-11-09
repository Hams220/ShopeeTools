import { readFileSync } from "node:fs";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const configPath = fileURLToPath(new URL("./config.json", import.meta.url));

async function readConfigFile() {
  return JSON.parse(await readFile(configPath, "utf-8"));
}

function findConfigValue(config, key) {
  if (Object.hasOwn(config, key)) return config[key];

  for (const value of Object.values(config)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const result = findConfigValue(value, key);
      if (result !== undefined) return result;
    }
  }

  return undefined;
}

/** Read a value from config/config.json using a dotted path or a direct key. */
export function getConfig(key) {
  const config = JSON.parse(
    readFileSync(new URL("./config.json", import.meta.url), "utf-8"),
  );

  const value = key.includes(".")
    ? key.split(".").reduce((current, part) => {
        if (!current || typeof current !== "object" || Array.isArray(current)) {
          return undefined;
        }
        return current[part];
      }, config)
    : findConfigValue(config, key);

  return value;
}

/** List editable primitive properties from a supported config section. */
export async function listConfigEntries(section) {
  if (!["CheckoutConfig", "dealsConfig"].includes(section)) {
    throw new Error("Bagian konfigurasi tidak didukung.");
  }
  const config = await readConfigFile();
  const values = config[section];
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error(`Bagian ${section} tidak ditemukan di config/config.json.`);
  }
  return Object.entries(values)
    .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => ({ key, value }));
}

/** Persist a supported config property using an atomic file replacement. */
export async function updateConfigValue(section, key, input) {
  if (!["CheckoutConfig", "dealsConfig"].includes(section)) {
    throw new Error("Bagian konfigurasi tidak didukung.");
  }
  if (typeof input !== "string" || !input.trim() || /[\r\n]/.test(input)) {
    throw new Error("Nilai konfigurasi tidak boleh kosong atau berisi baris baru.");
  }

  const value = input.trim();
  if (key.toLowerCase().includes("url")) {
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error("Masukkan URL yang valid."); }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL harus menggunakan http atau https.");
    }
  }

  const config = await readConfigFile();
  const values = config[section];
  if (!values || typeof values !== "object" || Array.isArray(values) || !Object.hasOwn(values, key)) {
    throw new Error("Key konfigurasi tidak ditemukan.");
  }
  if (values[key] !== null && !["string", "number", "boolean"].includes(typeof values[key])) {
    throw new Error("Key tersebut bukan nilai konfigurasi yang dapat diedit.");
  }
  values[key] = value;

  const temporaryPath = `${configPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  try {
    await rename(temporaryPath, configPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
  return value;
}
