import { describe, expect, it } from "vitest";
import { parseInviteCode } from "./inviteCode";

const code = "3f2b8c1e-9a4d-4c55-b0e2-7d1a6f9c2e10";

describe("parseInviteCode", () => {
  it("reads full links, links without https, and bare codes", () => {
    expect(parseInviteCode(`https://spiltwize.web.app/join/${code}`)).toBe(code);
    expect(parseInviteCode(`  spiltwize.web.app/join/${code}?utm=chat  `)).toBe(code);
    expect(parseInviteCode(`Join "Flat" on SplitWize: https://spiltwize.web.app/join/${code}`)).toBe(code);
    expect(parseInviteCode(code)).toBe(code);
  });

  it("rejects anything that isn't an invite", () => {
    expect(parseInviteCode("")).toBeNull();
    expect(parseInviteCode("https://example.com/login")).toBeNull();
    expect(parseInviteCode("https://evil.example/join/short")).toBeNull();
    expect(parseInviteCode("hello world")).toBeNull();
    expect(parseInviteCode(`https://x.example/join/${code}<script>`)).toBeNull();
  });
});
