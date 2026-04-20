import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelnyxAdapter } from "../src/adapter";
import { createMockChat, mockLogger, sampleWebhookPayload } from "./fixtures/webhook-payloads";

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TelnyxAdapter", () => {
  describe("handleWebhook", () => {
    it("processes message.received events", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      const payload = sampleWebhookPayload();
      const request = new Request("https://example.com/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
      });

      const response = await adapter.handleWebhook(request);
      expect(response.status).toBe(200);
      expect(chat.processMessage).toHaveBeenCalledOnce();
    });

    it("ignores non-message events", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      const payload = sampleWebhookPayload();
      payload.data.event_type = "message.sent";

      const request = new Request("https://example.com/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
      });

      const response = await adapter.handleWebhook(request);
      expect(response.status).toBe(200);
      expect(chat.processMessage).not.toHaveBeenCalled();
    });

    it("returns 401 for missing signature when publicKey configured", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        publicKey: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      const payload = sampleWebhookPayload();
      const request = new Request("https://example.com/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
      });

      const response = await adapter.handleWebhook(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 for stale timestamp", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        publicKey: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      const payload = sampleWebhookPayload();
      const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
      const request = new Request("https://example.com/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          "telnyx-signature-ed25519": "dGVzdA==",
          "telnyx-timestamp": staleTimestamp,
        },
      });

      const response = await adapter.handleWebhook(request);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Stale timestamp");
    });

    it("returns 400 for invalid JSON", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      const request = new Request("https://example.com/webhook", {
        method: "POST",
        body: "not json",
        headers: { "content-type": "application/json" },
      });

      const response = await adapter.handleWebhook(request);
      expect(response.status).toBe(400);
    });
  });
});
