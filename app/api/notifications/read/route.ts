import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["SALES", "DEV", "ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const { ids, readAll } = body as { ids?: string[]; readAll?: boolean };

  const now = new Date();

  if (readAll) {
    await prisma.notification.updateMany({
      where: {
        userId: user!.id,
        OR: [{ readAt: null }, { readAt: { isSet: false } }],
      },
      data: { readAt: now },
    });
  } else if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: user!.id,
        OR: [{ readAt: null }, { readAt: { isSet: false } }],
      },
      data: { readAt: now },
    });
  } else {
    return NextResponse.json({ error: "ids or readAll required" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
