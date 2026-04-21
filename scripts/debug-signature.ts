import { createServer } from "node:http";
import { createPublicKey, verify } from "node:crypto";

const PUBLIC_KEY = process.env.TELNYX_PUBLIC_KEY;
if (!PUBLIC_KEY) throw new Error("TELNYX_PUBLIC_KEY missing");
const PORT = 3100;

function rawKeyToSpkiDer(rawKey32: Buffer): Buffer {
  const spkiPrefix = Buffer.from([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
  ]);
  return Buffer.concat([spkiPrefix, rawKey32]);
}

const rawKey = Buffer.from(PUBLIC_KEY, "base64");
const spkiKey = createPublicKey({ key: rawKeyToSpkiDer(rawKey), format: "der", type: "spki" });

function tryVerify(label: string, message: Buffer, signature: Buffer): boolean {
  const ok = verify(null, message, spkiKey, signature);
  console.log(`  ${ok ? "MATCH" : "miss "} ${label}`);
  return ok;
}

const server = createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404).end();
    return;
  }
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    const ts = String(req.headers["telnyx-timestamp"] ?? "");
    const sigB64 = String(req.headers["telnyx-signature-ed25519"] ?? "");
    const sig = Buffer.from(sigB64, "base64");

    console.log(`\n=== webhook ${new Date().toISOString()} ===`);
    console.log(`  timestamp header: ${ts}`);
    console.log(`  sig length bytes: ${sig.length}`);
    console.log(`  body length:      ${raw.length}`);
    console.log(`  body first 120:   ${raw.subarray(0, 120).toString("utf8")}`);
    console.log(`  body last 60:     ${raw.subarray(Math.max(0, raw.length - 60)).toString("utf8")}`);
    console.log(`\n  --- signature attempts ---`);

    tryVerify("timestamp + body            ", Buffer.concat([Buffer.from(ts), raw]), sig);
    tryVerify("timestamp|body              ", Buffer.concat([Buffer.from(`${ts}|`), raw]), sig);
    tryVerify("body only                   ", raw, sig);
    tryVerify("timestamp:body              ", Buffer.concat([Buffer.from(`${ts}:`), raw]), sig);
    tryVerify("body + timestamp            ", Buffer.concat([raw, Buffer.from(ts)]), sig);
    tryVerify("timestamp.body              ", Buffer.concat([Buffer.from(`${ts}.`), raw]), sig);

    res.writeHead(200, { "content-type": "text/plain" }).end("ok");
  });
});

server.listen(PORT, () => console.log(`debug server on :${PORT}, pub key ${rawKey.length}B`));
