import { telnyx } from "./telnyx-http";

async function main() {
  const id = "40019dac-b5b6-4851-ab60-fae35acc7218";
  const res = await telnyx.patch<{ data: Record<string, unknown> }>(
    `/messaging_profiles/${id}`,
    {
      alpha_sender: "ChatSDK",
      whitelisted_destinations: ["US", "IE"],
    },
  );
  console.log(JSON.stringify(res.data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
