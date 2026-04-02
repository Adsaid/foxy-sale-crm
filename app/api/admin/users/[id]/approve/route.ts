import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user: actor } = await getApiUser(["ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(actor!);
  if (tg.error) return tg.error;

  const { id } = await params;

  const user = await prisma.user.findFirst({ where: { id, teamId: tg.teamId } });
  if (!user) {
    return NextResponse.json({ error: "Не знайдено" }, { status: 404 });
  }

  if (user.accountStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Обліковий запис уже підтверджено або не очікує схвалення" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { accountStatus: "APPROVED" },
    include: { technologies: true },
  });

  const { password: _, ...safe } = updated;
  return NextResponse.json(safe);
}
