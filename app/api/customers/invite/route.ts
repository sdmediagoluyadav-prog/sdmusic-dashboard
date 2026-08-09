import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { customerId, email } = await request.json();

    if (!customerId || !email) {
      return NextResponse.json(
        {
          error: "Customer ID and email are required",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo:
          "https://sdmusic-dashboard.vercel.app/reset-password",
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);

      return NextResponse.json(
        {
          error: inviteError.message,
        },
        { status: 400 }
      );
    }

    const { error: customerError } = await supabaseAdmin
      .from("customers")
      .update({
        auth_user_id: inviteData.user.id,
      })
      .eq("id", customerId);

    if (customerError) {
      console.error("Customer update error:", customerError);

      return NextResponse.json(
        {
          error: customerError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer invite sent successfully",
    });
  } catch (error) {
    console.error("Invite API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 }
    );
  }
}