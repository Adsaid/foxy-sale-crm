import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TechStack } from "@prisma/client";

const VALID_STACKS: TechStack[] = ["DEV", "DESIGNER"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") as TechStack | null;

  const where =
    audience && VALID_STACKS.includes(audience)
      ? { stackAudience: audience }
      : {};

  const technologies = await prisma.technology.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(technologies);
}
