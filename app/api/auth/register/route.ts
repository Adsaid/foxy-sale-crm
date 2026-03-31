import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { isDevelopEnv } from "@/lib/app-env";
import { getRegisterSchema } from "@/lib/validations/auth";
import { normalizeEmail } from "@/lib/normalize-email";
import { effectiveAccountStatus } from "@/lib/account-status";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const allowAdminRegistration = isDevelopEnv();
    const parsed = getRegisterSchema(allowAdminRegistration).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Помилка валідації", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const raw = parsed.data;
    const invitationCode =
      typeof raw.invitationCode === "string" && raw.invitationCode.trim()
        ? raw.invitationCode.trim()
        : undefined;

    const emailNorm = normalizeEmail(raw.email);

    let effectiveRole: Role = raw.role;
    let accountStatus: "APPROVED" | "PENDING" = "PENDING";

    if (invitationCode) {
      const invitation = await prisma.invitation.findUnique({
        where: { code: invitationCode },
      });
      if (!invitation || invitation.usedAt) {
        return NextResponse.json(
          { error: "Недійсне або вже використане запрошення" },
          { status: 400 },
        );
      }
      if (normalizeEmail(invitation.email) !== emailNorm) {
        return NextResponse.json(
          { error: "Email має збігатися з тим, що вказано в запрошенні" },
          { status: 400 },
        );
      }
      if (invitation.role === "ADMIN") {
        return NextResponse.json(
          { error: "Запрошення з роллю Admin не підтримується" },
          { status: 400 },
        );
      }
      effectiveRole = invitation.role;
      accountStatus = "APPROVED";
    }
    /** Адмін реєструється лише в dev (схема); одразу активний, без очікування схвалення. */
    if (effectiveRole === "ADMIN") {
      accountStatus = "APPROVED";
    }
    /** Відкрита реєстрація (не запрошення): SALES/DEV/DESIGNER — PENDING до схвалення адміном. */

    const {
      firstName,
      lastName,
      password,
      specialization,
      technologyIds,
      badgeBgColor,
      badgeTextColor,
    } = raw;

    if (effectiveRole === "DEV" || effectiveRole === "DESIGNER") {
      if (!specialization || !technologyIds?.length) {
        return NextResponse.json(
          { error: "Для цієї ролі потрібні спеціалізація та технології" },
          { status: 400 },
        );
      }
      const devSpecs = ["FRONTEND", "BACKEND", "FULLSTACK"] as const;
      const designerSpecs = ["UX_UI", "UI", "UX"] as const;
      if (effectiveRole === "DEV" && !devSpecs.includes(specialization as (typeof devSpecs)[number])) {
        return NextResponse.json(
          { error: "Некоректна спеціалізація для ролі розробника" },
          { status: 400 },
        );
      }
      if (effectiveRole === "DESIGNER" && !designerSpecs.includes(specialization as (typeof designerSpecs)[number])) {
        return NextResponse.json(
          { error: "Некоректна спеціалізація для ролі дизайнера" },
          { status: 400 },
        );
      }
      const expectedAudience = effectiveRole === "DEV" ? "DEV" : "DESIGNER";
      const techRows = await prisma.technology.findMany({
        where: { id: { in: technologyIds } },
        select: { id: true, stackAudience: true },
      });
      if (techRows.length !== technologyIds.length) {
        return NextResponse.json(
          { error: "Знайдено невідомі або недійсні технології" },
          { status: 400 },
        );
      }
      if (techRows.some((t) => t.stackAudience !== expectedAudience)) {
        return NextResponse.json(
          { error: "Обрані технології не відповідають ролі" },
          { status: 400 },
        );
      }
    }
    if (effectiveRole === "SALES") {
      if (!badgeBgColor || !badgeTextColor) {
        return NextResponse.json(
          { error: "Для ролі Sales потрібні кольори бейджа" },
          { status: 400 },
        );
      }
    }

    const existing = await prisma.user.findUnique({
      where: { email: emailNorm },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Користувач з таким email вже існує" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: emailNorm,
        password: hashedPassword,
        role: effectiveRole,
        accountStatus,
        specialization: effectiveRole === "DEV" || effectiveRole === "DESIGNER" ? specialization : null,
        technologyIds:
          (effectiveRole === "DEV" || effectiveRole === "DESIGNER") && technologyIds ? technologyIds : [],
        badgeBgColor: effectiveRole === "SALES" ? badgeBgColor ?? null : null,
        badgeTextColor:
          effectiveRole === "SALES" ? badgeTextColor ?? null : null,
      },
    });

    if (invitationCode) {
      await prisma.invitation.updateMany({
        where: { code: invitationCode, usedAt: null },
        data: {
          usedAt: new Date(),
          usedByUserId: user.id,
        },
      });
    }

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
          accountStatus: effectiveAccountStatus(user),
          specialization: user.specialization,
          badgeBgColor: user.badgeBgColor,
          badgeTextColor: user.badgeTextColor,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}
