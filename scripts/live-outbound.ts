import { ADAPTER_MARKER, ADAPTER_VERSION } from "../src/attribution";
import { createTelnyxAdapter } from "../src/factory";
import { telnyx } from "./telnyx-http";

const FROM = process.env.TELNYX_FROM_NUMBER;
const TO = process.env.TEST_TO_NUMBER;
const PROFILE = process.env.TELNYX_PROFILE_ID;
if (!(FROM && TO && PROFILE)) {
  throw new Error("Set TELNYX_FROM_NUMBER, TEST_TO_NUMBER, and TELNYX_PROFILE_ID");
}

async function main() {
  console.log(`Sending E2E test SMS: ${FROM} → ${TO}`);
  console.log(`Messaging profile: ${PROFILE}`);

  const adapter = createTelnyxAdapter({
    phoneNumber: FROM,
    messagingProfileId: PROFILE,
    extraTags: ["e2e-test", `run:${Date.now()}`],
  });

  const threadId = `telnyx:${FROM}:${TO}`;
  const body = "Hello from @telnyx/chat-sdk-adapter v0.1.0 E2E test. You can reply to me!";

  const result = await adapter.postMessage(threadId, body);
  console.log(`\nAdapter response id: ${result.id}`);
  console.log(`Status: ${result.raw.direction} / ${result.raw.type}`);
  console.log(`Tags (from send response): ${JSON.stringify(result.raw.tags)}`);

  type Retrieved = {
    id: string;
    to: Array<{ status: string; phone_number: string }>;
    tags: string[];
    cost?: { amount: string; currency: string } | null;
    parts?: number;
    errors?: Array<{ code?: string; title?: string; detail?: string }>;
  };

  let retrieved: Retrieved | undefined;
  let raw: Record<string, unknown> | undefined;
  let lastError: unknown;
  for (const wait of [1000, 2000, 3000, 5000, 8000]) {
    await new Promise((r) => setTimeout(r, wait));
    try {
      const response = await telnyx.get<{ data: Record<string, unknown> }>(
        `/messages/${result.id}`,
      );
      raw = response.data;
      retrieved = response.data as unknown as Retrieved;
      console.log(`Retrieved after ${wait}ms backoff`);
      break;
    } catch (e) {
      lastError = e;
      process.stdout.write(".");
    }
  }
  if (!retrieved) {
    console.error("\nCould not retrieve message after 30s:", (lastError as Error).message);
    process.exit(1);
  }
  console.log(`\n=== FULL TELNYX GET /messages/${result.id} RESPONSE ===`);
  console.log(JSON.stringify(raw, null, 2));

  console.log(`\n=== RETRIEVED FROM TELNYX ===`);
  console.log(`id:         ${retrieved.id}`);
  console.log(`to status:  ${JSON.stringify(retrieved.to)}`);
  console.log(`tags:       ${JSON.stringify(retrieved.tags)}`);
  console.log(`cost:       ${JSON.stringify(retrieved.cost)}`);
  console.log(`parts:      ${retrieved.parts}`);
  if (retrieved.errors?.length) {
    console.log(`errors:     ${JSON.stringify(retrieved.errors)}`);
  }

  const tags = retrieved.tags ?? [];
  const hasMarker = tags.includes(ADAPTER_MARKER);
  const hasVersion = tags.includes(`${ADAPTER_MARKER}:${ADAPTER_VERSION}`);
  const hasCustom = tags.some((t) => t.startsWith("run:"));

  console.log(`\n=== ATTRIBUTION VERIFICATION ===`);
  console.log(`  ${ADAPTER_MARKER}                 ${hasMarker ? "PASS" : "FAIL"}`);
  console.log(`  ${ADAPTER_MARKER}:${ADAPTER_VERSION}           ${hasVersion ? "PASS" : "FAIL"}`);
  console.log(`  user extraTags merged        ${hasCustom ? "PASS" : "FAIL"}`);

  if (!(hasMarker && hasVersion && hasCustom)) {
    console.error("FAIL: attribution tags not reflected in the retrieved message");
    process.exit(1);
  }
  console.log("\nALL ATTRIBUTION CHECKS PASSED.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
