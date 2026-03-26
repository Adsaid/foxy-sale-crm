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
