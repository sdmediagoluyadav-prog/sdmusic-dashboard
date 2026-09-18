import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerName = body.customer_name?.trim();
    const labelName = body.label_name?.trim();
    const email = body.email?.trim().toLowerCase();

    // CHECK REQUIRED FIELDS
    if (!customerName || !email) {
      return NextResponse.json(
        {
          error:
            "Customer Name and Email are required",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY!;

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        {
          error:
            "Supabase server configuration missing",
        },
        { status: 500 }
      );
    }

    // ADMIN SUPABASE CLIENT
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

    // ------------------------------------------------
    // CHECK CUSTOMER WITH SAME EMAIL
    // ------------------------------------------------

    const {
      data: existingCustomer,
      error: existingCustomerError,
    } = await supabaseAdmin
      .from("customers")
      .select(
        "id, customer_name, label_name, email, auth_user_id"
      )
      .eq("email", email)
      .maybeSingle();

    if (existingCustomerError) {
      console.error(
        "Customer check error:",
        existingCustomerError
      );

      return NextResponse.json(
        {
          error: existingCustomerError.message,
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // CHECK EXISTING AUTH USER
    // ------------------------------------------------

    const {
      data: usersData,
      error: usersError,
    } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      return NextResponse.json(
        {
          error: usersError.message,
        },
        { status: 400 }
      );
    }

    const existingUser =
      usersData.users.find(
        (user) =>
          user.email?.toLowerCase() === email
      );

    // =================================================
    // EXISTING AUTH USER
    // =================================================

    if (existingUser) {
      const userId = existingUser.id;

      // Customer already exists
      if (existingCustomer) {
        const { error: updateError } =
          await supabaseAdmin
            .from("customers")
            .update({
              customer_name: customerName,
              label_name: labelName || null,
              auth_user_id: userId,
            })
            .eq("id", existingCustomer.id);

        if (updateError) {
          return NextResponse.json(
            {
              error: updateError.message,
            },
            { status: 400 }
          );
        }

        // Send password reset email
        const supabasePublic =
          createClient(
            supabaseUrl,
            process.env
              .NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

        const {
          error: resetError,
        } =
          await supabasePublic.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                "https://sdmusic-dashboard.vercel.app/reset-password",
            }
          );

        if (resetError) {
          console.error(
            "Reset email error:",
            resetError
          );

          return NextResponse.json(
            {
              error: resetError.message,
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          existingUser: true,
          customerId: existingCustomer.id,
          message:
            "Customer already exists. Password setup email sent successfully.",
        });
      }

      // Auth user exists but customer does not
      const {
        data: newCustomer,
        error: newCustomerError,
      } = await supabaseAdmin
        .from("customers")
        .insert({
          customer_name: customerName,
          label_name: labelName || null,
          email: email,
          auth_user_id: userId,
        })
        .select()
        .single();

      if (newCustomerError) {
        return NextResponse.json(
          {
            error: newCustomerError.message,
          },
          { status: 400 }
        );
      }

      // Send password reset email
      const supabasePublic =
        createClient(
          supabaseUrl,
          process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

      const {
        error: resetError,
      } =
        await supabasePublic.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              "https://sdmusic-dashboard.vercel.app/reset-password",
          }
        );

      if (resetError) {
        console.error(
          "Reset email error:",
          resetError
        );

        return NextResponse.json(
          {
            error: resetError.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        existingUser: true,
        customerId: newCustomer.id,
        message:
          "Customer created and password setup email sent successfully.",
      });
    }

    // =================================================
    // NEW AUTH USER
    // =================================================

    const {
      data: inviteData,
      error: inviteError,
    } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            customer_name: customerName,
            label_name: labelName || "",
          },
          redirectTo:
            "https://sdmusic-dashboard.vercel.app/reset-password",
        }
      );

    if (inviteError) {
      console.error(
        "Invite error:",
        inviteError
      );

      return NextResponse.json(
        {
          error: inviteError.message,
        },
        { status: 400 }
      );
    }

    const userId = inviteData.user.id;

    // ------------------------------------------------
    // CREATE CUSTOMER RECORD
    // ------------------------------------------------

    const {
      data: newCustomer,
      error: customerError,
    } =
      await supabaseAdmin
        .from("customers")
        .insert({
          customer_name: customerName,
          label_name: labelName || null,
          email: email,
          auth_user_id: userId,
        })
        .select()
        .single();

    if (customerError) {
      console.error(
        "Customer create error:",
        customerError
      );

      return NextResponse.json(
        {
          error: customerError.message,
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // SUCCESS
    // ------------------------------------------------

    return NextResponse.json({
      success: true,
      existingUser: false,
      customerId: newCustomer.id,
      userId: userId,
      message:
        "Customer created and invitation email sent successfully.",
    });
  } catch (error) {
    console.error(
      "Invite API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 }
    );
  }
}