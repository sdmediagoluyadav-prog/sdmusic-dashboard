import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accessToken =
      authHeader.replace("Bearer ", "");

    const body = await request.json();

    const customerId =
      body.customer_id;

    if (!customerId) {
      return NextResponse.json(
        {
          error: "Customer ID is required",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY!;

    if (
      !supabaseUrl ||
      !anonKey ||
      !secretKey
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase configuration missing",
        },
        { status: 500 }
      );
    }

    // Verify logged-in user
    const supabaseAuth =
      createClient(
        supabaseUrl,
        anonKey
      );

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAuth.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired session",
        },
        { status: 401 }
      );
    }

    const adminUserId =
      userData.user.id;

    // Customer account cannot reset
    // another customer's password
    const {
      data: loggedInCustomer,
    } = await supabaseAuth
      .from("customers")
      .select("id")
      .eq(
        "auth_user_id",
        adminUserId
      )
      .maybeSingle();

    if (loggedInCustomer) {
      return NextResponse.json(
        {
          error:
            "Customer accounts cannot reset customer passwords",
        },
        { status: 403 }
      );
    }

    // Server-side admin client
    const supabaseAdmin =
      createClient(
        supabaseUrl,
        secretKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

    // Get customer email
    const {
      data: customer,
      error: customerError,
    } =
      await supabaseAdmin
        .from("customers")
        .select(
          "id, customer_name, email, auth_user_id"
        )
        .eq("id", customerId)
        .single();

    if (
      customerError ||
      !customer
    ) {
      return NextResponse.json(
        {
          error:
            "Customer not found",
        },
        { status: 404 }
      );
    }

    if (!customer.email) {
      return NextResponse.json(
        {
          error:
            "Customer email not found",
        },
        { status: 400 }
      );
    }

    // Send password reset email
    const {
      error: resetError,
    } =
      await supabaseAdmin.auth
        .resetPasswordForEmail(
          customer.email,
          {
            redirectTo:
              "https://sdmusic-dashboard.vercel.app/reset-password",
          }
        );

    if (resetError) {
      console.error(
        "Password reset error:",
        resetError
      );

      return NextResponse.json(
        {
          error:
            resetError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Password reset email sent successfully",
    });
  } catch (error) {
    console.error(
      "Reset password API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong",
      },
      { status: 500 }
    );
  }
}