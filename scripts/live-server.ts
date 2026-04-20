import { createServer } from "node:http";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";
import { createTelnyxAdapter } from "../src/factory";

const FROM = process.env.TELNYX_FROM_NUMBER ?? "+12056348076";
const PROFILE = process.env.TELNYX_PROFILE_ID ?? "40019dac-b5b6-4851-ab60-fae35acc7218";
const PUBLIC_KEY = process.env.TELNYX_PUBLIC_KEY ?? "vFo7HklfxvOg1ZGaqxqYDtmyZhfsl5IQLR6t3JhDtaU=";
const PORT = Number(process.env.PORT ?? 3100);

const telnyx = createTelnyxAdapter({
  phoneNumber: FROM,
  messagingProfileId: PROFILE,
  publicKey: PUBLIC_KEY,
});

const chat = new Chat({
  adapters: { telnyx },
  state: createMemoryState(),
  userName: "chat-sdk-e2e",
  logger: "info",
});

chat.onNewMention(async (thread, message) => {
  console.log("[MENTION]", { threadId: thread.id, text: message.text, from: message.author });
  try {
    await thread.subscribe();
    await thread.post(`Got it — E2E handler fired on "${message.text.slice(0, 40)}"`);
  } catch (e) {
    console.error("[MENTION_POST_ERR]", (e as Error).message);
  }
});

chat.onSubscribedMessage(async (thread, message) => {
  console.log("[SUBSCRIBED]", { threadId: thread.id, text: message.text });
});

await chat.initialize();

console.log(`[READY] listening on :${PORT}`);
console.log(`        FROM=${FROM} PROFILE=${PROFILE}`);

const server = createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404).end("not found");
    return;
  }

  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const rawBody = Buffer.concat(chunks).toString("utf8");
    const headerLog: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (k.startsWith("telnyx-") || k === "content-type" || k === "user-agent") {
        headerLog[k] = String(v);
      }
    }
    console.log("\n[WEBHOOK RECEIVED]");
    console.log("  headers:", JSON.stringify(headerLog));
    try {
      const parsed = JSON.parse(rawBody);
      console.log("  event_type:", parsed.data?.event_type);
      console.log("  direction:", parsed.data?.payload?.direction);
      console.log("  tags in payload:", JSON.stringify(parsed.data?.payload?.tags));
      console.log("  FULL PAYLOAD BODY:");
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log("  raw body (non-json):", rawBody);
    }

    const request = new Request(`http://localhost${req.url}`, {
      method: "POST",
      headers: req.headers as HeadersInit,
      body: rawBody,
    });
    const response = await chat.webhooks.telnyx(request);
    const respText = await response.text();
    console.log(`  adapter response: ${response.status} ${respText}`);
    res.writeHead(response.status, Object.fromEntries(response.headers)).end(respText);
  });
});

server.listen(PORT);
