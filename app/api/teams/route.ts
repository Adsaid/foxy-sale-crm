import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(
    ["SUPER_ADMIN", "ADMIN", "SALES", "DEV", "DESIGNER"],
    { request },
  );
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "SUPER_ADMIN") {
    const items = await prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ items });
  }

  if (!user.teamId) {
    return NextResponse.json({ items: [] });
  }

  const team = await prisma.team.findUnique({
    where: { id: user.teamId },
    select: { id: true, name: true },
  });
  return NextResponse.json({ items: team ? [team] : [] });
}
