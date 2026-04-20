import type { ChatInstance, Logger } from "chat";
import { vi } from "vitest";
import type { TelnyxWebhookPayload } from "../../src/types";

export const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

export function createMockChat(options?: { userName?: string }): ChatInstance {
  return {
    getLogger: vi.fn().mockReturnValue(mockLogger),
    getState: vi.fn(),
    getUserName: vi.fn().mockReturnValue(options?.userName ?? "mybot"),
    handleIncomingMessage: vi.fn().mockResolvedValue(undefined),
    processMessage: vi.fn(),
    processReaction: vi.fn(),
    processAction: vi.fn(),
    processModalClose: vi.fn(),
    processModalSubmit: vi.fn().mockResolvedValue(undefined),
    processSlashCommand: vi.fn(),
    processAssistantThreadStarted: vi.fn(),
    processAssistantContextChanged: vi.fn(),
    processAppHomeOpened: vi.fn(),
    processMemberJoinedChannel: vi.fn(),
  } as unknown as ChatInstance;
}

export function sampleWebhookPayload(
  overrides?: Partial<TelnyxWebhookPayload["data"]["payload"]>,
): TelnyxWebhookPayload {
  return {
    data: {
      event_type: "message.received",
      id: "evt-123",
      occurred_at: "2025-01-01T00:00:00Z",
      record_type: "event",
      payload: {
        direction: "inbound",
        from: { phone_number: "+15551234567" },
        to: [{ phone_number: "+15559876543" }],
        text: "Hello",
        type: "SMS",
        id: "msg-123",
        ...overrides,
      },
    },
    meta: {
      attempt: 1,
      delivered_to: "https://example.com/webhook",
    },
  };
}

export const inboundSMS: TelnyxWebhookPayload = sampleWebhookPayload();

export const inboundMMS: TelnyxWebhookPayload = sampleWebhookPayload({
  type: "MMS",
  text: "Check this out",
  media: [
    {
      content_type: "image/jpeg",
      url: "https://example.com/image.jpg",
      size: 1024,
    },
  ],
});

export const outboundConfirmation: TelnyxWebhookPayload = {
  data: {
    event_type: "message.sent",
    id: "evt-456",
    occurred_at: "2025-01-01T00:00:00Z",
    record_type: "event",
    payload: {
      direction: "outbound",
      from: { phone_number: "+15559876543" },
      to: [{ phone_number: "+15551234567" }],
      text: "Sent",
      type: "SMS",
      id: "msg-456",
    },
  },
  meta: {
    attempt: 1,
    delivered_to: "https://example.com/webhook",
  },
};
