import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const devs = await prisma.user.findMany({
    where: { role: { in: ["DEV", "DESIGNER"] }, teamId: tg.teamId },
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      email: true,
      specialization: true,
      technologies: { select: { id: true, name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json(devs);
}
