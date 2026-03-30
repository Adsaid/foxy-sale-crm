import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Не знайдено" }, { status: 404 });
  }

  if (user.accountStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Обліковий запис уже підтверджено або не очікує схвалення" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { accountStatus: "APPROVED" },
    include: { technologies: true },
  });

  const { password: _, ...safe } = updated;
  return NextResponse.json(safe);
}
