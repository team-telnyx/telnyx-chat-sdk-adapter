import { createRequire } from "node:module";

export const ADAPTER_NAME = "@telnyx/chat-sdk-adapter";

const pkg = createRequire(import.meta.url)("../package.json") as { version: string };
export const ADAPTER_VERSION = pkg.version;

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
