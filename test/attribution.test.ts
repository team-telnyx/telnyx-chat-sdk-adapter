import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelnyxAdapter } from "../src/adapter";
import {
  ADAPTER_NAME,
  ADAPTER_VERSION,
  ATTRIBUTION_TAGS,
  buildTags,
  USER_AGENT,
} from "../src/attribution";
import { createMockChat, mockLogger } from "./fixtures/webhook-payloads";

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function successResponse() {
  return new Response(
    JSON.stringify({
      data: {
        id: "msg-attr",
        from: { phone_number: "+15559876543" },
        to: [{ phone_number: "+15551234567" }],
        text: "hi",
        type: "SMS",
        direction: "outbound",
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("attribution", () => {
  describe("constants", () => {
    it("exposes the expected adapter name", () => {
      expect(ADAPTER_NAME).toBe("@telnyx/chat-sdk-adapter");
    });

    it("exposes the adapter version as a semver string", () => {
      expect(ADAPTER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("builds the expected User-Agent string", () => {
      expect(USER_AGENT).toBe(`@telnyx/chat-sdk-adapter/${ADAPTER_VERSION} (vercel-chat-sdk)`);
    });

    it("defines the attribution tags", () => {
      expect([...ATTRIBUTION_TAGS]).toEqual([
        "vercel-chat-sdk",
        `vercel-chat-sdk:${ADAPTER_VERSION}`,
      ]);
    });
  });

  describe("buildTags", () => {
    it("returns only attribution tags when no user tags and attribution enabled", () => {
      expect(buildTags([], false)).toEqual([
        "vercel-chat-sdk",
        `vercel-chat-sdk:${ADAPTER_VERSION}`,
      ]);
    });

    it("returns empty array when attribution disabled and no user tags", () => {
      expect(buildTags(undefined, true)).toEqual([]);
    });

    it("returns only user tags when attribution disabled", () => {
      expect(buildTags(["x"], true)).toEqual(["x"]);
    });

    it("merges attribution tags with user tags", () => {
      expect(buildTags(["customer-123", "prod"], false)).toEqual([
        "vercel-chat-sdk",
        `vercel-chat-sdk:${ADAPTER_VERSION}`,
        "customer-123",
        "prod",
      ]);
    });
  });

  describe("postMessage tag behavior", () => {
    it("includes default attribution tags in outbound body", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      mockFetch.mockResolvedValueOnce(successResponse());

      await adapter.postMessage("telnyx:+15559876543:+15551234567", "hi");

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.tags).toEqual(["vercel-chat-sdk", `vercel-chat-sdk:${ADAPTER_VERSION}`]);
    });

    it("merges extraTags with default attribution tags", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        extraTags: ["customer-123", "prod"],
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      mockFetch.mockResolvedValueOnce(successResponse());

      await adapter.postMessage("telnyx:+15559876543:+15551234567", "hi");

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.tags).toEqual([
        "vercel-chat-sdk",
        `vercel-chat-sdk:${ADAPTER_VERSION}`,
        "customer-123",
        "prod",
      ]);
    });

    it("sends only user tags when attribution is disabled", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        extraTags: ["customer-123"],
        disableAttributionTags: true,
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      mockFetch.mockResolvedValueOnce(successResponse());

      await adapter.postMessage("telnyx:+15559876543:+15551234567", "hi");

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.tags).toEqual(["customer-123"]);
    });

    it("omits tags field entirely when attribution disabled and no user tags", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        disableAttributionTags: true,
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      mockFetch.mockResolvedValueOnce(successResponse());

      await adapter.postMessage("telnyx:+15559876543:+15551234567", "hi");

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect("tags" in body).toBe(false);
    });
  });

  describe("User-Agent header", () => {
    it("sends User-Agent on every outbound request", async () => {
      const adapter = new TelnyxAdapter({
        apiKey: "test-key",
        phoneNumber: "+15559876543",
        logger: mockLogger,
      });
      const chat = createMockChat();
      await adapter.initialize(chat);

      mockFetch.mockResolvedValueOnce(successResponse());

      await adapter.postMessage("telnyx:+15559876543:+15551234567", "hi");

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.telnyx.com/v2/messages");

      const headers = new Headers(init?.headers as HeadersInit | undefined);
      expect(headers.get("user-agent")).toBe(
        `@telnyx/chat-sdk-adapter/${ADAPTER_VERSION} (vercel-chat-sdk)`,
      );
    });
  });
});
