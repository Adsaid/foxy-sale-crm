import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike } from "@/lib/roles";
import { createNotification } from "@/lib/notifications";
import { callTypeLabelUk, formatNotificationDateTime } from "@/lib/notification-copy";

export async function GET() {
  const { error, user } = await getApiUser(["SALES", "DEV", "ADMIN"]);
  if (error) return error;

  const where = isSalesLike(user!.role)
    ? user!.role === "ADMIN"
      ? {}
      : { createdById: user!.id }
    : { callerId: user!.id };

  const calls = await prisma.callEvent.findMany({
    where,
    include: {
      account: true,
      caller: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: {
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
    orderBy: { callStartedAt: "desc" },
  });

  return NextResponse.json(calls);
}

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const { accountId, company, interviewerName, callType, callStartedAt, callerId } = body;

  if (!accountId || !company || !interviewerName || !callType || !callStartedAt || !callerId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (
    !account ||
    (user!.role !== "ADMIN" && account.ownerId !== user!.id)
  ) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const createdById = user!.role === "ADMIN" ? account.ownerId : user!.id;

  const call = await prisma.callEvent.create({
    data: {
      accountId,
      company,
      interviewerName,
      callType,
      callStartedAt: new Date(callStartedAt),
      callerId,
      createdById,
    },
    include: {
      account: true,
      caller: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: {
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

  const salesName = `${call.createdBy?.firstName ?? ""} ${call.createdBy?.lastName ?? ""}`.trim();
  const accountLabel = call.account?.account ?? "—";
  const when = formatNotificationDateTime(call.callStartedAt);
  const typeLabel = callTypeLabelUk(call.callType);
  await createNotification({
    userId: call.callerId,
    type: "CALL_ASSIGNED",
    title: `Новий дзвінок — ${call.company}`,
    message: [
      `${salesName} призначив вам дзвінок.`,
      `Компанія: ${call.company}`,
      `Тип: ${typeLabel}`,
      `Час: ${when}`,
      `Інтерв'юер: ${call.interviewerName}`,
      `Акаунт: ${accountLabel}`,
    ].join("\n"),
    payload: {
      callId: call.id,
      company: call.company,
      callType: call.callType,
      callStartedAt: call.callStartedAt.toISOString(),
      interviewerName: call.interviewerName,
      accountName: accountLabel,
    },
  }).catch((err) => {
    console.error("[notification] CALL_ASSIGNED", err);
  });

  return NextResponse.json(call, { status: 201 });
}
