import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { normalizeEmail } from "@/lib/normalize-email";
import { effectiveAccountStatus } from "@/lib/account-status";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Помилка валідації", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const emailNorm = normalizeEmail(email);
    const trimmed = email.trim();

    let user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user && trimmed !== emailNorm) {
      user = await prisma.user.findUnique({ where: { email: trimmed } });
    }
    if (!user) {
      return NextResponse.json(
        { error: "Невірний email або пароль" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Невірний email або пароль" },
        { status: 401 }
      );
    }

    const token = await signToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        accountStatus: effectiveAccountStatus(user),
        specialization: user.specialization,
        badgeBgColor: user.badgeBgColor,
        badgeTextColor: user.badgeTextColor,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 }
    );
  }
}
