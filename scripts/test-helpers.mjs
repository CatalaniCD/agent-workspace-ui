import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultEnvFile = resolve(projectRoot, ".env.local");

export function loadEnvLocal(file = defaultEnvFile) {
  if (!existsSync(file)) return false;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;

    let value = raw.trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));

    if (quoted) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }

    process.env[key] = value;
  }

  return true;
}

export function normalizeBaseUrl(value) {
  return (value || "").trim().replace(/\/$/, "");
}

export function mask(value) {
  if (!value) return "<unset>";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function accessRedirect(res) {
  if (res.status < 300 || res.status >= 400) return null;

  const location = res.headers.get("location") || "";
  return /cloudflareaccess\.com|\/cdn-cgi\/access\/login/i.test(location)
    ? location
    : null;
}

export async function readSnippet(res, maxLength = 300) {
  try {
    const text = (await res.text()).trim();
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  } catch {
    return "";
  }
}

export async function printResponseDetails(res, maxLength = 500) {
  const interestingHeaders = [
    "content-type",
    "server",
    "cf-ray",
    "cf-mitigated",
    "location",
    "www-authenticate",
  ];

  console.error(`      Response: ${res.status} ${res.statusText}`);
  for (const header of interestingHeaders) {
    const value = res.headers.get(header);
    if (value) console.error(`      ${header}: ${value}`);
  }

  const snippet = await readSnippet(res, maxLength);
  if (snippet) {
    console.error(`      Body: ${snippet.replace(/\s+/g, " ")}`);
  }
}

export function fail(message) {
  console.error(`\nFAIL: ${message}`);
  process.exitCode = 1;
}

export function pass(message) {
  console.log(`\nPASS: ${message}`);
}

export function envNotice(loaded) {
  console.log(
    loaded
      ? `Env: loaded ${defaultEnvFile} (existing process env wins)`
      : `Env: ${defaultEnvFile} not found; using process environment`,
  );
}
