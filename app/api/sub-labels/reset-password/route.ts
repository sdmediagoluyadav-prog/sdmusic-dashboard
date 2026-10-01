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
      authHeader.replace("Bearer ", "").trim();

    const body = await request.json();

    const subLabelId =
      Number(body.sub_label_id);

    const password =
      String(body.password || "");

    if (!subLabelId) {
      return NextResponse.json(
        {
          error: "Sub Label ID is required",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Password कम से कम 6 characters का होना चाहिए",
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

    /*
     * Check currently logged-in user
     */
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

    const loggedInUserId =
      userData.user.id;

    /*
     * Admin client
     */
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

    /*
     * Find customer account
     */
    const {
      data: customer,
      error: customerError,
    } =
      await supabaseAdmin
        .from("customers")
        .select(
          "id, auth_user_id"
        )
        .eq(
          "auth_user_id",
          loggedInUserId
        )
        .maybeSingle();

    if (
      customerError ||
      !customer
    ) {
      return NextResponse.json(
        {
          error:
            "Customer account not found",
        },
        { status: 403 }
      );
    }

    /*
     * Find Sub Label and make sure
     * it belongs to this Customer
     */
    const {
      data: subLabel,
      error: subLabelError,
    } =
      await supabaseAdmin
        .from("sub_labels")
        .select(
          "id, customer_id, auth_user_id, sub_label_name"
        )
        .eq(
          "id",
          subLabelId
        )
        .eq(
          "customer_id",
          customer.id
        )
        .maybeSingle();

    if (
      subLabelError ||
      !subLabel
    ) {
      return NextResponse.json(
        {
          error:
            "Sub Label not found or access denied",
        },
        { status: 404 }
      );
    }

    if (!subLabel.auth_user_id) {
      return NextResponse.json(
        {
          error:
            "Sub Label का Auth account नहीं मिला",
        },
        { status: 400 }
      );
    }

    /*
     * Update Sub Label password
     */
    const {
      error: updateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        subLabel.auth_user_id,
        {
          password,
        }
      );

    if (updateError) {
      console.error(
        "Sub Label password update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Sub Label password successfully reset",
      subLabelName:
        subLabel.sub_label_name,
    });
  } catch (error) {
    console.error(
      "Sub Label password reset error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Password reset karte waqt error aa gaya",
      },
      { status: 500 }
    );
  }
}