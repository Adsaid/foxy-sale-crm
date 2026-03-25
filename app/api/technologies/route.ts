import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const technologies = await prisma.technology.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(technologies);
}
