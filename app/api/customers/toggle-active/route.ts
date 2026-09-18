import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const body = await request.json();
    const customerId = body.customer_id;
    const isActive = body.is_active;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be true or false" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const secretKey = process.env.SUPABASE_SECRET_KEY!;

    if (!supabaseUrl || !anonKey || !secretKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    // Check logged-in user
    const supabaseAuth = createClient(
      supabaseUrl,
      anonKey
    );

    const {
      data: userData,
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const loggedInUserId = userData.user.id;

    // Customer accounts cannot change customer status
    const { data: loggedInCustomer } =
      await supabaseAuth
        .from("customers")
        .select("id")
        .eq("auth_user_id", loggedInUserId)
        .maybeSingle();

    if (loggedInCustomer) {
      return NextResponse.json(
        {
          error:
            "Customer accounts cannot change customer status",
        },
        { status: 403 }
      );
    }

    // Server-side admin client
    const supabaseAdmin = createClient(
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

    // Check customer exists
    const {
      data: customer,
      error: customerError,
    } =
      await supabaseAdmin
        .from("customers")
        .select("id, customer_name, email")
        .eq("id", customerId)
        .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Update active status
    const { error: updateError } =
      await supabaseAdmin
        .from("customers")
        .update({
          is_active: isActive,
        })
        .eq("id", customerId);

    if (updateError) {
      console.error(
        "Customer active status update error:",
        updateError
      );

      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      is_active: isActive,
      message: isActive
        ? "Customer activated successfully"
        : "Customer deactivated successfully",
    });
  } catch (error) {
    console.error(
      "Toggle customer active API error:",
      error
    );

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}