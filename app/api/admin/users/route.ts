import { NextResponse } from "next/server";
import { hasApiRole } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { isAllowedAdminEmail } from "@/lib/auth/adminAllowlist";

const ROLES = new Set(["evaluator", "admin"]);

export async function POST(request: Request) {
  const identity = await hasApiRole(["admin"]);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "evaluator");
    if (!email.includes("@") || password.length < 8 || !ROLES.has(role)) {
      return NextResponse.json({ error: "Enter a valid email, an 8+ character password, and a valid role." }, { status: 400 });
    }
    if (!isAllowedAdminEmail(email)) {
      return NextResponse.json({ error: "This email is not authorized for APPEX admin access." }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message?.includes("already") ? "An Auth user with this email already exists." : "Could not create the Auth user." }, { status: 400 });
    }

    const { error: profileError } = await supabase.from("profiles").insert({ id: data.user.id, role });
    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }

    return NextResponse.json({ created: true });
  } catch (error) {
    console.error("admin user create error", error);
    return NextResponse.json({ error: "Could not create evaluator account." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const identity = await hasApiRole(["admin"]);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const userId = String(body.userId || "");
    const role = String(body.role || "");
    if (!userId || !ROLES.has(role)) return NextResponse.json({ error: "Invalid user or role." }, { status: 400 });
    if (userId === identity.user.id) return NextResponse.json({ error: "You cannot change your own APPEX role here." }, { status: 409 });

    const supabase = createServiceClient();
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user || !isAllowedAdminEmail(userData.user.email)) {
      return NextResponse.json({ error: "This email is not authorized for APPEX admin access." }, { status: 403 });
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, role }, { onConflict: "id" });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("admin user role error", error);
    return NextResponse.json({ error: "Could not update evaluator role." }, { status: 500 });
  }
}
