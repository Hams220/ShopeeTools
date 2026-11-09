const setConfigService = {
  name: "set-config",
  commands: ["/setconfig"],
  async execute(ctx) {
    await ctx.configEditor.start(ctx.userId, ctx.chatId);
  },
};

export default setConfigService;
