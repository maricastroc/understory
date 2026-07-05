import { describe, expect, it } from "vitest";
import { enclosingSymbol } from "./symbol";

const at = (src: string, line: number, file = "x.ts") =>
  enclosingSymbol(src.split("\n"), line, file);

describe("enclosingSymbol", () => {
  it("wraps a single-line function declaration", () => {
    const src = `
import x from "y";

function chargeCard(amount: number) {
  const fee = amount * 0.03;
  return amount + fee;
}
`;
    expect(at(src, 5)).toEqual({ start: 4, end: 7, name: "chargeCard", kind: "function" });
  });

  it("captures a multi-line signature above the opening brace", () => {
    const src = `
export async function chargeCard(
  amount: number,
  currency: string,
): Promise<void> {
  await gateway.charge(amount, currency);
}
`;
    expect(at(src, 6)).toEqual({ start: 2, end: 7, name: "chargeCard", kind: "function" });
  });

  it("handles const arrow functions", () => {
    const src = `
const total = 0;
const chargeCard = async (amount: number) => {
  return amount * 1.03;
};
`;
    const span = at(src, 4);
    expect(span).toMatchObject({ name: "chargeCard", kind: "function", start: 3, end: 5 });
  });

  it("prefers the innermost method over the enclosing class", () => {
    const src = `
class Billing {
  private rate = 0.03;

  charge(amount: number) {
    const fee = amount * this.rate;
    return amount + fee;
  }
}
`;
    expect(at(src, 6)).toEqual({ start: 5, end: 8, name: "charge", kind: "method" });
  });

  it("falls back to the class when the line is a field, not in a method", () => {
    const src = `
class Billing {
  private rate = 0.03;
  charge() {}
}
`;
    expect(at(src, 3)).toEqual({ start: 2, end: 5, name: "Billing", kind: "class" });
  });

  it("does not match control flow as a symbol", () => {
    const src = `
function run() {
  if (ready) {
    doWork();
  }
}
`;
    // clicking inside the if-block still resolves to the enclosing function, not "if"
    expect(at(src, 4)).toEqual({ start: 2, end: 6, name: "run", kind: "function" });
  });

  it("handles Go func with a receiver", () => {
    const src = `
func (s *Server) Handle(w http.ResponseWriter) {
	log.Println("hit")
	s.serve(w)
}
`;
    expect(at(src, 3, "server.go")).toEqual({
      start: 2,
      end: 5,
      name: "Handle",
      kind: "function",
    });
  });

  it("handles Python def by indentation", () => {
    const src = `
class Service:
    def charge(self, amount):
        fee = amount * 0.03
        return amount + fee
`;
    expect(at(src, 4, "svc.py")).toEqual({
      start: 3,
      end: 5,
      name: "charge",
      kind: "function",
    });
  });

  it("returns null for a top-level line with no enclosing symbol", () => {
    const src = `
import x from "y";
const CONFIG = 3;
`;
    expect(at(src, 2)).toBeNull();
    expect(at(src, 3)).toBeNull();
  });

  it("ignores braces inside strings and comments", () => {
    const src = `
function label() {
  const s = "a { b } c"; // trailing } brace
  return s;
}
`;
    expect(at(src, 3)).toEqual({ start: 2, end: 5, name: "label", kind: "function" });
  });
});
