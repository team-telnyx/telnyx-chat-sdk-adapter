# Sample Telnyx Webhook Payloads

These examples help debug adapter mapping and webhook ingestion. Field names match `TelnyxWebhookPayload` and `TelnyxMessagePayload` in `src/types.ts`. Phone numbers, IDs, and media URLs are illustrative only.

## Inbound SMS (`message.received`, text only)

A plain inbound text from a user to the bot's number. The adapter turns this into a `Message` with `isMention: true` and thread ID `telnyx:+15551234567:+15559876543`.

```json
{
  "data": {
    "event_type": "message.received",
    "id": "f9c2b4a1-3e5d-4f2a-9c1b-2d4e6f8a0b1c",
    "occurred_at": "2026-04-20T14:22:05.123Z",
    "record_type": "event",
    "payload": {
      "id": "40017a7b-8e9f-4c1d-a2b3-5d6e7f8a9b0c",
      "record_type": "message",
      "direction": "inbound",
      "type": "SMS",
      "from": {
        "phone_number": "+15559876543",
        "carrier": "T-MOBILE USA, INC.",
        "line_type": "Wireless"
      },
      "to": [
        {
          "phone_number": "+15551234567",
          "status": "webhook_delivered",
          "carrier": "Telnyx",
          "line_type": "Wireless"
        }
      ],
      "text": "hey bot, can you help me reset my password?",
      "media": [],
      "encoding": "GSM-7",
      "parts": 1,
      "tags": [],
      "cost": null,
      "received_at": "2026-04-20T14:22:05.000Z",
      "messaging_profile_id": "4001b8c2-1234-4abc-9def-0123456789ab",
      "organization_id": "2c1a8f0e-5678-49ab-b012-3456789abcde",
      "webhook_url": "https://bot.example.com/api/webhooks/telnyx"
    }
  },
  "meta": {
    "attempt": 1,
    "delivered_to": "https://bot.example.com/api/webhooks/telnyx"
  }
}
```

## Inbound MMS (`message.received`, with media)

An inbound MMS with a single image attachment. Each entry in `media[]` becomes an `Attachment` on the Chat SDK `Message`, with `type: "image"` inferred from `content_type`.

```json
{
  "data": {
    "event_type": "message.received",
    "id": "a7b3c2d1-9e8f-4a5b-b6c7-d8e9f0a1b2c3",
    "occurred_at": "2026-04-20T14:25:11.456Z",
    "record_type": "event",
    "payload": {
      "id": "5a6b7c8d-1234-4e5f-a6b7-c8d9e0f1a2b3",
      "record_type": "message",
      "direction": "inbound",
      "type": "MMS",
      "from": {
        "phone_number": "+15559876543",
        "carrier": "T-MOBILE USA, INC.",
        "line_type": "Wireless"
      },
      "to": [
        {
          "phone_number": "+15551234567",
          "status": "webhook_delivered",
          "carrier": "Telnyx",
          "line_type": "Wireless"
        }
      ],
      "text": "here's a screenshot of the error",
      "media": [
        {
          "url": "https://example.com/media/abc123.jpg",
          "content_type": "image/jpeg",
          "size": 284931,
          "hash_sha256": "3a7bd3e2360a3d5c0c2e9a0f7f1b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b"
        }
      ],
      "parts": 1,
      "tags": [],
      "cost": null,
      "received_at": "2026-04-20T14:25:11.000Z",
      "messaging_profile_id": "4001b8c2-1234-4abc-9def-0123456789ab",
      "organization_id": "2c1a8f0e-5678-49ab-b012-3456789abcde"
    }
  },
  "meta": {
    "attempt": 1,
    "delivered_to": "https://bot.example.com/api/webhooks/telnyx"
  }
}
```

## Outbound confirmation (`message.sent`, ignored)

Telnyx also delivers outbound lifecycle events (`message.sent`, `message.finalized`, etc.) to the same webhook URL. The adapter returns `200 OK` without dispatching to the Chat SDK because `event_type !== "message.received"`.

```json
{
  "data": {
    "event_type": "message.sent",
    "id": "c9d8e7f6-5a4b-4c3d-b2a1-0f1e2d3c4b5a",
    "occurred_at": "2026-04-20T14:22:06.789Z",
    "record_type": "event",
    "payload": {
      "id": "6f7e8d9c-abcd-4321-9876-543210fedcba",
      "record_type": "message",
      "direction": "outbound",
      "type": "SMS",
      "from": {
        "phone_number": "+15551234567",
        "carrier": "Telnyx"
      },
      "to": [
        {
          "phone_number": "+15559876543",
          "status": "sent",
          "carrier": "T-MOBILE USA, INC.",
          "line_type": "Wireless"
        }
      ],
      "text": "Got your text: hey bot, can you help me reset my password?",
      "media": [],
      "encoding": "GSM-7",
      "parts": 1,
      "tags": ["vercel-chat-sdk", "vercel-chat-sdk:0.1.0"],
      "cost": { "amount": "0.0040", "currency": "USD" },
      "sent_at": "2026-04-20T14:22:06.500Z",
      "completed_at": "2026-04-20T14:22:06.800Z",
      "messaging_profile_id": "4001b8c2-1234-4abc-9def-0123456789ab",
      "organization_id": "2c1a8f0e-5678-49ab-b012-3456789abcde"
    }
  },
  "meta": {
    "attempt": 1,
    "delivered_to": "https://bot.example.com/api/webhooks/telnyx"
  }
}
```
