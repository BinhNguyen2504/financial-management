import { describe, expect, it } from "vitest";
import { publicOrigin, sameOrigin } from "../src/server/request-origin";
describe("Browser origin validation", () => {
  it("handles Next Proxy's loopback hostname normalization without relaxing CSRF checks", () => {
    const request = new Request("http://localhost:5555/api", {
      headers: { host: "127.0.0.1:5555", origin: "http://127.0.0.1:5555" },
    });
    expect(sameOrigin(request)).toBe(true);
    expect(
      sameOrigin(
        new Request(request, {
          headers: { host: "127.0.0.1:5555", origin: "http://evil.test" },
        }),
      ),
    ).toBe(false);
    expect(
      sameOrigin(new Request(request, { headers: { host: "127.0.0.1:5555" } })),
    ).toBe(false);
  });
  it("supports HTTPS proxies and an explicitly configured public origin", () => {
    const request = new Request("http://localhost/api", {
      headers: { host: "finance.example", "x-forwarded-proto": "https" },
    });
    expect(publicOrigin(request, "")).toBe("https://finance.example");
    expect(publicOrigin(request, "https://private.example")).toBe(
      "https://private.example",
    );
  });
});
