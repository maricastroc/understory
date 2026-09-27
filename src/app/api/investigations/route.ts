import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { dbEnabled, prisma } from "@/lib/db";
import { isMissingColumn, saveSchema } from "@/lib/investigation-save";

export const runtime = "nodejs";

const BASE_SELECT = {
  caseId: true,
  question: true,
  repoPath: true,
  location: true,
  result: true,
  createdAt: true,
} as const;

export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user || !dbEnabled || !prisma) {
    return NextResponse.json({ investigations: [], persisted: false });
  }
  const db = prisma;
  const where = { userLogin: user.login };
  const orderBy = { createdAt: "desc" as const };

  try {
    const investigations = await db.investigation.findMany({
      where,
      orderBy,
      select: { ...BASE_SELECT, parentCaseId: true },
    });
    return NextResponse.json({ investigations, persisted: true });
  } catch (e) {
    if (!isMissingColumn(e)) return NextResponse.json({ investigations: [], persisted: true });
    try {
      const investigations = await db.investigation.findMany({
        where,
        orderBy,
        select: BASE_SELECT,
      });
      return NextResponse.json({ investigations, persisted: true });
    } catch {
      return NextResponse.json({ investigations: [], persisted: true });
    }
  }
}

export async function POST(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!dbEnabled || !prisma) return NextResponse.json({ persisted: false });
  const db = prisma;

  let parsed;
  try {
    parsed = saveSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid investigation payload" }, { status: 400 });
  }

  const { caseId, question, repoPath, location } = parsed;
  const result = parsed.result as Prisma.InputJsonValue;
  const parentCaseId = parsed.parentCaseId ?? null;
  const save = (withParent: boolean) => {
    const fields = {
      question,
      repoPath,
      location,
      result,
      ...(withParent ? { parentCaseId } : {}),
    };
    return db.investigation.upsert({
      where: { userLogin_caseId: { userLogin: user.login, caseId } },
      create: { userLogin: user.login, caseId, ...fields },
      update: fields,
    });
  };

  try {
    await save(true);
    return NextResponse.json({ persisted: true });
  } catch (e) {
    if (isMissingColumn(e)) {
      try {
        await save(false);
        return NextResponse.json({ persisted: true, parentSaved: false });
      } catch {
        return NextResponse.json({ error: "Could not save investigation" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Could not save investigation" }, { status: 500 });
  }
}
