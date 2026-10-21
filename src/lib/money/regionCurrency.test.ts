import { describe, expect, it } from "vitest";
import { currencyForDevice } from "./regionCurrency";

describe("currencyForDevice", () => {
  it("uses the region of the phone's languages", () => {
    expect(currencyForDevice(["en-GB"])).toBe("GBP");
    expect(currencyForDevice(["bn-BD", "en"])).toBe("BDT");
    expect(currencyForDevice(["bn"])).toBe("BDT");
    expect(currencyForDevice(["de-DE"])).toBe("EUR");
    expect(currencyForDevice(["fr-CA"])).toBe("CAD");
  });

  it("trusts the time zone where people often use US English", () => {
    expect(currencyForDevice(["en-US"], "Asia/Dhaka")).toBe("BDT");
    expect(currencyForDevice(["en-US"], "Europe/London")).toBe("GBP");
    expect(currencyForDevice(["en-US"], "Australia/Sydney")).toBe("AUD");
  });

  it("falls back to dollars", () => {
    expect(currencyForDevice(["en-US"], "America/New_York")).toBe("USD");
    expect(currencyForDevice(["xx-QQ"])).toBe("USD");
    expect(currencyForDevice([])).toBe("USD");
  });
});
