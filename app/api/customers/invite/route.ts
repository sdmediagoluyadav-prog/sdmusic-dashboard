import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { customerId, email } = await request.json();

    if (!customerId || !email) {
      return NextResponse.json(
        { error: "Customer ID and email are required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const secretKey = process.env.SUPABASE_SECRET_KEY!;

    const supabaseAdmin = createClient(
      supabaseUrl,
      secretKey
    );

    // Check existing users
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      return NextResponse.json(
        { error: usersError.message },
        { status: 400 }
      );
    }

    const existingUser = usersData.users.find(
      (user) =>
        user.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    // Existing account
    if (existingUser) {
      userId = existingUser.id;

      // Connect customer with Auth user
      const { error: updateError } = await supabaseAdmin
        .from("customers")
        .update({
          auth_user_id: userId,
        })
        .eq("id", customerId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }

      // Send NEW password reset email
      const supabasePublic = createClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: resetError } =
        await supabasePublic.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              "https://sdmusic-dashboard.vercel.app/reset-password",
          }
        );

      if (resetError) {
        console.error("Reset email error:", resetError);

        return NextResponse.json(
          { error: resetError.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        existingUser: true,
        message:
          "Password reset email sent successfully",
      });
    }

    // New account
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo:
            "https://sdmusic-dashboard.vercel.app/reset-password",
        }
      );

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    userId = inviteData.user.id;

    // Connect customer with Auth user
    const { error: customerError } =
      await supabaseAdmin
        .from("customers")
        .update({
          auth_user_id: userId,
        })
        .eq("id", customerId);

    if (customerError) {
      return NextResponse.json(
        { error: customerError.message },
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
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}