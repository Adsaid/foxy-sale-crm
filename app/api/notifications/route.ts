import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "DEV", "DESIGNER", "ADMIN"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const where: Record<string, unknown> = { userId: user!.id };
  if (since) {
    where.createdAt = { gt: new Date(since) };
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    notifications,
    serverNow: new Date().toISOString(),
  });
}
