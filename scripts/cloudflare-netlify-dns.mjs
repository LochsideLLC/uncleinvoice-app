import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ZONE_NAME = "uncleinvoice.com";
const APEX_CNAME = "uncleinvoice.netlify.app";
const WWW_CNAME = "uncleinvoice.netlify.app";

function loadEnvFile(filename) {
  try {
    const text = readFileSync(resolve(process.cwd(), filename), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // file optional
  }
}

async function cf(path, init = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!body.success) {
    const msg = (body.errors ?? []).map((e) => e.message).join("; ") || res.statusText;
    throw new Error(msg);
  }
  return body.result;
}

async function upsertCname(zoneId, name, content) {
  const records = await cf(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`,
  );
  const existing = records.find(
    (record) => record.type === "CNAME" || record.type === "A" || record.type === "AAAA",
  );
  const payload = {
    type: "CNAME",
    name,
    content,
    ttl: 1,
    proxied: false,
  };
  if (existing) {
    await cf(`/zones/${zoneId}/dns_records/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    console.log(`Updated ${name} -> CNAME ${content} (DNS only)`);
  } else {
    await cf(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`Created ${name} -> CNAME ${content} (DNS only)`);
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
const token =
  process.env.CLOUDFLARE_API_TOKEN?.trim() ||
  process.env.CLOUDFLARE_API_TOKEN_UI?.trim();
if (!token) {
  console.error("No Cloudflare token in .env or .env.local");
  process.exit(1);
}
process.env.CLOUDFLARE_API_TOKEN = token;

const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
if (!zones.length) {
  console.error(`No Cloudflare zone found for ${ZONE_NAME}`);
  process.exit(1);
}
const zoneId = zones[0].id;
console.log(`Found zone ${ZONE_NAME}`);
await upsertCname(zoneId, ZONE_NAME, APEX_CNAME);
await upsertCname(zoneId, `www.${ZONE_NAME}`, WWW_CNAME);
console.log("Cloudflare DNS updated. Proxy is off so Netlify can issue the cert.");
console.log("Add uncleinvoice.com and www.uncleinvoice.com in Netlify domain management first, or Netlify answers 404.");
