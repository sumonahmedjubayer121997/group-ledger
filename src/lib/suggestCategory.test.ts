import { describe, expect, it } from "vitest";
import { suggestCategory } from "./suggestCategory";

const available = ["Food & Dining", "Groceries", "Transportation", "Bills & Utilities", "Education", "Other"];

describe("suggestCategory", () => {
  it("reuses the category chosen for the same description", () => {
    const history = [{ description: "Rice", category: "Food & Dining" }];
    expect(suggestCategory("rice", history, available)).toBe("Food & Dining");
  });

  it("follows shared words in past expenses before the keyword list", () => {
    const history = [
      { description: "Tesco big shop", category: "Food & Dining" },
      { description: "Baraka bazar + Lidl", category: "Groceries" },
      { description: "Lidl weekly", category: "Groceries" },
    ];
    expect(suggestCategory("Lidl top-up", history, available)).toBe("Groceries");
    expect(suggestCategory("Tesco", history, available)).toBe("Food & Dining");
  });

  it("falls back to keywords for new descriptions", () => {
    expect(suggestCategory("Uber home", [], available)).toBe("Transportation");
    expect(suggestCategory("Electricity bill", [], available)).toBe("Bills & Utilities");
    expect(suggestCategory("Sainsbury's", [], available)).toBe("Groceries");
  });

  it("only suggests categories the person has, and nothing for unknown words", () => {
    expect(suggestCategory("Netflix", [], available)).toBeNull();
    expect(suggestCategory("Something new", [], available)).toBeNull();
    expect(suggestCategory("  ", [{ description: "x", category: "Other" }], available)).toBeNull();
    expect(suggestCategory("Rice", [{ description: "Rice", category: "Deleted" }], available)).toBe("Groceries");
  });
});
