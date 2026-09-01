import { startServer } from "./server.js";

startServer().catch((error) => {
  console.error("[api] failed to start", error);
  process.exit(1);
});
