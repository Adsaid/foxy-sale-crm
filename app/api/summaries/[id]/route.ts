import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.callSummary.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.callSummary.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
