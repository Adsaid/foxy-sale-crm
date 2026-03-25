import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error } = await getApiUser(["SALES"]);
  if (error) return error;

  const devs = await prisma.user.findMany({
    where: { role: "DEV" },
    select: {
      id: true,
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
