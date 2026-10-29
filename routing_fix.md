# Routing Fix: Cloudflare Access for app.oficina-seriani.com → api.oficina-seriani.com

## Root cause

Cloudflare Access authenticates **a hostname per request**. Logging into
`app.oficina-seriani.com` gives the browser a `CF_Authorization` cookie/JWT for
that Access application. The Next.js server is a different HTTP client: its
`fetch()` has no browser cookie jar, and even if the cookie were copied,
`api.oficina-seriani.com` has its own Access application and JWT audience, so it
would reject it.

The Next server must authenticate to the API on its own. The supported
mechanism is a **Cloudflare Access service token**, sent as:

```
CF-Access-Client-Id: <token-id>
CF-Access-Client-Secret: <token-secret>
```

The current route already attempts this, so if it still fails the token is
almost certainly not authorized on the **api** Access application, or the env
vars are not present at runtime.

## Improved route

Main improvements: correct `_path` param, never forward client-supplied
service-token headers, fail loudly on Access redirects, and abort the upstream
request when the client disconnects.

```ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.LANGGRAPH_API_URL?.replace(/\/$/, "");
const CF_ID = process.env.CF_ACCESS_CLIENT_ID;
const CF_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;

if (!BACKEND) throw new Error("LANGGRAPH_API_URL is not set");
if (Boolean(CF_ID) !== Boolean(CF_SECRET)) {
  throw new Error(
    "Set both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET, or neither.",
  );
}

const HOP_BY_HOP = [
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "upgrade",
];

const STRIP_REQUEST = new Set([...HOP_BY_HOP, "cookie"]);
const STRIP_RESPONSE = new Set([
  ...HOP_BY_HOP,
  "content-encoding",
  "content-length",
]);

function isAccessLoginRedirect(res: Response) {
  if (res.status < 300 || res.status >= 400) return false;
  const location = res.headers.get("location") ?? "";
  return (
    location.includes("cloudflareaccess.com") ||
    location.includes("/cdn-cgi/access/login")
  );
}

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ _path: string[] }> },
) {
  const { _path = [] } = await params;
  const target = new URL(`${BACKEND}/${_path.join("/")}`);
  target.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  for (const header of STRIP_REQUEST) headers.delete(header);

  // Never trust or leak service-token headers supplied by the browser.
  headers.delete("cf-access-client-id");
  headers.delete("cf-access-client-secret");

  if (CF_ID && CF_SECRET) {
    headers.set("CF-Access-Client-Id", CF_ID);
    headers.set("CF-Access-Client-Secret", CF_SECRET);
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
      cache: "no-store",
      signal: req.signal,
    } as RequestInit & { duplex: "half" });
  } catch (error) {
    console.error("Proxy: upstream request failed", {
      target: target.toString(),
      error,
    });
    return NextResponse.json(
      { error: "upstream_unreachable" },
      { status: 502 },
    );
  }

  if (isAccessLoginRedirect(upstream)) {
    console.error("Proxy: Cloudflare Access rejected the request", {
      target: target.toString(),
      location: upstream.headers.get("location"),
      serviceTokenConfigured: Boolean(CF_ID && CF_SECRET),
    });
    return NextResponse.json(
      {
        error: "cloudflare_access_denied",
        message:
          "The API host returned an Access login redirect. Add a Service Auth policy for this service token on the api.oficina-seriani.com Access application.",
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const header of STRIP_RESPONSE) responseHeaders.delete(header);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
};
```

If the folder is named `[..._path]`, the param **must** be `_path`, not `path`.
If using `[...path]`, change it accordingly.

## Cloudflare configuration

1. **Zero Trust → Access → Service Auth → Create service token.** Copy the
   client ID and secret (the secret is shown once).
2. **Zero Trust → Access → Applications → `api.oficina-seriani.com` →
   Policies → Add policy:**
   - Action: **Service Auth**
   - Include: **Service Token** → select the token created above.

   A normal `Allow` policy for emails does **not** authorize a service token.
   The API application needs a `Service Auth` policy. If a `Bypass` policy
   exists for this host, remove it.

3. Set these on the **Next server runtime**, then restart/redeploy:

   ```
   LANGGRAPH_API_URL=https://api.oficina-seriani.com
   CF_ACCESS_CLIENT_ID=<service-token-id>
   CF_ACCESS_CLIENT_SECRET=<service-token-secret>
   ```

   Do not use `NEXT_PUBLIC_*` for the secret. For Docker, pass them with
   `-e`/compose; for Vercel, set them for the deployed environment.

4. Confirm the cloudflared ingress for `api.oficina-seriani.com` points at the
   LangGraph service, and that the Access application domain matches exactly.

## Verify

From **the Next server's shell/container** (same env), not a laptop:

```bash
curl -sS -D - -o /dev/null https://api.oficina-seriani.com/ok \
  -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"
```

- `200` → token works; the route should now work.
- `302` to `*.cloudflareaccess.com` → missing/wrong `Service Auth` policy or
  wrong token.
- `403` → token belongs to another account/team or is revoked.
- `404`/`502` → tunnel route or backend, not Access.

## Test scripts

Two Node scripts load `.env.local` (process env wins) and print a diagnosis
without exposing the client secret.

```bash
# 1. Verify the service token directly against the API
npm run test:access

# 2. Verify the Next.js proxy end-to-end (default http://localhost:3000)
npm run test:proxy
```

Supported overrides:

- `test:access`: `API_URL` (or `LANGGRAPH_API_URL`), `HEALTH_PATH` (default
  `/ok`), `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`.
- `test:proxy`: `APP_URL` (default `http://localhost:3000`), `PROXY_PATH`
  (default `/api/ok`).

`test:proxy` must be run against a server that can reach the API. If `APP_URL`
points at the public production hostname, Cloudflare Access will redirect the
CLI request to a login page because it has no browser session; test against
localhost or from inside the Next server/container instead.

## Better alternatives

- If Next and LangGraph run on the same Docker/host network, set
  `LANGGRAPH_API_URL` to the **internal** address (`http://langgraph:8000` or
  `http://localhost:2024`). That bypasses Cloudflare Access entirely, avoids an
  extra hop, and needs no service token. Keep the public API protected for
  other clients.
- Or serve both from one hostname (`app.oficina-seriani.com/lg/*` routed by the
  tunnel to LangGraph) so they share one Access application and session.

Do **not** forward the browser's `CF_Authorization` cookie or
`Cf-Access-Jwt-Assertion` as the primary fix; it is scoped/audience-bound to the
`app` Access application and the API will reject it.
