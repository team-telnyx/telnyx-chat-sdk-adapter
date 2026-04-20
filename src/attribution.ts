export const ADAPTER_NAME = "@telnyx/chat-sdk-adapter";
export const ADAPTER_VERSION = "0.1.0";
export const ADAPTER_MARKER = "vercel-chat-sdk";
export const USER_AGENT = `${ADAPTER_NAME}/${ADAPTER_VERSION} (${ADAPTER_MARKER})`;
export const ATTRIBUTION_TAGS: readonly string[] = [
  ADAPTER_MARKER,
  `${ADAPTER_MARKER}:${ADAPTER_VERSION}`,
];

export function buildTags(
  userTags: readonly string[] | undefined,
  disableAttribution: boolean,
): string[] {
  const tags = disableAttribution ? [] : [...ATTRIBUTION_TAGS];
  if (userTags?.length) {
    tags.push(...userTags);
  }
  return tags;
}
