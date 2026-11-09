import { loadServices } from "./loader.js";
import { CommandRouter } from "./router.js";
async function createApp() {
  const services = await loadServices();
  const router = new CommandRouter(services);
  return {
    commands: router.listCommands(),
    async dispatch(input, ctx) {
      return router.dispatch(input, ctx);
    }
  };
}
export {
  createApp
};
