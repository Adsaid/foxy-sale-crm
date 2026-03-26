import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const summaries = await prisma.callSummary.findMany({
    where: user!.role === "ADMIN" ? {} : { createdById: user!.id },
    orderBy: { callStartedAt: "desc" },
  });

  return NextResponse.json(summaries);
}
