import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { isDevelopEnv } from "@/lib/app-env";
import { getRegisterSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const allowAdminRegistration = isDevelopEnv();
    const parsed = getRegisterSchema(allowAdminRegistration).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Помилка валідації", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      firstName,
      lastName,
      email,
      password,
      role,
      specialization,
      technologyIds,
      badgeBgColor,
      badgeTextColor,
    } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Користувач з таким email вже існує" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        specialization: role === "DEV" ? specialization : null,
        technologyIds: role === "DEV" && technologyIds ? technologyIds : [],
        badgeBgColor: role === "SALES" ? badgeBgColor ?? null : null,
        badgeTextColor: role === "SALES" ? badgeTextColor ?? null : null,
      },
    });

    const token = await signToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          specialization: user.specialization,
          badgeBgColor: user.badgeBgColor,
          badgeTextColor: user.badgeTextColor,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 }
    );
  }
}
