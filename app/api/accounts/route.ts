import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error, user } = await getApiUser(["SALES"]);
  if (error) return error;

  const accounts = await prisma.account.findMany({
    where: { ownerId: user!.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["SALES"]);
  if (error) return error;

  const body = await request.json();
  const { account, type } = body;

  if (!account || !type) {
    return NextResponse.json({ error: "account and type are required" }, { status: 400 });
  }

  const created = await prisma.account.create({
    data: { account, type, ownerId: user!.id },
  });

  return NextResponse.json(created, { status: 201 });
}
