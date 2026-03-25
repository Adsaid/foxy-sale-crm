import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role === "ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.firstName !== undefined) updateData.firstName = body.firstName;
  if (body.lastName !== undefined) updateData.lastName = body.lastName;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.specialization !== undefined) updateData.specialization = body.specialization || null;
  if (body.technologyIds !== undefined) updateData.technologyIds = body.technologyIds;

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { technologies: true },
  });

  const { password: _, ...safeUser } = updated;
  return NextResponse.json(safeUser);
}
