import { telnyx } from "./telnyx-http";

type Profile = {
  id: string;
  name: string;
  webhook_url: string | null;
  enabled: boolean;
  whitelisted_destinations: string[];
};

type Number = {
  id: string;
  phone_number: string;
  messaging_profile_id: string | null;
};

async function main() {
  const [, , webhookUrl] = process.argv;
  if (!webhookUrl) {
    throw new Error("usage: tsx scripts/provision.ts <webhookUrl>");
  }

  const profileName = "[Chat SDK] E2E Test";
  console.log(`Looking for existing profile "${profileName}"...`);

  const profileList = (await telnyx.get<{ data: Profile[] }>(`/messaging_profiles?page[size]=250`))
    .data;
  let profile = profileList.find((p) => p.name === profileName);

  if (profile) {
    console.log(`Found: ${profile.id}`);
    console.log(`Updating webhook_url to ${webhookUrl}`);
    const updated = (
      await telnyx.patch<{ data: Profile }>(`/messaging_profiles/${profile.id}`, {
        name: profileName,
        enabled: true,
        webhook_url: webhookUrl,
        webhook_api_version: "2",
        whitelisted_destinations: ["US", "IE"],
      })
    ).data;
    profile = updated;
  } else {
    console.log(`Creating new profile...`);
    const created = (
      await telnyx.post<{ data: Profile }>("/messaging_profiles", {
        name: profileName,
        enabled: true,
        webhook_url: webhookUrl,
        webhook_api_version: "2",
        whitelisted_destinations: ["US", "IE"],
      })
    ).data;
    profile = created;
    console.log(`Created: ${profile.id}`);
  }

  console.log(`Profile ready: ${profile.id}`);
  console.log(`  webhook_url: ${profile.webhook_url}`);
  console.log(`  whitelisted: ${profile.whitelisted_destinations.join(", ")}`);

  console.log(`\nFinding an unassigned messaging-capable number...`);
  const numbers = (await telnyx.get<{ data: Number[] }>(`/messaging_phone_numbers?page[size]=50`))
    .data;

  const alreadyOn = numbers.find((n) => n.messaging_profile_id === profile.id);
  const chosen = alreadyOn ?? numbers.find((n) => !n.messaging_profile_id);

  if (!chosen) {
    throw new Error("No available messaging number found on account");
  }

  if (chosen.messaging_profile_id !== profile.id) {
    console.log(`Assigning ${chosen.phone_number} to profile ${profile.id}...`);
    await telnyx.patch(`/phone_numbers/${chosen.id}/messaging`, {
      messaging_profile_id: profile.id,
    });
  } else {
    console.log(`${chosen.phone_number} already on profile`);
  }

  console.log(`\nFetching account-level webhook public key(s)...`);
  try {
    const keys = await telnyx.get<{ data: Array<{ key: string; created_at: string }> }>(
      `/public_key`,
    );
    console.log("  /public_key result:", JSON.stringify(keys, null, 2));
  } catch (e) {
    console.log("  /public_key fetch failed (expected if no such endpoint):", (e as Error).message);
  }

  console.log(`\n=== READY ===`);
  console.log(`TELNYX_PROFILE_ID=${profile.id}`);
  console.log(`TELNYX_FROM_NUMBER=${chosen.phone_number}`);
  console.log(`TELNYX_WEBHOOK_URL=${webhookUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
