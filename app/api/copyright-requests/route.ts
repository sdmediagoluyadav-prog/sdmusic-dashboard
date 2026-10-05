
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
    const authHeader =
      request.headers.get("authorization");

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
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      console.error(
        "Auth user error:",
        userError
      );

      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // --------------------------------
    // CUSTOMER CHECK
    // --------------------------------

    const {
      data: customer,
      error: customerError,
    } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error(
        "Customer check error:",
        customerError
      );

      return NextResponse.json(
        { error: customerError.message },
        { status: 500 }
      );
    }

    // Customer ko admin access nahi
    if (customer) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // --------------------------------
    // CUSTOMER EMAIL FALLBACK
    // --------------------------------

    if (user.email) {
      const {
        data: customerByEmail,
      } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq(
          "email",
          user.email.toLowerCase()
        )
        .maybeSingle();

      if (customerByEmail) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
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
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (subLabelError) {
      console.error(
        "Sub label check error:",
        subLabelError
      );

      return NextResponse.json(
        { error: subLabelError.message },
        { status: 500 }
      );
    }

    if (subLabel) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // --------------------------------
    // ADMIN CONFIRMED
    // --------------------------------

    const {
      data: requests,
      error: requestError,
    } = await supabaseAdmin
      .from("Copyright Removal Request")
      .select(`
        id,
        customer_id,
        video_url,
        reason,
        details,
        status,
        rejection_reason,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (requestError) {
      console.error(
        "Copyright request error:",
        requestError
      );

      return NextResponse.json(
        { error: requestError.message },
        { status: 500 }
      );
    }

    // --------------------------------
    // LOAD CUSTOMERS
    // --------------------------------

    const customerIds = [
      ...new Set(
        (requests || [])
          .map(
            (request) => request.customer_id
          )
          .filter(Boolean)
      ),
    ];

    let customers: any[] = [];

    if (customerIds.length > 0) {
      const {
        data: customerData,
        error: customerDataError,
      } = await supabaseAdmin
        .from("customers")
        .select(
          "id, name, customer_name, label_name"
        )
        .in("id", customerIds);

      if (customerDataError) {
        console.error(
          "Customer fetch error:",
          customerDataError
        );
      } else {
        customers = customerData || [];
      }
    }

    return NextResponse.json({
      requests: requests || [],
      customers,
    });
  } catch (error: any) {
    console.error(
      "Copyright Requests API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const authHeader =
      request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization token missing" },
        { status: 401 }
      );
    }

    const accessToken = authHeader
      .replace("Bearer ", "")
      .trim();

    // --------------------------------
    // VERIFY AUTH USER
    // --------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // --------------------------------
    // ADMIN CHECK
    // --------------------------------

    const {
      data: customer,
    } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (customer) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (user.email) {
      const {
        data: customerByEmail,
      } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq(
          "email",
          user.email.toLowerCase()
        )
        .maybeSingle();

      if (customerByEmail) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    const {
      data: subLabel,
    } = await supabaseAdmin
      .from("sub_labels")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (subLabel) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // --------------------------------
    // READ BODY
    // --------------------------------

    const body = await request.json();

    const requestId = Number(
      body?.requestId
    );

    const status = String(
      body?.status || ""
    );

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    if (
      status !== "Approved" &&
      status !== "Rejected"
    ) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    let rejectionReason: string | null =
      null;

    if (status === "Rejected") {
      rejectionReason = String(
        body?.rejection_reason || ""
      ).trim();

      if (!rejectionReason) {
        return NextResponse.json(
          {
            error:
              "Rejection reason is required",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------
    // UPDATE REQUEST
    // --------------------------------

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("Copyright Removal Request")
      .update({
        status,
        rejection_reason:
          rejectionReason,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      console.error(
        "Copyright update error:",
        error
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data,
    });
  } catch (error: any) {
    console.error(
      "Copyright PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong",
      },
      { status: 500 }
    );
  }
}