import { describe, expect, it } from "vitest";
import { openBucket } from "./usage";

const DAY = 24 * 60 * 60 * 1000;

describe("openBucket", () => {
  it("counts weeks since this device first opened the app", () => {
    expect(openBucket(null, 0)).toBe("first");
    expect(openBucket(0, 3 * DAY)).toBe("week0");
    expect(openBucket(0, 7 * DAY)).toBe("week1");
    expect(openBucket(0, 29 * DAY)).toBe("week4");
    expect(openBucket(0, 90 * DAY)).toBe("week8+");
  });
});
