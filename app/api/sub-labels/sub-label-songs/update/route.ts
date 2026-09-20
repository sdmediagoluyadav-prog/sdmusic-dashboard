import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get(
      "authorization"
    );

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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // CHECK SUB LABEL
    // --------------------------------------------------

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
        "Sub Label Error:",
        subLabelError
      );

      return NextResponse.json(
        { error: subLabelError.message },
        { status: 500 }
      );
    }

    if (!subLabel) {
      return NextResponse.json(
        { error: "Sub Label account not found" },
        { status: 403 }
      );
    }

    if (!subLabel.is_active) {
      return NextResponse.json(
        { error: "Sub Label account is inactive" },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // FORM DATA
    // --------------------------------------------------

    const formData = await request.formData();

    const songId = Number(
      formData.get("songId")
    );

    const songTitle = String(
      formData.get("songTitle") || ""
    ).trim();

    const artistName = String(
      formData.get("artistName") || ""
    ).trim();

    const albumName = String(
      formData.get("albumName") || ""
    ).trim();

    const singerName = String(
      formData.get("singerName") || ""
    ).trim();

    const composer = String(
      formData.get("composer") || ""
    ).trim();

    const lyricist = String(
      formData.get("lyricist") || ""
    ).trim();

    const genre = String(
      formData.get("genre") || ""
    ).trim();

    const language = String(
      formData.get("language") || ""
    ).trim();

    const releaseDate = String(
      formData.get("releaseDate") || ""
    ).trim();

    const coverFile = formData.get(
      "coverFile"
    );

    const audioFile = formData.get(
      "audioFile"
    );

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (!songId || Number.isNaN(songId)) {
      return NextResponse.json(
        { error: "Invalid song ID" },
        { status: 400 }
      );
    }

    if (!songTitle) {
      return NextResponse.json(
        { error: "Song title is required" },
        { status: 400 }
      );
    }

    if (!artistName) {
      return NextResponse.json(
        { error: "Artist name is required" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // CHECK SONG BELONGS TO THIS SUB LABEL
    // --------------------------------------------------

    const {
      data: songLink,
      error: songLinkError,
    } = await supabaseAdmin
      .from("sub_label_songs")
      .select("id, sub_label_id, song_id")
      .eq("sub_label_id", subLabel.id)
      .eq("song_id", songId)
      .maybeSingle();

    if (songLinkError) {
      console.error(
        "Song Link Error:",
        songLinkError
      );

      return NextResponse.json(
        { error: songLinkError.message },
        { status: 500 }
      );
    }

    if (!songLink) {
      return NextResponse.json(
        {
          error:
            "This song does not belong to your Sub Label",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // GET CURRENT SONG
    // --------------------------------------------------

    const {
      data: currentSong,
      error: currentSongError,
    } = await supabaseAdmin
      .from("songs")
      .select(`
        id,
        cover_url,
        audio_url
      `)
      .eq("id", songId)
      .maybeSingle();

    if (currentSongError) {
      console.error(
        "Current Song Error:",
        currentSongError
      );

      return NextResponse.json(
        { error: currentSongError.message },
        { status: 500 }
      );
    }

    if (!currentSong) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // NEW FILE URLS
    // --------------------------------------------------

    let newCoverUrl =
      currentSong.cover_url;

    let newAudioUrl =
      currentSong.audio_url;

    const uploadedFiles: string[] = [];

    // --------------------------------------------------
    // COVER UPLOAD
    // --------------------------------------------------

    if (
      coverFile &&
      coverFile instanceof File &&
      coverFile.size > 0
    ) {
      const extension =
        coverFile.name.split(".").pop() ||
        "jpg";

      const filePath =
        `covers/sub-label-${subLabel.id}-edit-${songId}-${Date.now()}.${extension}`;

      const {
        error: coverUploadError,
      } = await supabaseAdmin.storage
        .from("songs")
        .upload(
          filePath,
          coverFile,
          {
            contentType:
              coverFile.type ||
              "image/jpeg",
            upsert: false,
          }
        );

      if (coverUploadError) {
        console.error(
          "Cover Upload Error:",
          coverUploadError
        );

        return NextResponse.json(
          {
            error:
              "Cover upload failed: " +
              coverUploadError.message,
          },
          { status: 500 }
        );
      }

      uploadedFiles.push(filePath);

      const {
        data: coverPublicData,
      } = supabaseAdmin.storage
        .from("songs")
        .getPublicUrl(filePath);

      newCoverUrl =
        coverPublicData.publicUrl;
    }

    // --------------------------------------------------
    // AUDIO UPLOAD
    // --------------------------------------------------

    if (
      audioFile &&
      audioFile instanceof File &&
      audioFile.size > 0
    ) {
      const extension =
        audioFile.name.split(".").pop() ||
        "mp3";

      const filePath =
        `audio/sub-label-${subLabel.id}-edit-${songId}-${Date.now()}.${extension}`;

      const {
        error: audioUploadError,
      } = await supabaseAdmin.storage
        .from("songs")
        .upload(
          filePath,
          audioFile,
          {
            contentType:
              audioFile.type ||
              "audio/mpeg",
            upsert: false,
          }
        );

      if (audioUploadError) {
        console.error(
          "Audio Upload Error:",
          audioUploadError
        );

        // Remove newly uploaded cover if audio fails
        if (uploadedFiles.length > 0) {
          await supabaseAdmin.storage
            .from("songs")
            .remove(uploadedFiles);
        }

        return NextResponse.json(
          {
            error:
              "Audio upload failed: " +
              audioUploadError.message,
          },
          { status: 500 }
        );
      }

      uploadedFiles.push(filePath);

      const {
        data: audioPublicData,
      } = supabaseAdmin.storage
        .from("songs")
        .getPublicUrl(filePath);

      newAudioUrl =
        audioPublicData.publicUrl;
    }

    // --------------------------------------------------
    // UPDATE SONG
    // --------------------------------------------------

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("songs")
      .update({
        song_title: songTitle,
        artist_name: artistName,
        album_name: albumName,
        singer_name: singerName,
        composer,
        lyricist,
        genre,
        language,
        release_date:
          releaseDate || null,
        cover_url: newCoverUrl,
        audio_url: newAudioUrl,

        // IMPORTANT:
        // Edited song goes back to Pending
        status: "Pending",
        rejection_reason: null,
      })
      .eq("id", songId);

    if (updateError) {
      console.error(
        "Song Update Error:",
        updateError
      );

      // Cleanup newly uploaded files
      if (uploadedFiles.length > 0) {
        await supabaseAdmin.storage
          .from("songs")
          .remove(uploadedFiles);
      }

      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Song updated successfully and sent for approval",
    });
  } catch (error) {
    console.error(
      "Sub Label Song Update API Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong",
      },
      { status: 500 }
    );
  }
}