# @telnyx/chat-sdk-adapter

## 0.1.0

### Minor Changes

- Initial release: Vercel Chat SDK adapter for Telnyx SMS/MMS.
  - Inbound webhooks with Ed25519 signature verification and 300-second replay protection
  - Outbound SMS with automatic MMS upgrade when attachments have public URLs
  - Rate-limit handling (`429` -> `AdapterRateLimitError`) and structured Telnyx error parsing
  - Adapter-attribution tags and `User-Agent` for ecosystem observability, with opt-out
  - Dedicated messaging-profile support via `messagingProfileId`
  - Based on the proof-of-concept by Hayden Bleasel ([vercel/chat#198](https://github.com/vercel/chat/pull/198))
