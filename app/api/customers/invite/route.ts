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

    // Check whether this email already has an Auth account
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      console.error("Users fetch error:", usersError);

      return NextResponse.json(
        {
          error: usersError.message,
        },
        { status: 400 }
      );
    }

    const existingUser = usersData.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    // Existing user
    if (existingUser) {
      userId = existingUser.id;

      const { error: updateError } = await supabaseAdmin
        .from("customers")
        .update({
          auth_user_id: userId,
        })
        .eq("id", customerId);

      if (updateError) {
        console.error("Customer update error:", updateError);

        return NextResponse.json(
          {
            error: updateError.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        existingUser: true,
        message:
          "This email is already registered. Customer account has been connected.",
      });
    }

    // New user
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

    userId = inviteData.user.id;

    // Connect Auth user with customer
    const { error: customerError } = await supabaseAdmin
      .from("customers")
      .update({
        auth_user_id: userId,
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
      existingUser: false,
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