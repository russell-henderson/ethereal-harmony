import { Readable } from "node:stream";

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

function isPrivateIp(hostname) {
  const host = hostname.toLowerCase();
  if (PRIVATE_HOSTS.has(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  const match = /^172\.(\d+)\./.exec(host);
  if (match) {
    const octet = Number(match[1]);
    return octet >= 16 && octet <= 31;
  }
  return false;
}

function getQueryParam(req, name) {
  const value = req.query?.[name];
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;

  try {
    const requestUrl = new URL(req.url, "http://localhost");
    return requestUrl.searchParams.get(name);
  } catch {
    return null;
  }
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range,Content-Type,Accept,Accept-Language,If-Modified-Since,If-None-Match");
  res.setHeader("Vary", "Origin");
}

function copyResponseHeaders(upstream, res) {
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "expires",
    "etag",
    "last-modified",
    "x-content-type-options",
  ];

  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }

  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const urlParam = getQueryParam(req, "url");
  if (!urlParam) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing url parameter" }));
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(urlParam);
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid url parameter" }));
    return;
  }

  if (targetUrl.protocol !== "http:") {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Only http:// URLs are proxied" }));
    return;
  }

  if (isPrivateIp(targetUrl.hostname)) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Private hosts are not allowed" }));
    return;
  }

  const upstreamHeaders = {};
  for (const headerName of ["range", "accept", "accept-language", "user-agent", "if-none-match", "if-modified-since"]) {
    const value = req.headers[headerName];
    if (typeof value === "string" && value) {
      upstreamHeaders[headerName] = value;
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      redirect: "follow",
      headers: upstreamHeaders,
    });

    res.statusCode = upstream.status;
    copyResponseHeaders(upstream, res);

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeReadable = Readable.fromWeb(upstream.body);
    nodeReadable.on("error", () => {
      if (!res.headersSent) res.statusCode = 502;
      res.end();
    });
    nodeReadable.pipe(res);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Proxy request failed" }));
  }
}