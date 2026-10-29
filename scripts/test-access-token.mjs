#!/usr/bin/env node

import {
  accessRedirect,
  envNotice,
  fail,
  loadEnvLocal,
  mask,
  normalizeBaseUrl,
  pass,
  printResponseDetails,
} from "./test-helpers.mjs";

const loaded = loadEnvLocal();
envNotice(loaded);

const apiUrl = normalizeBaseUrl(
  process.env.API_URL || process.env.LANGGRAPH_API_URL,
);
const healthPath = process.env.HEALTH_PATH || "/ok";
const clientId = process.env.CF_ACCESS_CLIENT_ID;
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;

if (!apiUrl) {
  fail("LANGGRAPH_API_URL (or API_URL) is not set.");
  process.exit();
}

if (!clientId || !clientSecret) {
  fail("CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET are not both set.");
  console.error(
    "      Set both on the Next server runtime environment (not NEXT_PUBLIC_*).",
  );
  process.exit();
}

const url = `${apiUrl}${healthPath.startsWith("/") ? healthPath : `/${healthPath}`}`;
const apiHost = new URL(apiUrl).host;
console.log(`API: ${url}`);
console.log(`Service token: ${mask(clientId)}`);

let res;
try {
  res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
} catch (error) {
  fail(`Could not reach the API: ${error.message}`);
  console.error(
    "      Check DNS, the tunnel, and that the API service is running.",
  );
  process.exit();
}

const location = accessRedirect(res);

if (res.ok) {
  pass(`${res.status} ${res.statusText} - service token accepted.`);
  process.exit();
}

if (location) {
  fail("Cloudflare Access redirected the request to its login page.");
  console.error(
    "      The API Access application did not accept this service token.",
  );
  console.error(`      Add a policy to the Access application for ${apiHost}:`);
  console.error("        Action: Service Auth");
  console.error(`        Include: Service Token (${mask(clientId)})`);
  console.error(`      Location: ${location}`);
} else {
  if (res.status === 401 || res.status === 403) {
    fail(`Access or the API returned ${res.status}.`);
    console.error(
      "      Confirm the Service Auth policy is on the Access application for",
    );
    console.error(
      `      ${apiHost}, not a different hostname or the app host.`,
    );
    console.error(
      "      The token may also be invalid, expired, revoked, or from another account/team;",
    );
    console.error(
      "      or a WAF rule/Block policy may be denying the request.",
    );
  } else if (res.status === 404) {
    fail("The API host or health path was not found (404).");
    console.error(
      `      Check the tunnel ingress for ${apiHost} and HEALTH_PATH (default /ok).`,
    );
  } else if (res.status >= 500) {
    fail(`The API returned ${res.status}.`);
    console.error(
      "      Access was passed, but the LangGraph backend failed. Check its logs.",
    );
  } else {
    fail(`Unexpected response: ${res.status} ${res.statusText}.`);
  }

  await printResponseDetails(res);
}

process.exit();
