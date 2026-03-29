import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { accountTypeLabelUk } from "@/lib/notification-copy";
import {
  ACCOUNT_DESKTOP_TYPE_VALUES,
  ACCOUNT_OPERATIONAL_STATUS_VALUES,
  ACCOUNT_WARM_UP_STAGE_VALUES,
  parseAccountCountField,
  parseAccountEnumField,
  parseAccountLocationField,
  parseAccountOptionalDate,
} from "@/lib/account-fields";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.account.findUnique({ where: { id } });
  if (
    !existing ||
    (user!.role !== "ADMIN" && existing.ownerId !== user!.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.ownerId !== undefined && user!.role === "ADMIN") {
    const owner = await prisma.user.findUnique({
      where: { id: body.ownerId },
      select: { id: true, role: true },
    });
    if (!owner || owner.role !== "SALES") {
      return NextResponse.json({ error: "Sales owner not found" }, { status: 404 });
    }
  }

  const adminIsEditing = user!.role === "ADMIN";
  const ownerWillChange =
    adminIsEditing && body.ownerId !== undefined && body.ownerId !== existing.ownerId;

  const fieldsChanged =
    (body.account !== undefined && body.account !== existing.account) ||
    (body.type !== undefined && body.type !== existing.type);

  const data: Prisma.AccountUpdateInput = {
    ...(body.account !== undefined && { account: body.account }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.profileLinks !== undefined && {
      profileLinks: Array.isArray(body.profileLinks)
        ? body.profileLinks.filter((l: string) => l.trim())
        : [],
    }),
    ...(body.description !== undefined && { description: body.description || null }),
    ...(user!.role === "ADMIN" && body.ownerId !== undefined && { ownerId: body.ownerId }),
  };

  if ("operationalStatus" in body) {
    const p = parseAccountEnumField(body.operationalStatus, ACCOUNT_OPERATIONAL_STATUS_VALUES);
    if (p === "invalid") {
      return NextResponse.json({ error: "Invalid operationalStatus" }, { status: 400 });
    }
    if (p !== "omit") data.operationalStatus = p.value;
  }
  if ("warmUpStage" in body) {
    const p = parseAccountEnumField(body.warmUpStage, ACCOUNT_WARM_UP_STAGE_VALUES);
    if (p === "invalid") {
      return NextResponse.json({ error: "Invalid warmUpStage" }, { status: 400 });
    }
    if (p !== "omit") data.warmUpStage = p.value;
  }
  if ("desktopType" in body) {
    const p = parseAccountEnumField(body.desktopType, ACCOUNT_DESKTOP_TYPE_VALUES);
    if (p === "invalid") {
      return NextResponse.json({ error: "Invalid desktopType" }, { status: 400 });
    }
    if (p !== "omit") data.desktopType = p.value;
  }
  if ("location" in body) {
    const p = parseAccountLocationField(body.location);
    if (p === "invalid") {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
    if (p !== "omit") data.location = p.value;
  }
  if ("contactsCount" in body) {
    const p = parseAccountCountField(body.contactsCount);
    if (p === "invalid") {
      return NextResponse.json({ error: "Invalid contactsCount" }, { status: 400 });
    }
    if (p !== "omit") data.contactsCount = p.value;
  }
  if ("profileViewsCount" in body) {
    const p = parseAccountCountField(body.profileViewsCount);
    if (p === "invalid") {
      return NextResponse.json({ error: "Invalid profileViewsCount" }, { status: 400 });
    }
    if (p !== "omit") data.profileViewsCount = p.value;
  }
  if ("accountCreatedAt" in body) {
    const p = parseAccountOptionalDate(body.accountCreatedAt);
    if (p === "invalid") {
      return NextResponse.json({ error: "Invalid accountCreatedAt" }, { status: 400 });
    }
    if (p !== "omit") data.accountCreatedAt = p.value;
  }

  const updated = await prisma.account.update({
    where: { id },
    data,
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          badgeBgColor: true,
          badgeTextColor: true,
        },
      },
    },
  });

  const adminName =
    user!.role === "ADMIN"
      ? `${user!.firstName} ${user!.lastName}`.trim() || "Адміністратор"
      : "Адміністратор";

  if (body.ownerId !== undefined && user!.role === "ADMIN" && body.ownerId !== existing.ownerId) {
    await createNotification({
      userId: body.ownerId,
      type: "ACCOUNT_REASSIGNED",
      title: `Новий акаунт — ${updated.account}`,
      telegramActorName: adminName || undefined,
      telegramActorBadgeBgColor: user!.badgeBgColor,
      telegramActorBadgeTextColor: user!.badgeTextColor,
      message: [
        `${adminName} передав вам акаунт.`,
        `Назва: ${updated.account}`,
        `Тип платформи: ${accountTypeLabelUk(updated.type)}`,
        `ID акаунта в CRM: ${updated.id}`,
      ].join("\n"),
      payload: {
        accountId: updated.id,
        accountName: updated.account,
        accountType: updated.type,
        reassignedByAdminId: user!.id,
      },
    }).catch((err) => console.error("[notification] ACCOUNT_REASSIGNED", err));
  }

  // Якщо адмін редагує акаунт (назва/тип) і власник не змінюється — повідомити власника,
  // щоб не було “тихо змінили”.
  if (adminIsEditing && fieldsChanged && !ownerWillChange) {
    const nameLines: string[] = [`${adminName} оновив ваш акаунт.`];
    if (body.account !== undefined && body.account !== existing.account) {
      nameLines.push(`Назва: ${existing.account} → ${updated.account}`);
    } else {
      nameLines.push(`Назва: ${updated.account}`);
    }
    if (body.type !== undefined && body.type !== existing.type) {
      nameLines.push(
        `Тип: ${accountTypeLabelUk(existing.type)} → ${accountTypeLabelUk(updated.type)}`
      );
    } else {
      nameLines.push(`Тип: ${accountTypeLabelUk(updated.type)}`);
    }
    nameLines.push(`ID акаунта в CRM: ${updated.id}`);
    await createNotification({
      userId: existing.ownerId,
      type: "ACCOUNT_UPDATED_BY_ADMIN",
      title: `Акаунт оновлено — ${updated.account}`,
      telegramActorName: adminName || undefined,
      telegramActorBadgeBgColor: user!.badgeBgColor,
      telegramActorBadgeTextColor: user!.badgeTextColor,
      message: nameLines.join("\n"),
      payload: {
        accountId: updated.id,
        accountName: updated.account,
        prevAccountName: existing.account,
        prevType: existing.type,
        newType: updated.type,
      },
    }).catch((err) => console.error("[notification] ACCOUNT_UPDATED_BY_ADMIN", err));
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.account.findUnique({ where: { id } });
  if (
    !existing ||
    (user!.role !== "ADMIN" && existing.ownerId !== user!.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
