import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const summaries = await prisma.callSummary.findMany({
    where:
      user!.role === "ADMIN" || user!.role === "SUPER_ADMIN"
        ? { teamId: tg.teamId }
        : { createdById: user!.id, teamId: tg.teamId },
    orderBy: { callStartedAt: "desc" },
  });

  const createdByIds = Array.from(new Set(summaries.map((s) => s.createdById)));
  const transferredByIds = Array.from(
    new Set(summaries.map((s) => s.transferredById).filter((id): id is string => Boolean(id)))
  );
  const callEventIds = summaries
    .map((s) => s.callEventId)
    .filter((id): id is string => Boolean(id));

  const usersIds = Array.from(new Set([...createdByIds, ...transferredByIds]));

  const [users, callEvents] = await Promise.all([
    usersIds.length
      ? prisma.user.findMany({
          where: { id: { in: usersIds }, teamId: tg.teamId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            badgeBgColor: true,
            badgeTextColor: true,
          },
        })
      : Promise.resolve([]),
    callEventIds.length
      ? prisma.callEvent.findMany({
          where: { id: { in: callEventIds }, teamId: tg.teamId },
          select: { id: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const callEventById = new Map(callEvents.map((c) => [c.id, c]));

  const payload = summaries.map((s) => {
    const createdBy = usersById.get(s.createdById);
    const transferredBy = s.transferredById ? usersById.get(s.transferredById) : undefined;
    return {
      ...s,
      createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}`.trim() : "—",
      createdByBadgeBgColor: createdBy?.badgeBgColor ?? null,
      createdByBadgeTextColor: createdBy?.badgeTextColor ?? null,
      transferredByName: transferredBy
        ? `${transferredBy.firstName} ${transferredBy.lastName}`.trim()
        : "—",
      transferredByBadgeBgColor: transferredBy?.badgeBgColor ?? null,
      transferredByBadgeTextColor: transferredBy?.badgeTextColor ?? null,
      callCreatedAt: s.callEventId ? callEventById.get(s.callEventId)?.createdAt ?? null : null,
    };
  });

  return NextResponse.json(payload);
}
