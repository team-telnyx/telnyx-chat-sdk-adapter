import { generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { TelnyxAdapter } from "../src/adapter";
import { createMockChat, mockLogger, sampleWebhookPayload } from "./fixtures/webhook-payloads";

function toHex(buf: Buffer): string {
  return buf.toString("hex");
}

function toBase64(buf: Buffer): string {
  return buf.toString("base64");
}

function makeSignedRequest(
  body: unknown,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
  timestampOverride?: number,
): Request {
  const now = timestampOverride ?? Math.floor(Date.now() / 1000);
  const bodyString = JSON.stringify(body);
  const message = Buffer.from(`${now}|${bodyString}`, "utf8");
  const signature = sign(null, message, privateKey);

  return new Request("http://example.com/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "telnyx-signature-ed25519": toBase64(signature),
      "telnyx-timestamp": String(now),
    },
    body: bodyString,
  });
}

describe("Ed25519 integration (real crypto)", () => {
  let publicKeyHex: string;
  let privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];

  beforeEach(() => {
    const pair = generateKeyPairSync("ed25519");
    privateKey = pair.privateKey;
    const rawPublicKey = pair.publicKey.export({ type: "spki", format: "der" });
    // SPKI DER for Ed25519 has a 12-byte prefix, then 32 bytes of raw key.
    publicKeyHex = toHex(rawPublicKey.subarray(-32));
  });

  it("accepts a correctly-signed webhook and calls processMessage", async () => {
    const adapter = new TelnyxAdapter({
      apiKey: "test-key",
      phoneNumber: "+15559876543",
      publicKey: publicKeyHex,
      logger: mockLogger,
    });
    const chat = createMockChat();
    await adapter.initialize(chat);

    const payload = sampleWebhookPayload({ text: "Hello from Telnyx" });
    const req = makeSignedRequest(payload, privateKey);

    const res = await adapter.handleWebhook(req);

    expect(res.status).toBe(200);
    expect(chat.processMessage).toHaveBeenCalledOnce();
  });

  it("rejects a tampered body with 401", async () => {
    const adapter = new TelnyxAdapter({
      apiKey: "test-key",
      phoneNumber: "+15559876543",
      publicKey: publicKeyHex,
      logger: mockLogger,
    });
    const chat = createMockChat();
    await adapter.initialize(chat);

    const originalPayload = sampleWebhookPayload({ text: "Original" });
    const req = makeSignedRequest(originalPayload, privateKey);

    // Swap the body with a tampered one while keeping the original signature.
    const tamperedPayload = sampleWebhookPayload({ text: "Tampered!" });
    const tampered = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(tamperedPayload),
    });

    const res = await adapter.handleWebhook(tampered);
    expect(res.status).toBe(401);
    expect(chat.processMessage).not.toHaveBeenCalled();
  });

  it("rejects a correctly-signed payload with a stale timestamp (>300s)", async () => {
    const adapter = new TelnyxAdapter({
      apiKey: "test-key",
      phoneNumber: "+15559876543",
      publicKey: publicKeyHex,
      logger: mockLogger,
    });
    const chat = createMockChat();
    await adapter.initialize(chat);

    const stale = Math.floor(Date.now() / 1000) - 600;
    const payload = sampleWebhookPayload({ text: "Stale" });
    const req = makeSignedRequest(payload, privateKey, stale);

    const res = await adapter.handleWebhook(req);
    expect(res.status).toBe(401);
    expect(chat.processMessage).not.toHaveBeenCalled();
  });

  it("rejects a signature from a different keypair with 401", async () => {
    const adapter = new TelnyxAdapter({
      apiKey: "test-key",
      phoneNumber: "+15559876543",
      publicKey: publicKeyHex,
      logger: mockLogger,
    });
    const chat = createMockChat();
    await adapter.initialize(chat);

    const imposter = generateKeyPairSync("ed25519").privateKey;
    const payload = sampleWebhookPayload({ text: "Fake" });
    const req = makeSignedRequest(payload, imposter);

    const res = await adapter.handleWebhook(req);
    expect(res.status).toBe(401);
    expect(chat.processMessage).not.toHaveBeenCalled();
  });
});
