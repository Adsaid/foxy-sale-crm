import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { id } = await params;
  const body = await request.json();

  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { id, teamId: tg.teamId } });
  if (!existing || existing.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.role === "ADMIN" && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hashed = await bcrypt.hash(body.password, 10);
  await prisma.user.update({ where: { id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
