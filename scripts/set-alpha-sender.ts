import { telnyx } from "./telnyx-http";

async function main() {
  const id = process.env.TELNYX_PROFILE_ID;
  if (!id) throw new Error("TELNYX_PROFILE_ID missing");
  const res = await telnyx.patch<{ data: Record<string, unknown> }>(`/messaging_profiles/${id}`, {
    alpha_sender: "ChatSDK",
    whitelisted_destinations: ["US", "IE"],
  });
  console.log(JSON.stringify(res.data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
