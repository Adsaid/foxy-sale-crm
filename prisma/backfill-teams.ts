import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_TEAM_NAME = process.env.DEFAULT_TEAM_NAME?.trim() || "Default Team";
const missingTeamWhere = {
  OR: [{ teamId: null }, { teamId: { isSet: false } }],
};

async function ensureDefaultTeam() {
  const existing = await prisma.team.findFirst({
    where: { name: DEFAULT_TEAM_NAME },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.team.create({
    data: { name: DEFAULT_TEAM_NAME, status: "APPROVED" },
    select: { id: true, name: true },
  });
}

async function main() {
  const defaultTeam = await ensureDefaultTeam();
  console.log(`[backfill-teams] using team "${defaultTeam.name}" (${defaultTeam.id})`);

  const usersWithoutTeam = await prisma.user.findMany({
    where: missingTeamWhere,
    select: { id: true },
  });
  if (usersWithoutTeam.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: usersWithoutTeam.map((u) => u.id) } },
      data: { teamId: defaultTeam.id },
    });
  }

  const accountsWithoutTeam = await prisma.account.findMany({
    where: missingTeamWhere,
    select: { id: true, ownerId: true },
  });
  for (const row of accountsWithoutTeam) {
    const owner = await prisma.user.findUnique({
      where: { id: row.ownerId },
      select: { teamId: true },
    });
    await prisma.account.update({
      where: { id: row.id },
      data: { teamId: owner?.teamId ?? defaultTeam.id },
    });
  }

  const callsWithoutTeam = await prisma.callEvent.findMany({
    where: missingTeamWhere,
    select: { id: true, accountId: true, createdById: true },
  });
  for (const row of callsWithoutTeam) {
    const account = await prisma.account.findUnique({
      where: { id: row.accountId },
      select: { teamId: true },
    });
    const createdBy = await prisma.user.findUnique({
      where: { id: row.createdById },
      select: { teamId: true },
    });
    await prisma.callEvent.update({
      where: { id: row.id },
      data: { teamId: account?.teamId ?? createdBy?.teamId ?? defaultTeam.id },
    });
  }

  const summariesWithoutTeam = await prisma.callSummary.findMany({
    where: missingTeamWhere,
    select: { id: true, callEventId: true, createdById: true },
  });
  for (const row of summariesWithoutTeam) {
    const call = row.callEventId
      ? await prisma.callEvent.findUnique({
          where: { id: row.callEventId },
          select: { teamId: true },
        })
      : null;
    const createdBy = await prisma.user.findUnique({
      where: { id: row.createdById },
      select: { teamId: true },
    });
    await prisma.callSummary.update({
      where: { id: row.id },
      data: { teamId: call?.teamId ?? createdBy?.teamId ?? defaultTeam.id },
    });
  }

  const reportsWithoutTeam = await prisma.salesAccountReport.findMany({
    where: missingTeamWhere,
    select: { id: true, submittedById: true },
  });
  for (const row of reportsWithoutTeam) {
    const owner = await prisma.user.findUnique({
      where: { id: row.submittedById },
      select: { teamId: true },
    });
    await prisma.salesAccountReport.update({
      where: { id: row.id },
      data: { teamId: owner?.teamId ?? defaultTeam.id },
    });
  }

  const invitationsWithoutTeam = await prisma.invitation.findMany({
    where: missingTeamWhere,
    select: { id: true, createdById: true },
  });
  for (const row of invitationsWithoutTeam) {
    const owner = await prisma.user.findUnique({
      where: { id: row.createdById },
      select: { teamId: true },
    });
    await prisma.invitation.update({
      where: { id: row.id },
      data: { teamId: owner?.teamId ?? defaultTeam.id },
    });
  }

  const notificationsWithoutTeam = await prisma.notification.findMany({
    where: missingTeamWhere,
    select: { id: true, userId: true },
  });
  for (const row of notificationsWithoutTeam) {
    const user = await prisma.user.findUnique({
      where: { id: row.userId },
      select: { teamId: true },
    });
    await prisma.notification.update({
      where: { id: row.id },
      data: { teamId: user?.teamId ?? defaultTeam.id },
    });
  }

  console.log("[backfill-teams] done");
}

main()
  .catch((error) => {
    console.error("[backfill-teams] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
