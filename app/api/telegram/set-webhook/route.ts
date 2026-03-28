import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { setTelegramWebhook } from "@/lib/telegram";

export async function POST(request: Request) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const baseUrl =
    (body.baseUrl as string) || process.env.NEXT_PUBLIC_BASE_URL || "";

  if (!baseUrl) {
    return NextResponse.json(
      { error: "baseUrl or NEXT_PUBLIC_BASE_URL required" },
      { status: 400 }
    );
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  const result = await setTelegramWebhook(webhookUrl);

  return NextResponse.json({ webhookUrl, ...result });
}
