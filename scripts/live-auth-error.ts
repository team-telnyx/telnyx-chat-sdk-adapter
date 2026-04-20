import { AuthenticationError } from "@chat-adapter/shared";
import { createTelnyxAdapter } from "../src/factory";

async function main() {
  const adapter = createTelnyxAdapter({
    apiKey: "KEYnot_a_real_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    phoneNumber: "+15555550100",
  });

  try {
    await adapter.postMessage("telnyx:+15555550100:+15555550101", "this should never send");
    console.error("UNEXPECTED: postMessage resolved with a bogus API key");
    process.exit(1);
  } catch (err) {
    if (err instanceof AuthenticationError) {
      console.log("PASS — bogus key → AuthenticationError");
      console.log("  adapter:", err.adapterName ?? "(no field)");
      console.log("  message:", err.message);
      process.exit(0);
    }
    console.error("FAIL — wrong error type:", err);
    process.exit(2);
  }
}

main();
