import { createNotification, notifyAllAdmins } from "@/lib/notifications";
import {
  callTypeLabelUk,
  formatNotificationDateTime,
  notifVerbPast,
} from "@/lib/notification-copy";
import { callerRoleShortEn } from "@/lib/roles";

/** Мінімальні поля дзвінка після create/update з include як у POST / PATCH. */
export type CallAssignedNotifShape = {
  id: string;
  teamId?: string | null;
  company: string;
  callType: string;
  callStartedAt: Date;
  interviewerName: string;
  callerId: string;
  caller: { firstName: string; lastName: string; role?: string } | null;
  account: { account: string } | null;
  createdBy: {
    firstName: string;
    lastName: string;
    badgeBgColor?: string | null;
    badgeTextColor?: string | null;
  } | null;
};

/**
 * Сповіщення новому виконавцю (CALL_ASSIGNED) і всім адмінам — той самий текст, що при створенні дзвінка.
 */
export async function notifyCallAssignedToDevAndAdmins(
  call: CallAssignedNotifShape
): Promise<void> {
  const salesName = `${call.createdBy?.firstName ?? ""} ${call.createdBy?.lastName ?? ""}`.trim();
  const devName = `${call.caller?.firstName ?? ""} ${call.caller?.lastName ?? ""}`.trim();
  const callerRole = call.caller?.role ?? "DEV";
  const accountLabel = call.account?.account ?? "—";
  const when = formatNotificationDateTime(call.callStartedAt);
  const typeLabel = callTypeLabelUk(call.callType);
  const assignedMessage = [
    `${salesName} ${notifVerbPast.assignedCall} вам дзвінок.`,
    `Компанія: ${call.company}`,
    `Тип: ${typeLabel}`,
    `Час: ${when}`,
    `Інтерв'юер: ${call.interviewerName}`,
    `Акаунт: ${accountLabel}`,
  ].join("\n");
  const assignedPayload = {
    callId: call.id,
    company: call.company,
    callType: call.callType,
    callStartedAt: call.callStartedAt.toISOString(),
    interviewerName: call.interviewerName,
    accountName: accountLabel,
  };

  await createNotification({
    userId: call.callerId,
    teamId: call.teamId ?? null,
    type: "CALL_ASSIGNED",
    title: `Новий дзвінок — ${call.company}`,
    message: assignedMessage,
    telegramActorName: salesName || undefined,
    telegramActorBadgeBgColor: call.createdBy?.badgeBgColor,
    telegramActorBadgeTextColor: call.createdBy?.badgeTextColor,
    payload: assignedPayload,
  }).catch((err) => {
    console.error("[notification] CALL_ASSIGNED", err);
  });

  const adminAssigneePhrase = devName
    ? `${devName} (${callerRoleShortEn(callerRole)})`
    : `виконавцю (${callerRoleShortEn(callerRole)})`;

  await notifyAllAdmins({
    teamId: call.teamId ?? null,
    type: "CALL_ASSIGNED",
    title: `Новий дзвінок — ${call.company}`,
    telegramActorName: salesName || undefined,
    telegramActorBadgeBgColor: call.createdBy?.badgeBgColor,
    telegramActorBadgeTextColor: call.createdBy?.badgeTextColor,
    message: [
      `${salesName} ${notifVerbPast.assignedCall} дзвінок ${adminAssigneePhrase}.`,
      `Компанія: ${call.company}`,
      `Тип: ${typeLabel}`,
      `Час: ${when}`,
      `Інтерв'юер: ${call.interviewerName}`,
      `Акаунт: ${accountLabel}`,
    ].join("\n"),
    payload: assignedPayload,
  }).catch((err) => console.error("[notification] CALL_ASSIGNED admin", err));
}
