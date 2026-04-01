import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: NextRequest) {
  const { error, user } = await getApiUser(["ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const role = request.nextUrl.searchParams.get("role");
  const allowedRoles = ["SALES", "DEV", "DESIGNER", "ADMIN"] as const;
  if (role && !allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    return NextResponse.json({ error: "Некоректний фільтр ролі" }, { status: 400 });
  }
  if (role === "ADMIN" && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      teamId: tg.teamId,
      ...(role
        ? { role: role as "SALES" | "DEV" | "DESIGNER" | "ADMIN" }
        : { role: { in: ["SALES", "DEV", "DESIGNER"] } }),
    },
    include: { technologies: true },
    orderBy: { createdAt: "desc" },
  });

  const safeUsers = users.map(({ password: _, ...u }) => u);
  return NextResponse.json(safeUsers);
}
