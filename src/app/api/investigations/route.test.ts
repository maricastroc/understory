import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  investigation: { findMany: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ dbEnabled: true, prisma: db }));
vi.mock("@/lib/auth/current-user", () => ({ currentUser: () => ({ login: "octo" }) }));

const { GET, POST } = await import("./route");

const missingColumn = Object.assign(new Error("column does not exist"), { code: "P2022" });

const payload = {
  caseId: "GI-2054",
  question: "Which alternatives did review reject?",
  repoPath: "https://github.com/acme/payments-service",
  location: "#812",
  result: { evidence: {}, narrative: null },
  parentCaseId: "GI-2049",
};

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/investigations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("/api/investigations", () => {
  beforeEach(() => {
    db.investigation.findMany.mockReset();
    db.investigation.upsert.mockReset();
  });

  it("saves the parent case with the child", async () => {
    db.investigation.upsert.mockResolvedValue({});
    const res = await post(payload);
    expect(await res.json()).toEqual({ persisted: true });
    const call = db.investigation.upsert.mock.calls[0][0];
    expect(call.create.parentCaseId).toBe("GI-2049");
    expect(call.update.parentCaseId).toBe("GI-2049");
  });

  it("still saves the case when the parent column has not been migrated yet", async () => {
    db.investigation.upsert.mockRejectedValueOnce(missingColumn).mockResolvedValueOnce({});
    const res = await post(payload);
    expect(await res.json()).toEqual({ persisted: true, parentSaved: false });
    expect(db.investigation.upsert.mock.calls[1][0].create).not.toHaveProperty("parentCaseId");
  });

  it("reads cases with their parent and falls back without it before the migration", async () => {
    const rows = [{ caseId: "GI-2054", parentCaseId: "GI-2049" }];
    db.investigation.findMany.mockResolvedValueOnce(rows);
    const req = new NextRequest("http://localhost/api/investigations");
    expect(await (await GET(req)).json()).toEqual({ investigations: rows, persisted: true });

    db.investigation.findMany
      .mockRejectedValueOnce(missingColumn)
      .mockResolvedValueOnce([{ caseId: "GI-2054" }]);
    expect(await (await GET(req)).json()).toEqual({
      investigations: [{ caseId: "GI-2054" }],
      persisted: true,
    });
    expect(db.investigation.findMany.mock.calls[2][0].select).not.toHaveProperty("parentCaseId");
  });

  it("rejects a malformed parent id", async () => {
    const res = await post({ ...payload, parentCaseId: "" });
    expect(res.status).toBe(400);
    expect(db.investigation.upsert).not.toHaveBeenCalled();
  });
});
