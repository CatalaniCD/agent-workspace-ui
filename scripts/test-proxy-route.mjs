#!/usr/bin/env node

import {
  accessRedirect,
  envNotice,
  fail,
  loadEnvLocal,
  normalizeBaseUrl,
  pass,
  printResponseDetails,
} from "./test-helpers.mjs";

const loaded = loadEnvLocal();
envNotice(loaded);

const appUrl = normalizeBaseUrl(process.env.APP_URL || "http://localhost:3000");
const proxyPath = process.env.PROXY_PATH || "/api/ok";
const url = `${appUrl}${proxyPath.startsWith("/") ? proxyPath : `/${proxyPath}`}`;

if (proxyPath === "/") {
  fail(
    "PROXY_PATH is '/', which tests the app root instead of the /api proxy route.",
  );
  console.error("      Unset PROXY_PATH or set it to /api/ok.");
  process.exit();
}

console.log(`Proxy: ${url}`);

let res;
try {
  res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
} catch (error) {
  fail(`Could not reach the app: ${error.message}`);
  console.error(
    "      Start the app (npm run dev) or set APP_URL to the running app.",
  );
  process.exit();
}

if (res.ok) {
  pass(`${res.status} ${res.statusText} - Next.js proxy reached the API.`);
  process.exit();
}

const location = accessRedirect(res);

if (location) {
  fail("The app itself is behind Cloudflare Access.");
  console.error(
    "      This CLI request has no browser Access session and no app service token.",
  );
  console.error(
    "      Test against localhost (npm run dev) or run inside the Next server/container.",
  );
  console.error(`      Location: ${location}`);
  process.exit();
}

if (res.status === 502) {
  const body = await res.text();
  let payload;

  try {
    payload = JSON.parse(body);
  } catch {
    payload = null;
  }

  if (payload?.error === "cloudflare_access_denied") {
    fail(
      "The Next.js proxy reached the API, but Cloudflare Access rejected it.",
    );
    console.error(
      "      Add a Service Auth policy for the service token on the api Access application.",
    );
  } else if (payload?.error === "upstream_unreachable") {
    fail("The Next.js proxy could not reach LANGGRAPH_API_URL.");
    console.error(
      "      Check the URL, DNS, tunnel, and that the API service is running.",
    );
  } else {
    fail("The proxy returned 502.");
    if (body.trim()) console.error(`      Body: ${body.trim().slice(0, 300)}`);
  }

  process.exit();
}

if (res.status === 500) {
  fail("The Next.js route returned 500.");
  console.error(
    "      Check that LANGGRAPH_API_URL and both CF_ACCESS_* vars exist in the server runtime.",
  );
  console.error("      Review the Next.js server logs for the proxy error.");
  await printResponseDetails(res);
} else if (res.status === 404) {
  fail("The proxy route was not found (404).");
  console.error(
    "      Confirm src/app/api/[..._path]/route.ts|js exists and PROXY_PATH is /api/ok.",
  );
  console.error(
    "      If the app runs from a production build, rebuild/restart it after adding the route.",
  );
  await printResponseDetails(res);
} else if (res.status === 401 || res.status === 403) {
  fail(`Access or the API returned ${res.status}.`);
  console.error(
    "      The service token may be invalid, or the API may require additional auth.",
  );
  await printResponseDetails(res);
} else {
  fail(`Unexpected response: ${res.status} ${res.statusText}.`);
  await printResponseDetails(res);
}

process.exit();
