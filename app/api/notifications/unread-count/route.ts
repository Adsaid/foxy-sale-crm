import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;

  const count = await prisma.notification.count({
    where: {
      userId: user!.id,
      OR: [{ readAt: null }, { readAt: { isSet: false } }],
    },
  });

  return NextResponse.json({ count });
}
