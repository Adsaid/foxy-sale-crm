import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.account.findUnique({ where: { id } });
  if (
    !existing ||
    (user!.role !== "ADMIN" && existing.ownerId !== user!.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.ownerId !== undefined && user!.role === "ADMIN") {
    const owner = await prisma.user.findUnique({
      where: { id: body.ownerId },
      select: { id: true, role: true },
    });
    if (!owner || owner.role !== "SALES") {
      return NextResponse.json({ error: "Sales owner not found" }, { status: 404 });
    }
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(body.account !== undefined && { account: body.account }),
      ...(body.type !== undefined && { type: body.type }),
      ...(user!.role === "ADMIN" && body.ownerId !== undefined && { ownerId: body.ownerId }),
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          badgeBgColor: true,
          badgeTextColor: true,
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.account.findUnique({ where: { id } });
  if (
    !existing ||
    (user!.role !== "ADMIN" && existing.ownerId !== user!.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
