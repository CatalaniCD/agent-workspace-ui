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
          "The API host returned an Access login redirect. Add a Service Auth policy for this service token on the API host's Access application.",
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
