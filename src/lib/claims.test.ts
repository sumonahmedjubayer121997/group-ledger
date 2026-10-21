import { describe, expect, it } from "vitest";
import { memberFor } from "./claims";

describe("memberFor", () => {
  const group = { members: [{ id: "bob", name: "Bob Khan" }], aliases: { rahim: "bob" } };

  it("maps a claimed name to the person who claimed it", () => {
    expect(memberFor(group, { id: "rahim", name: "Rahim" })).toEqual({ id: "bob", name: "Bob Khan" });
  });

  it("keeps everyone else as they are", () => {
    expect(memberFor(group, { id: "bob", name: "Bob" })).toEqual({ id: "bob", name: "Bob Khan" });
    expect(memberFor(group, { id: "gone", name: "Gone" })).toEqual({ id: "gone", name: "Gone" });
    expect(memberFor(undefined, undefined)).toEqual({ id: "", name: "" });
  });
});
