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

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

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

    // =====================================
    // CHECK LOGGED-IN USER
    // =====================================

    const supabaseAuth = createClient(
      supabaseUrl,
      anonKey
    );

    const {
      data: userData,
      error: userError,
    } = await supabaseAuth.auth.getUser(
      accessToken
    );

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const loggedInUserId =
      userData.user.id;

    // =====================================
    // CUSTOMER ACCOUNT CANNOT DELETE
    // =====================================

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
            "Customer accounts cannot delete customers",
        },
        { status: 403 }
      );
    }

    // =====================================
    // ADMIN CLIENT
    // =====================================

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

    // =====================================
    // GET CUSTOMER
    // =====================================

    const {
      data: customer,
      error: customerError,
    } = await supabaseAdmin
      .from("customers")
      .select(
        "id, customer_name, email, auth_user_id"
      )
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // =====================================
    // GET CUSTOMER SONG LINKS
    // =====================================

    const {
      data: customerSongs,
      error: customerSongsError,
    } = await supabaseAdmin
      .from("customer_songs")
      .select("song_id")
      .eq("customer_id", customerId);

    if (customerSongsError) {
      console.error(
        "Customer songs fetch error:",
        customerSongsError
      );

      return NextResponse.json(
        {
          error:
            customerSongsError.message,
        },
        { status: 400 }
      );
    }

    const songIds =
      customerSongs?.map(
        (row) => row.song_id
      ) || [];

    // =====================================
    // GET SONG STORAGE PATHS
    // =====================================

    let storagePaths: string[] = [];

    if (songIds.length > 0) {
      const {
        data: songs,
        error: songsError,
      } = await supabaseAdmin
        .from("songs")
        .select(
          "id, cover_url, audio_url"
        )
        .in("id", songIds);

      if (songsError) {
        console.error(
          "Songs fetch error:",
          songsError
        );

        return NextResponse.json(
          {
            error: songsError.message,
          },
          { status: 400 }
        );
      }

      for (const song of songs || []) {
        if (
          song.cover_url &&
          typeof song.cover_url === "string"
        ) {
          storagePaths.push(
            song.cover_url
          );
        }

        if (
          song.audio_url &&
          typeof song.audio_url === "string"
        ) {
          storagePaths.push(
            song.audio_url
          );
        }
      }
    }

    // Remove duplicate paths
    storagePaths = [
      ...new Set(storagePaths),
    ];

    // =====================================
    // DELETE STORAGE FILES
    // =====================================

    if (storagePaths.length > 0) {
      const { error: storageError } =
        await supabaseAdmin.storage
          .from("songs")
          .remove(storagePaths);

      if (storageError) {
        console.error(
          "Storage delete error:",
          storageError
        );

        return NextResponse.json(
          {
            error:
              "Customer files delete nahi ho paaye: " +
              storageError.message,
          },
          { status: 400 }
        );
      }
    }

    // =====================================
    // DELETE CUSTOMER SONG LINKS
    // =====================================

    const {
      error: linksError,
    } = await supabaseAdmin
      .from("customer_songs")
      .delete()
      .eq("customer_id", customerId);

    if (linksError) {
      console.error(
        "Customer songs delete error:",
        linksError
      );

      return NextResponse.json(
        { error: linksError.message },
        { status: 400 }
      );
    }

    // =====================================
    // DELETE CUSTOMER RECORD
    // =====================================

    const {
      error: deleteCustomerError,
    } = await supabaseAdmin
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (deleteCustomerError) {
      console.error(
        "Customer delete error:",
        deleteCustomerError
      );

      return NextResponse.json(
        {
          error:
            deleteCustomerError.message,
        },
        { status: 400 }
      );
    }

    // =====================================
    // DELETE AUTH USER
    // =====================================

    if (customer.auth_user_id) {
      const {
        error: authDeleteError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          customer.auth_user_id
        );

      if (authDeleteError) {
        console.error(
          "Auth user delete error:",
          authDeleteError
        );

        // Customer database record already deleted.
        // Report Auth deletion separately.
        return NextResponse.json(
          {
            success: true,
            warning:
              "Customer delete ho gaya, lekin Auth login delete nahi ho paya.",
          },
          { status: 200 }
        );
      }
    }

    // =====================================
    // SUCCESS
    // =====================================

    return NextResponse.json({
      success: true,
      message:
        "Customer aur uske storage files successfully delete ho gaye.",
      deletedFiles:
        storagePaths.length,
      deletedSongs:
        songIds.length,
    });
  } catch (error) {
    console.error(
      "Delete customer API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Customer delete karte time something went wrong",
      },
      { status: 500 }
    );
  }
}