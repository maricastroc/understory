import { type NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { dbEnabled, prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const user = currentUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!dbEnabled || !prisma) return NextResponse.json({ deleted: false });

  const { caseId } = await params;
  try {
    await prisma.investigation.deleteMany({ where: { userLogin: user.login, caseId } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Could not delete investigation" }, { status: 500 });
  }
}
