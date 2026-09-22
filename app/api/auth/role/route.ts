import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization token missing" },
        { status: 401 }
      );
    }

    const accessToken = authHeader
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token missing" },
        { status: 401 }
      );
    }

    // --------------------------------
    // VERIFY AUTH USER
    // --------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("Auth user error:", userError);

      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    console.log("Role Check User ID:", user.id);
    console.log("Role Check Email:", user.email);

    // --------------------------------
    // CUSTOMER CHECK
    // --------------------------------

    const {
      data: customer,
      error: customerError,
    } = await supabaseAdmin
      .from("customers")
      .select(
        "id, customer_name, label_name, email, auth_user_id, is_active"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error(
        "Customer role error:",
        customerError
      );

      return NextResponse.json(
        { error: customerError.message },
        { status: 500 }
      );
    }

    if (customer) {
      return NextResponse.json({
        role: "customer",
        user: {
          id: user.id,
          email: user.email,
        },
        customer,
      });
    }

    // --------------------------------
    // CUSTOMER EMAIL FALLBACK
    // --------------------------------

    if (user.email) {
      const {
        data: customerByEmail,
        error: emailCustomerError,
      } = await supabaseAdmin
        .from("customers")
        .select(
          "id, customer_name, label_name, email, auth_user_id, is_active"
        )
        .eq(
          "email",
          user.email.toLowerCase()
        )
        .maybeSingle();

      if (emailCustomerError) {
        console.error(
          "Customer email fallback error:",
          emailCustomerError
        );
      }

      if (customerByEmail) {
        return NextResponse.json({
          role: "customer",
          user: {
            id: user.id,
            email: user.email,
          },
          customer: customerByEmail,
        });
      }
    }

    // --------------------------------
    // SUB LABEL CHECK
    // --------------------------------

    const {
      data: subLabel,
      error: subLabelError,
    } = await supabaseAdmin
      .from("sub_labels")
      .select(
        "id, customer_id, sub_label_name, email, auth_user_id, is_active"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (subLabelError) {
      console.error(
        "Sub Label role error:",
        subLabelError
      );

      return NextResponse.json(
        { error: subLabelError.message },
        { status: 500 }
      );
    }

    if (subLabel) {
      return NextResponse.json({
        role: "sub_label",
        user: {
          id: user.id,
          email: user.email,
        },
        subLabel,
      });
    }

    // --------------------------------
    // ADMIN
    // --------------------------------

    return NextResponse.json({
      role: "admin",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "Role API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Role check failed",
      },
      {
        status: 500,
      }
    );
  }
}