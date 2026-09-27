import { describe, expect, it } from "vitest";
import { repoDisplayName } from "./repo-display-name";

describe("repoDisplayName", () => {
  it("keeps GitHub slugs and shortens filesystem paths to the folder name", () => {
    expect(repoDisplayName("acme/payments-service")).toBe("acme/payments-service");
    expect(repoDisplayName("/Users/me/code/payments-service")).toBe("payments-service");
    expect(repoDisplayName("/Users/me/code/payments-service/")).toBe("payments-service");
    expect(repoDisplayName(".demo/payments-service")).toBe("payments-service");
    expect(repoDisplayName("~/code/payments-service")).toBe("payments-service");
    expect(repoDisplayName("C:\\code\\payments-service")).toBe("payments-service");
  });
});
