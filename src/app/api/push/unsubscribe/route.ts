/**
 * Unsubscribe from push notifications.
 * Deletes the device's push subscription and all reminder schedules.
 * CASCADE delete in the database handles cleanup automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/push/supabase";

export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
    }

    await deletePushSubscription(deviceId);

    return NextResponse.json({ success: true, message: "Unsubscribed from reminders" });
  } catch (error: unknown) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
