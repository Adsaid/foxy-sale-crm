import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { normalizeEmail } from "@/lib/normalize-email";
import type { Role } from "@prisma/client";

const INVITE_ROLES: Role[] = ["SALES", "DEV", "DESIGNER"];

export async function GET() {
  const { error, user } = await getApiUser(["ADMIN"]);
  if (error) return error;
  void user;

  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json(invitations);
}

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["ADMIN"]);
  if (error) return error;
  if (!user) return error;

  const body = await request.json();
  const emailRaw = typeof body.email === "string" ? body.email : "";
  const role = body.role as Role | undefined;

  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Некоректний email" }, { status: 400 });
  }
  if (!role || !INVITE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Роль має бути Sales, Developer або Designer" },
      { status: 400 },
    );
  }

  const code = randomBytes(24).toString("hex");

  const invitation = await prisma.invitation.create({
    data: {
      code,
      email,
      role,
      createdById: user.id,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json(invitation, { status: 201 });
}
