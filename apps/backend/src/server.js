import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./core/database/mongoose.js";
import { createSocketServer } from "./realtime/socket/index.js";

const startServer = async () => {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  createSocketServer(server);

  server.listen(env.port, () => {
    console.log(`Yopii backend running on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to bootstrap backend", error);
  process.exit(1);
});
