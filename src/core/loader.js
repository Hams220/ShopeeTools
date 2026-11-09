import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
async function loadServices() {
  const servicesDir = resolve(process.cwd(), "src/services");
  const files = (await readdir(servicesDir, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(".js")).map((entry) => entry.name).sort();
  const services = [];
  const names = /* @__PURE__ */ new Set();
  const commands = /* @__PURE__ */ new Map();
  for (const file of files) {
    const moduleUrl = pathToFileURL(resolve(servicesDir, file)).href;
    const loaded = await import(moduleUrl);
    const candidate = loaded.default;
    if (!candidate || typeof candidate !== "object") {
      throw new Error(`Service ${file} harus memiliki default export berupa object.`);
    }
    const service = candidate;
    if (!service.name?.trim()) throw new Error(`Service ${file} tidak memiliki name.`);
    if (names.has(service.name)) throw new Error(`Nama service duplikat: ${service.name}`);
    if (!Array.isArray(service.commands) || service.commands.length === 0) {
      throw new Error(`Service ${service.name} harus memiliki minimal satu command.`);
    }
    if (typeof service.execute !== "function") {
      throw new Error(`Service ${service.name} tidak memiliki execute(ctx).`);
    }
    for (const rawCommand of service.commands) {
      const command = rawCommand.trim().toLowerCase();
      if (!command.startsWith("/")) throw new Error(`Command '${rawCommand}' harus diawali '/'.`);
      const owner = commands.get(command);
      if (owner) throw new Error(`Command ${command} bentrok antara service '${owner}' dan '${service.name}'.`);
      commands.set(command, service.name);
    }
    names.add(service.name);
    services.push(service);
  }
  return services;
}
export {
  loadServices
};
