import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role === "ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hashed = await bcrypt.hash(body.password, 10);
  await prisma.user.update({ where: { id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
