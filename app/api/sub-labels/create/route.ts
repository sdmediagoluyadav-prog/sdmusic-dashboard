import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

// Customer session verify करने के लिए
const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Admin client - Auth user create करने के लिए
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

function generatePassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";

  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return password;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          error: "Authorization token missing",
        },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace(
      "Bearer ",
      ""
    );

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Access token missing",
        },
        { status: 401 }
      );
    }

    // Logged-in customer verify करो
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Invalid or expired session",
        },
        { status: 401 }
      );
    }

    // Request body
    const body = await request.json();

    const subLabelName = String(
      body.subLabelName || ""
    ).trim();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    if (!subLabelName) {
      return NextResponse.json(
        {
          error: "Sub Label Name is required",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error: "Sub Label Email is required",
        },
        { status: 400 }
      );
    }

    // Logged-in user का customer record निकालो
    // IMPORTANT: customers table में customer_name है, name नहीं
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
        "Customer lookup error:",
        customerError
      );

      return NextResponse.json(
        {
          error:
            customerError.message ||
            "Customer account verify nahi hua.",
        },
        { status: 403 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Customer account nahi mila ya aap customer nahi hain.",
        },
        { status: 403 }
      );
    }

    // Customer inactive है तो Sub Label create नहीं होगा
    if (customer.is_active === false) {
      return NextResponse.json(
        {
          error:
            "Aapka customer account inactive hai.",
        },
        { status: 403 }
      );
    }

    // Duplicate email check
    const {
      data: existingSubLabel,
      error: existingError,
    } = await supabaseAdmin
      .from("sub_labels")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing Sub Label check error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            existingError.message ||
            "Sub Label email check nahi ho saka.",
        },
        { status: 500 }
      );
    }

    if (existingSubLabel) {
      return NextResponse.json(
        {
          error:
            "Ye email kisi existing Sub Label ke saath already registered hai.",
        },
        { status: 400 }
      );
    }

    // Temporary password
    const temporaryPassword =
      generatePassword(12);

    // Supabase Auth user create
    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error(
        "Auth user creation error:",
        authError
      );

      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Sub Label login account create nahi hua.",
        },
        { status: 400 }
      );
    }

    const authUserId = authData.user.id;

    // Sub Label database record create
    const {
      data: subLabel,
      error: subLabelError,
    } =
      await supabaseAdmin
        .from("sub_labels")
        .insert({
          customer_id: customer.id,
          sub_label_name: subLabelName,
          email,
          auth_user_id: authUserId,
          is_active: true,
        })
        .select(
          "id, customer_id, sub_label_name, email, auth_user_id, is_active, created_at"
        )
        .single();

    // Database insert fail हुआ तो Auth user delete करके rollback
    if (subLabelError || !subLabel) {
      console.error(
        "Sub Label database error:",
        subLabelError
      );

      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      );

      return NextResponse.json(
        {
          error:
            subLabelError?.message ||
            "Sub Label database me create nahi hua.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Sub Label login account successfully create ho gaya.",
        subLabel,
        login: {
          email,
          password: temporaryPassword,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Sub Label create API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}