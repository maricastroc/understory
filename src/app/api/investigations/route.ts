import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { dbEnabled, prisma } from "@/lib/db";

export const runtime = "nodejs";

const saveSchema = z.object({
  caseId: z.string().min(1).max(64),
  question: z.string().max(2000),
  repoPath: z.string().min(1).max(2000),
  location: z.string().min(1).max(2000),
  result: z.record(z.string(), z.unknown()),
});

export function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user || !dbEnabled || !prisma) return NextResponse.json({ investigations: [] });

  return prisma.investigation
    .findMany({
      where: { userLogin: user.login },
      orderBy: { createdAt: "desc" },
      select: {
        caseId: true,
        question: true,
        repoPath: true,
        location: true,
        result: true,
        createdAt: true,
      },
    })
    .then((investigations) => NextResponse.json({ investigations }))
    .catch(() => NextResponse.json({ investigations: [] }));
}

export async function POST(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!dbEnabled || !prisma) return NextResponse.json({ persisted: false });

  let parsed;
  try {
    parsed = saveSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid investigation payload" }, { status: 400 });
  }

  const { caseId, question, repoPath, location } = parsed;
  const result = parsed.result as Prisma.InputJsonValue;
  try {
    await prisma.investigation.upsert({
      where: { userLogin_caseId: { userLogin: user.login, caseId } },
      create: { userLogin: user.login, caseId, question, repoPath, location, result },
      update: { question, repoPath, location, result },
    });
    return NextResponse.json({ persisted: true });
  } catch {
    return NextResponse.json({ error: "Could not save investigation" }, { status: 500 });
  }
}
