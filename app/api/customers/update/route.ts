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

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY!;

    if (!supabaseUrl || !anonKey || !secretKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    // Verify logged-in user
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

    const adminUserId = userData.user.id;

    // Admin check:
    // Customer accounts have a row in customers.
    // The admin account should not have a customer row.
    const { data: loggedInCustomer } =
      await supabaseAuth
        .from("customers")
        .select("id")
        .eq("auth_user_id", adminUserId)
        .maybeSingle();

    if (loggedInCustomer) {
      return NextResponse.json(
        { error: "Customer accounts cannot edit customers" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const customerId = body.customer_id;
    const customerName = body.customer_name?.trim();
    const labelName = body.label_name?.trim();

    if (!customerId || !customerName) {
      return NextResponse.json(
        {
          error: "Customer ID and Customer Name are required",
        },
        { status: 400 }
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

    const { data: updatedCustomer, error } =
      await supabaseAdmin
        .from("customers")
        .update({
          customer_name: customerName,
          label_name: labelName || null,
        })
        .eq("id", customerId)
        .select()
        .single();

    if (error) {
      console.error("Customer update error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Update customer API error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}