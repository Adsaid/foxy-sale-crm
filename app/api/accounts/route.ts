import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const accounts = await prisma.account.findMany({
    where: user!.role === "ADMIN" ? {} : { ownerId: user!.id },
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const { account, type, ownerId } = body;

  if (!account || !type) {
    return NextResponse.json({ error: "account and type are required" }, { status: 400 });
  }

  let resolvedOwnerId = user!.id;
  if (user!.role === "ADMIN") {
    if (!ownerId) {
      return NextResponse.json({ error: "ownerId is required for admin" }, { status: 400 });
    }
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, role: true },
    });
    if (!owner || owner.role !== "SALES") {
      return NextResponse.json({ error: "Sales owner not found" }, { status: 404 });
    }
    resolvedOwnerId = owner.id;
  }

  const created = await prisma.account.create({
    data: { account, type, ownerId: resolvedOwnerId },
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

  return NextResponse.json(created, { status: 201 });
}
