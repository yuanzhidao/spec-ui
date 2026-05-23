import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { createRuntimeApp } from "./app";
import { runtimeHost, runtimePort } from "./config";
import { runtimeState } from "./state";

async function main() {
  await runtimeState.initialize();

  const host = runtimeHost();
  const port = runtimePort();
  const app = createRuntimeApp();
  const websocketServer = new WebSocketServer({ noServer: true });

  serve(
    {
      fetch: app.fetch,
      hostname: host,
      port,
      websocket: {
        server: websocketServer,
      },
    },
    () => {
      console.log(`spec-ui runtime listening on http://${host}:${port}`);
    },
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

