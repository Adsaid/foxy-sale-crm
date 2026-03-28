import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  payload?: Prisma.InputJsonValue;
  dedupeKey?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: { ...input, readAt: null } });
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  return prisma.notification.createMany({ data: inputs.map((i) => ({ ...i, readAt: null })) });
}

/** Усім користувачам з роллю ADMIN (без dedupeKey — для кожного окремий запис). */
export async function notifyAllAdmins(
  input: Omit<CreateNotificationInput, "userId" | "dedupeKey">
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await createNotifications(
    admins.map((a) => ({
      ...input,
      userId: a.id,
    }))
  );
}
