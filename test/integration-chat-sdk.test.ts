import { generateKeyPairSync, sign } from "node:crypto";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTelnyxAdapter } from "../src/factory";
import { inboundSMS, sampleWebhookPayload } from "./fixtures/webhook-payloads";

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function rawPublicKeyHex(pair: ReturnType<typeof generateKeyPairSync>): string {
  const spki = pair.publicKey.export({ type: "spki", format: "der" });
  return spki.subarray(-32).toString("hex");
}

function signedRequest(
  body: unknown,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
): Request {
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyString = JSON.stringify(body);
  const signature = sign(null, Buffer.from(`${timestamp}|${bodyString}`), privateKey).toString(
    "base64",
  );
  return new Request("http://example.com/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "telnyx-signature-ed25519": signature,
      "telnyx-timestamp": String(timestamp),
    },
    body: bodyString,
  });
}

describe("Chat SDK + TelnyxAdapter integration", () => {
  it("processes an inbound webhook through the full Chat pipeline and fires onNewMention", async () => {
    const pair = generateKeyPairSync("ed25519");
    const telnyx = createTelnyxAdapter({
      apiKey: "test-key",
      phoneNumber: "+15559876543",
      publicKey: rawPublicKeyHex(pair),
    });

    const chat = new Chat({
      adapters: { telnyx },
      state: createMemoryState(),
      userName: "test-bot",
      logger: "silent",
    });

    const mentionHandler = vi.fn(async (_thread, message) => {
      expect(message.text).toBe("Hello bot");
    });
    chat.onNewMention(mentionHandler);

    await chat.initialize();

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "msg-reply-1",
            from: { phone_number: "+15559876543" },
            to: [{ phone_number: "+15551234567" }],
            text: "ack",
            type: "SMS",
            direction: "outbound",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const res = await chat.webhooks.telnyx(
      signedRequest(sampleWebhookPayload({ text: "Hello bot" }), pair.privateKey),
    );

    expect(res.status).toBe(200);
    // Chat routes inbound SMS (direction:inbound + DM) through the mention handler
    // because the adapter marks all inbound-from-user messages with isMention: true.
    await vi.waitFor(() => expect(mentionHandler).toHaveBeenCalledOnce(), { timeout: 2000 });
  });

  it("uses chat.webhooks.telnyx under the adapter's `name` property", async () => {
    const telnyx = createTelnyxAdapter({
      apiKey: "test-key",
      phoneNumber: "+15559876543",
      // No publicKey → verification skipped, easier to test happy path
    });
    const chat = new Chat({
      adapters: { telnyx },
      state: createMemoryState(),
      userName: "test-bot",
      logger: "silent",
    });
    await chat.initialize();

    // Adapter is keyed by its name "telnyx" on the webhooks object
    expect(typeof chat.webhooks.telnyx).toBe("function");

    const res = await chat.webhooks.telnyx(
      new Request("http://example.com/webhook", {
        method: "POST",
        body: JSON.stringify(inboundSMS),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
