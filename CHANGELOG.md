# @telnyx/chat-sdk-adapter

## 0.1.0

### Minor Changes

- 8c2fccf: Initial release: Vercel Chat SDK adapter for Telnyx SMS/MMS.

  - Inbound webhooks with Ed25519 signature verification (pipe-separated `{timestamp}|{body}` scheme, base64 or hex public keys) and 300-second replay protection
  - Outbound SMS with automatic MMS upgrade when attachments have public URLs
  - Rate-limit handling (`429` → `AdapterRateLimitError` with `Retry-After`)
  - Structured Telnyx error parsing for both `AuthenticationError` and `NetworkError`
  - Attribution tags and `User-Agent` header for ecosystem observability, with `disableAttributionTags` opt-out
  - Validated end-to-end against live Telnyx — outbound send, delivery-receipt webhook signature verification, and tag propagation all confirmed
  - Based on the proof of concept by Hayden Bleasel in `vercel/chat#198`
