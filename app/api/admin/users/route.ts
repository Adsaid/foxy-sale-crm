import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const role = request.nextUrl.searchParams.get("role");

  const users = await prisma.user.findMany({
    where: role ? { role: role as "SALES" | "DEV" | "DESIGNER" } : { role: { in: ["SALES", "DEV", "DESIGNER"] } },
    include: { technologies: true },
    orderBy: { createdAt: "desc" },
  });

  const safeUsers = users.map(({ password: _, ...u }) => u);
  return NextResponse.json(safeUsers);
}
