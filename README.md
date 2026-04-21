# @telnyx/chat-sdk-adapter

[![npm version](https://img.shields.io/npm/v/@telnyx/chat-sdk-adapter.svg)](https://www.npmjs.com/package/@telnyx/chat-sdk-adapter)
[![npm downloads](https://img.shields.io/npm/dm/@telnyx/chat-sdk-adapter.svg)](https://www.npmjs.com/package/@telnyx/chat-sdk-adapter)
[![license](https://img.shields.io/npm/l/@telnyx/chat-sdk-adapter.svg)](./LICENSE)

Vercel Chat SDK adapter for [Telnyx](https://telnyx.com) SMS/MMS. Bidirectional: receive messages via Telnyx webhooks (Ed25519-verified), send messages via the Telnyx Messaging API.

## Install

```bash
pnpm add @telnyx/chat-sdk-adapter chat
```

Also install a state adapter — `@chat-adapter/state-memory` for dev, `@chat-adapter/state-redis` for production:

```bash
pnpm add @chat-adapter/state-memory
```

Requires Node.js `>=18`.

## Quick Start

```ts
import { createTelnyxAdapter } from "@telnyx/chat-sdk-adapter";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";

const telnyx = createTelnyxAdapter({
  // apiKey:     "KEY..."     // or set TELNYX_API_KEY
  // phoneNumber: "+15551234567" // or set TELNYX_FROM_NUMBER
  // publicKey:  "abc123..."   // or set TELNYX_PUBLIC_KEY
  messagingProfileId: "40017a7b-...",
});

const chat = new Chat({
  userName: "sms-bot",
  adapters: { telnyx },
  state: createMemoryState(),
});

// New inbound SMS (new thread)
chat.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await thread.post(`Got your text: ${message.text}`);
});

// Follow-up SMS in a subscribed thread
chat.onSubscribedMessage(async (thread, message) => {
  await thread.post(`Reply: ${message.text}`);
});

await chat.initialize();
```

In your webhook route handler, forward the request to `adapter.handleWebhook`:

```ts
// app/api/webhooks/telnyx/route.ts (Next.js App Router)
export async function POST(request: Request) {
  return telnyx.handleWebhook(request);
}
```

See [examples/basic](./examples/basic) for a full runnable server.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELNYX_API_KEY` | Yes | Telnyx API key (overridden by `config.apiKey`) |
| `TELNYX_FROM_NUMBER` | Yes | E.164 phone number you send from, e.g. `+15551234567` (overridden by `config.phoneNumber`) |
| `TELNYX_PUBLIC_KEY` | Recommended | Ed25519 public key for webhook verification. Accepts either the base64 form shown in Mission Control or a 64-char hex form — the adapter auto-detects. Overridden by `config.publicKey`. If unset, webhook signatures are not verified — do not run that way in production. |
| `BOT_USERNAME` | No | Bot display name. Defaults to `"bot"` (overridden by `config.userName`). |

### `TelnyxAdapterConfig`

```ts
interface TelnyxAdapterConfig {
  /** Telnyx API key. Defaults to TELNYX_API_KEY env var. */
  apiKey?: string;
  /** Telnyx phone number to send from (E.164). Defaults to TELNYX_FROM_NUMBER env var. */
  phoneNumber?: string;
  /** Ed25519 public key for webhook signature verification (base64 or hex — auto-detected). Defaults to TELNYX_PUBLIC_KEY env var. */
  publicKey?: string;
  /** Telnyx messaging profile ID. Optional, but strongly recommended — see below. */
  messagingProfileId?: string;
  /** Bot username used for mention detection. Defaults to BOT_USERNAME env var, then "bot". */
  userName?: string;
  /** Additional tags merged into the `tags` array on every outbound message, after the adapter-attribution tags. */
  extraTags?: string[];
  /** Opt out of adapter-attribution tags on outbound messages. Defaults to false. */
  disableAttributionTags?: boolean;
  /** Logger instance. Defaults to ConsoleLogger. */
  logger?: Logger;
}
```

## Recommended: Dedicated Messaging Profile

Create a dedicated [Telnyx Messaging Profile](https://portal.telnyx.com/#/messaging) for your chat bot and pass its ID as `messagingProfileId`. We recommend prefixing the profile name with `[Chat SDK]` (for example, `[Chat SDK] support-bot-prod`) so it is easy to find in the Mission Control portal and in usage exports.

Benefits of a dedicated profile:

- Per-profile usage analytics, so bot traffic is separated from the rest of your Telnyx account
- Per-profile spend limits, which let you cap bot spend without affecting other workloads
- Isolated webhook URL and failover webhook configuration
- Isolated webhook public key — the key you pass as `publicKey` is the one on the profile, not on the account

The adapter attaches `messaging_profile_id` to every outbound request when this is set.

## Capabilities

| Capability | Supported | Notes |
|---|---|---|
| Inbound SMS/MMS | Yes | via webhooks, Ed25519-signed |
| Outbound SMS | Yes | via `POST /v2/messages` |
| Outbound MMS | Yes | auto-upgrade when a posted message has attachments with public URLs |
| Ed25519 webhook verification | Yes | with a 300-second replay-attack window |
| Rate-limit handling | Yes | `429` responses surface as `AdapterRateLimitError` with `Retry-After` |
| Direct messages | Yes | `isDM()` is always true; a thread is one pair of phone numbers |
| Typing indicators | No | no-op; SMS has no typing concept |
| Reactions | No | `NotImplementedError`; SMS has no reactions |
| Edit / delete | No | `NotImplementedError`; SMS messages are immutable once delivered |
| Message history | No | Telnyx has no thread-based history API; rely on the Chat SDK state adapter |

## Attribution

The adapter advertises itself in three places so ecosystem usage is observable:

1. **`User-Agent` header** on every outbound API call: `@telnyx/chat-sdk-adapter/<version> (vercel-chat-sdk)`.
2. **`tags` on every outbound message**: `["vercel-chat-sdk", "vercel-chat-sdk:<version>"]`, merged with any user-supplied tags.
3. **Dedicated Messaging Profile convention** (see the section above) — the primary attribution signal for Telnyx-side usage analytics.

### Where tags show up on Telnyx

Attribution tags are visible in Telnyx webhook event payloads (`message.sent`, `message.finalized`, `message.received`) in the `data.payload.tags` field. They are accepted by `POST /v2/messages` but are **not** surfaced in the `GET /v2/messages/{id}` response. Tag-based attribution is therefore a webhook/event-stream signal, not a lookup-API signal.

### Merging and opting out

User-supplied tags are merged after the attribution tags. To opt out of attribution tags entirely, set `disableAttributionTags: true`; `extraTags` is unaffected.

```ts
const telnyx = createTelnyxAdapter({
  extraTags: ["env:prod", "team:support"],
  // disableAttributionTags: true,
});
```

The adapter re-exports the constants it uses so your own logging can stay consistent:

```ts
import {
  ADAPTER_NAME,
  ADAPTER_VERSION,
  USER_AGENT,
  ATTRIBUTION_TAGS,
} from "@telnyx/chat-sdk-adapter";
```

## Webhook Setup

1. Open the [Telnyx Mission Control portal](https://portal.telnyx.com/#/messaging) and navigate to the messaging profile you created for the bot.
2. In **Inbound Settings**, set the **Webhook URL** to your server's webhook endpoint (for example, `https://bot.example.com/api/webhooks/telnyx`).
3. Set **Webhook API version** to `2`.
4. Under **Messaging** -> **Security**, copy the **Public Key** for the profile and set it as `TELNYX_PUBLIC_KEY` (or pass it as `publicKey`). Telnyx shows this key in base64; the adapter accepts it as-is. This is the key the adapter uses to verify incoming webhook signatures.
5. Assign one or more phone numbers to the profile. The number you set as `TELNYX_FROM_NUMBER` must belong to this profile.

Incoming webhooks are validated against the `telnyx-signature-ed25519` and `telnyx-timestamp` headers. Requests with a timestamp older than 300 seconds, or with an invalid signature, are rejected with `401`.

## Thread Model

- A thread is a pair of E.164 phone numbers. The thread ID format is `telnyx:<bot-number>:<user-number>`, for example `telnyx:+15551234567:+15559876543`.
- `isDM()` always returns `true`.
- `openDM(phoneNumber)` returns the thread ID for a given recipient number so you can post proactively.
- `fetchMessages()` returns an empty list — Telnyx does not expose a thread-scoped history API. Use a durable Chat SDK state adapter (for example Redis) to persist subscriptions across restarts.

## Limitations

- **No typing indicators.** `startTyping()` is a no-op because SMS does not support them.
- **No reactions.** `addReaction` / `removeReaction` throw `NotImplementedError`.
- **No edit or delete.** SMS messages are final once sent. `editMessage` / `deleteMessage` throw `NotImplementedError`.
- **No server-side message history.** `fetchMessages` returns an empty result.
- **SMS length cap.** Outbound text is truncated at 1600 characters before being handed to Telnyx, which will segment it into concatenated SMS parts.
- **Webhook verification is skipped when `publicKey` is unset.** Set it in production.


## License

MIT — see [LICENSE](./LICENSE).
