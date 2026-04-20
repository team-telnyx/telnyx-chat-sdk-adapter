const API = "https://api.telnyx.com/v2";
const KEY = process.env.TELNYX_API_KEY;
if (!KEY) throw new Error("TELNYX_API_KEY missing");

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

type Profile = { id: string; name: string; webhook_url: string | null; enabled: boolean };
type Number = {
  phone_number: string;
  phone_number_type: string;
  messaging_profile_id: string | null;
  features?: Record<string, unknown>;
};

async function main() {
  const profilesRes = (await get("/messaging_profiles?page[size]=50")) as { data: Profile[] };
  const numbersRes = (await get("/messaging_phone_numbers?page[size]=50")) as { data: Number[] };

  console.log("=== MESSAGING PROFILES ===");
  for (const p of profilesRes.data) {
    console.log(`  ${p.id}  enabled=${p.enabled}  webhook=${p.webhook_url ?? "(none)"}  name="${p.name}"`);
  }

  console.log("\n=== MESSAGING PHONE NUMBERS ===");
  for (const n of numbersRes.data) {
    console.log(
      `  ${n.phone_number}  type=${n.phone_number_type}  profile=${n.messaging_profile_id ?? "(unassigned)"}`,
    );
  }

  console.log(
    `\nTotal: ${profilesRes.data.length} profiles, ${numbersRes.data.length} messaging-capable numbers`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
