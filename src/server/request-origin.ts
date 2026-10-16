// NextURL normalizes 127.0.0.1 to localhost in Proxy. Host retains the actual browser host.
export function publicOrigin(
  request: Request,
  configured = process.env.APP_ORIGIN,
): string {
  if (configured) return new URL(configured).origin;
  const url = new URL(request.url);
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    url.protocol.replace(":", "");
  const host = request.headers.get("host") ?? url.host;
  if (protocol !== "https" && protocol !== "http")
    throw new Error("Invalid request protocol");
  return new URL(`${protocol}://${host}`).origin;
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === publicOrigin(request);
}
