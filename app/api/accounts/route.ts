import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import {
  ACCOUNT_DESKTOP_TYPE_VALUES,
  ACCOUNT_OPERATIONAL_STATUS_VALUES,
  ACCOUNT_WARM_UP_STAGE_VALUES,
  parseAccountCountField,
  parseAccountEnumField,
  parseAccountLocationField,
  parseAccountOptionalDate,
} from "@/lib/account-fields";

export async function GET() {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const accounts = await prisma.account.findMany({
    where: user!.role === "ADMIN" ? {} : { ownerId: user!.id },
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const { account, type, ownerId, profileLinks, description } = body;

  if (!account || !type) {
    return NextResponse.json({ error: "account and type are required" }, { status: 400 });
  }

  const op = parseAccountEnumField(body.operationalStatus, ACCOUNT_OPERATIONAL_STATUS_VALUES);
  if (op === "invalid") {
    return NextResponse.json({ error: "Invalid operationalStatus" }, { status: 400 });
  }
  const warm = parseAccountEnumField(body.warmUpStage, ACCOUNT_WARM_UP_STAGE_VALUES);
  if (warm === "invalid") {
    return NextResponse.json({ error: "Invalid warmUpStage" }, { status: 400 });
  }
  const desk = parseAccountEnumField(body.desktopType, ACCOUNT_DESKTOP_TYPE_VALUES);
  if (desk === "invalid") {
    return NextResponse.json({ error: "Invalid desktopType" }, { status: 400 });
  }
  const loc = parseAccountLocationField(body.location);
  if (loc === "invalid") {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }
  const contacts = parseAccountCountField(body.contactsCount);
  if (contacts === "invalid") {
    return NextResponse.json({ error: "Invalid contactsCount" }, { status: 400 });
  }
  const views = parseAccountCountField(body.profileViewsCount);
  if (views === "invalid") {
    return NextResponse.json({ error: "Invalid profileViewsCount" }, { status: 400 });
  }
  const ac = parseAccountOptionalDate(body.accountCreatedAt);
  if (ac === "invalid") {
    return NextResponse.json({ error: "Invalid accountCreatedAt" }, { status: 400 });
  }

  let resolvedOwnerId = user!.id;
  if (user!.role === "ADMIN") {
    if (!ownerId) {
      return NextResponse.json({ error: "ownerId is required for admin" }, { status: 400 });
    }
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, role: true },
    });
    if (!owner || owner.role !== "SALES") {
      return NextResponse.json({ error: "Sales owner not found" }, { status: 404 });
    }
    resolvedOwnerId = owner.id;
  }

  const created = await prisma.account.create({
    data: {
      account,
      type,
      ownerId: resolvedOwnerId,
      profileLinks: Array.isArray(profileLinks) ? profileLinks.filter((l: string) => l.trim()) : [],
      ...(description !== undefined && { description }),
      ...(op !== "omit" && { operationalStatus: op.value }),
      ...(warm !== "omit" && { warmUpStage: warm.value }),
      ...(desk !== "omit" && { desktopType: desk.value }),
      ...(loc !== "omit" && { location: loc.value }),
      ...(contacts !== "omit" && { contactsCount: contacts.value }),
      ...(views !== "omit" && { profileViewsCount: views.value }),
      ...(ac !== "omit" && { accountCreatedAt: ac.value }),
    },
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

  return NextResponse.json(created, { status: 201 });
}
