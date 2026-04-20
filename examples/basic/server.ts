// Minimal Telnyx SMS bot example.
//
// Required env vars:
//   TELNYX_API_KEY       - Telnyx API key (https://portal.telnyx.com/#/app/api-keys)
//   TELNYX_FROM_NUMBER   - E.164 number assigned to your messaging profile, e.g. +15551234567
//   TELNYX_PUBLIC_KEY    - Ed25519 public key (hex) from the messaging profile's security settings
// Optional:
//   TELNYX_MESSAGING_PROFILE_ID - recommended; enables per-profile analytics and spend limits
//   BOT_USERNAME         - display name for the bot (defaults to "bot")
//   PORT                 - HTTP port (defaults to 3000)

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createTelnyxAdapter } from "@telnyx/chat-sdk-adapter";
import { Chat } from "chat";

// Load .env manually (no dotenv dep)
try {
  const env = readFileSync(".env", "utf-8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // no .env file — rely on env vars
}

const telnyx = createTelnyxAdapter({
  messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID,
});

const chat = new Chat({
  userName: process.env.BOT_USERNAME ?? "sms-bot",
  adapters: { telnyx },
  state: createMemoryState(),
});

// New inbound SMS — echo it back and subscribe so follow-ups route here too.
chat.onNewMention(async (thread, message) => {
  console.log(`[new mention] from=${message.author.userId} text="${message.text}"`);
  await thread.subscribe();
  await thread.post(`Echo: ${message.text}`);
});

// Follow-up SMS in a subscribed thread.
chat.onSubscribedMessage(async (thread, message) => {
  console.log(`[subscribed] from=${message.author.userId} text="${message.text}"`);
  await thread.post(`Echo: ${message.text}`);
});

await chat.initialize();

const port = Number(process.env.PORT) || 3000;

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("telnyx adapter example is running");
    return;
  }

  if (req.method === "POST" && req.url === "/webhook") {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const body = Buffer.concat(chunks).toString();

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
      }

      const webRequest = new Request(`http://localhost:${port}${req.url}`, {
        method: "POST",
        headers,
        body,
      });

      const result = await telnyx.handleWebhook(webRequest);
      const resultBody = await result.text();
      console.log(`[webhook] ${result.status} ${resultBody}`);
      res.writeHead(result.status, { "Content-Type": "text/plain" });
      res.end(resultBody);
    } catch (err) {
      console.error("[webhook error]", (err as Error).stack || err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
  console.log(`Webhook URL: http://localhost:${port}/webhook`);
  console.log(`From: ${process.env.TELNYX_FROM_NUMBER}`);
});
