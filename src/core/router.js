class CommandRouter {
  routes = /* @__PURE__ */ new Map();
  constructor(services) {
    for (const service of services) {
      for (const command of service.commands) {
        this.routes.set(command.trim().toLowerCase(), service);
      }
    }
  }
  listCommands() {
    return [...this.routes.keys()].sort();
  }
  async dispatch(input, ctx) {
    const command = input.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
    const service = this.routes.get(command);
    if (!service) return false;
    try {
      ctx.logger.info(`Menjalankan ${command} (${service.name})...`);
      await service.execute(ctx, command);
    } catch (error) {
      ctx.logger.error(`[${service.name}] ${error instanceof Error ? error.message : String(error)}`);
    }
    return true;
  }
}
export {
  CommandRouter
};
