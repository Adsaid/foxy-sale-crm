import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.user.findFirst({ where: { id, teamId: tg.teamId } });
  if (!existing || existing.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.role === "ADMIN" && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.firstName !== undefined) updateData.firstName = body.firstName;
  if (body.lastName !== undefined) updateData.lastName = body.lastName;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.specialization !== undefined) updateData.specialization = body.specialization || null;
  if (body.technologyIds !== undefined) updateData.technologyIds = body.technologyIds;
  if (existing.role === "SALES") {
    if (body.badgeBgColor !== undefined) updateData.badgeBgColor = body.badgeBgColor || null;
    if (body.badgeTextColor !== undefined) updateData.badgeTextColor = body.badgeTextColor || null;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { technologies: true },
  });

  const { password: _, ...safeUser } = updated;
  return NextResponse.json(safeUser);
}
