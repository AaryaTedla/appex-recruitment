import { NextResponse } from "next/server";
import { hasApiRole } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function PUT(request: Request) {
  try {
    if (!await hasApiRole(["admin"])) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const body = await request.json();
    if (typeof body?.open !== "boolean") return NextResponse.json({ error: "Choose open or closed." }, { status: 400 });
    const { data, error } = await createServiceClient().from("recruitment_settings")
      .update({ test_open: body.open, updated_at: new Date().toISOString() }).eq("id", 1).select("test_open").single();
    if (error || !data) throw error;
    return NextResponse.json({ open: data.test_open });
  } catch {
    return NextResponse.json({ error: "Could not change test availability. Try again." }, { status: 500 });
  }
}
