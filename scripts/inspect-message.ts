import { telnyx } from "./telnyx-http";

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error("usage: tsx scripts/inspect-message.ts <messageId>");

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await telnyx.get<{ data: Record<string, unknown> }>(`/messages/${id}`);
    console.log(`\n=== t+${(i + 1) * 5}s ===`);
    console.log(JSON.stringify(res.data, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
