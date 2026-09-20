"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SubLabelUploadPage() {
  const router = useRouter();

  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [singerName, setSingerName] = useState("");
  const [composer, setComposer] = useState("");
  const [lyricist, setLyricist] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);

  async function uploadSong() {
    if (!songTitle.trim()) {
      alert("Song Title bharo ❌");
      return;
    }

    if (!artistName.trim()) {
      alert("Artist Name bharo ❌");
      return;
    }

    if (!audioFile) {
      alert("Audio file select karo ❌");
      return;
    }

    try {
      setUploading(true);

      // ==============================
      // CHECK LOGIN
      // ==============================
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Session expire ho gaya ❌");
        router.replace("/login");
        return;
      }

      // ==============================
      // CHECK ROLE
      // ==============================
      const roleResponse = await fetch("/api/auth/role", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const roleData = await roleResponse.json();

      if (!roleResponse.ok) {
        alert(
          "Role check failed ❌\n\n" +
            (roleData.error || "Account verify nahi hua.")
        );
        return;
      }

      if (roleData.role !== "sub_label") {
        alert("Sirf Sub Label account song upload kar sakta hai ❌");
        return;
      }

      if (!roleData.subLabel) {
        alert("Sub Label account nahi mila ❌");
        return;
      }

      if (roleData.subLabel.is_active === false) {
        alert("Sub Label account inactive hai ❌");
        return;
      }

      const subLabelId = roleData.subLabel.id;
      const customerId = roleData.subLabel.customer_id;

      // ==============================
      // UNIQUE FILE NAME
      // ==============================
      const uniqueId =
        Date.now().toString() +
        "-" +
        Math.random().toString(36).substring(2, 10);

      // ==============================
      // UPLOAD COVER
      // ==============================
      let coverPath: string | null = null;

      if (coverFile) {
        const coverExtension =
          coverFile.name.split(".").pop()?.toLowerCase() || "jpg";

        coverPath = `covers/sub-label-${subLabelId}-${uniqueId}.${coverExtension}`;

        const { error: coverError } = await supabase.storage
          .from("songs")
          .upload(coverPath, coverFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: coverFile.type || "image/jpeg",
          });

        if (coverError) {
          console.error("Cover upload error:", coverError);

          alert(
            "Cover upload failed ❌\n\n" +
              coverError.message
          );

          return;
        }
      }

      // ==============================
      // UPLOAD AUDIO
      // ==============================
      const audioExtension =
        audioFile.name.split(".").pop()?.toLowerCase() || "mp3";

      const audioPath = `audio/sub-label-${subLabelId}-${uniqueId}.${audioExtension}`;

      const { error: audioError } = await supabase.storage
        .from("songs")
        .upload(audioPath, audioFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: audioFile.type || "audio/mpeg",
        });

      if (audioError) {
        console.error("Audio upload error:", audioError);

        if (coverPath) {
          await supabase.storage
            .from("songs")
            .remove([coverPath]);
        }

        alert(
          "Audio upload failed ❌\n\n" +
            audioError.message
        );

        return;
      }

      // ==============================
      // INSERT SONG
      // ==============================
      const { data: song, error: songError } = await supabase
        .from("songs")
        .insert({
          song_title: songTitle.trim(),
          artist_name: artistName.trim(),
          album_name: albumName.trim() || null,
          singer_name: singerName.trim() || null,
          composer: composer.trim() || null,
          lyricist: lyricist.trim() || null,
          genre: genre.trim() || null,
          language: language.trim() || null,
          release_date: releaseDate || null,
          cover_url: coverPath,
          audio_url: audioPath,
          status: "Pending",
        })
        .select("id")
        .single();

      if (songError || !song) {
        console.error("Song database error:", songError);

        await supabase.storage
          .from("songs")
          .remove([audioPath]);

        if (coverPath) {
          await supabase.storage
            .from("songs")
            .remove([coverPath]);
        }

        alert(
          "Song database me save nahi hua ❌\n\n" +
            (songError?.message || "Unknown error")
        );

        return;
      }

      // ==============================
      // LINK SONG TO CUSTOMER
      // ==============================
      const { error: customerSongError } = await supabase
        .from("customer_songs")
        .insert({
          customer_id: customerId,
          song_id: song.id,
        });

      if (customerSongError) {
        console.error(
          "Customer song link error:",
          customerSongError
        );

        await supabase
          .from("songs")
          .delete()
          .eq("id", song.id);

        await supabase.storage
          .from("songs")
          .remove([audioPath]);

        if (coverPath) {
          await supabase.storage
            .from("songs")
            .remove([coverPath]);
        }

        alert(
          "Customer link create nahi hua ❌\n\n" +
            customerSongError.message
        );

        return;
      }

      // ==============================
      // LINK SONG TO SUB LABEL
      // ==============================
      const { error: subLabelSongError } = await supabase
        .from("sub_label_songs")
        .insert({
          sub_label_id: subLabelId,
          song_id: song.id,
        });

      if (subLabelSongError) {
        console.error(
          "Sub Label song link error:",
          subLabelSongError
        );

        await supabase
          .from("customer_songs")
          .delete()
          .eq("song_id", song.id)
          .eq("customer_id", customerId);

        await supabase
          .from("songs")
          .delete()
          .eq("id", song.id);

        await supabase.storage
          .from("songs")
          .remove([audioPath]);

        if (coverPath) {
          await supabase.storage
            .from("songs")
            .remove([coverPath]);
        }

        alert(
          "Sub Label song link create nahi hua ❌\n\n" +
            subLabelSongError.message
        );

        return;
      }

      alert("Song Successfully Uploaded ✅\n\nStatus: Pending");

      router.push("/sub-label-dashboard");
    } catch (error) {
      console.error("Upload error:", error);

      alert(
        "Song upload mein problem aa gayi ❌\n\n" +
          "Console check karo."
      );
    } finally {
      setUploading(false);
    }
  }

  function inputStyle() {
    return {
      width: "100%",
      boxSizing: "border-box" as const,
      padding: "13px",
      borderRadius: "8px",
      border: "1px solid #374151",
      background: "#1f2937",
      color: "#ffffff",
      outline: "none",
      fontSize: "14px",
    };
  }

  function labelStyle() {
    return {
      display: "block",
      color: "#d1d5db",
      fontSize: "14px",
      marginBottom: "7px",
    };
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        padding: "35px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto 25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 7px",
              fontSize: "30px",
            }}
          >
            🎵 Upload Song
          </h1>

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
            }}
          >
            SD Media Entertainment Sub Label
          </p>
        </div>

        <button
          onClick={() => router.push("/sub-label-dashboard")}
          style={{
            padding: "11px 18px",
            border: "none",
            borderRadius: "8px",
            background: "#1f2937",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          ← Dashboard
        </button>
      </div>

      {/* FORM */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "15px",
          padding: "28px",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            margin: "0 0 25px",
            fontSize: "21px",
          }}
        >
          Song Information
        </h2>

        {/* ROW 1 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div>
            <label style={labelStyle()}>
              Song Title *
            </label>

            <input
              value={songTitle}
              onChange={(e) =>
                setSongTitle(e.target.value)
              }
              placeholder="Enter song title"
              style={inputStyle()}
            />
          </div>

          <div>
            <label style={labelStyle()}>
              Artist Name *
            </label>

            <input
              value={artistName}
              onChange={(e) =>
                setArtistName(e.target.value)
              }
              placeholder="Enter artist name"
              style={inputStyle()}
            />
          </div>
        </div>

        {/* ROW 2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div>
            <label style={labelStyle()}>
              Album Name
            </label>

            <input
              value={albumName}
              onChange={(e) =>
                setAlbumName(e.target.value)
              }
              placeholder="Enter album name"
              style={inputStyle()}
            />
          </div>

          <div>
            <label style={labelStyle()}>
              Singer Name
            </label>

            <input
              value={singerName}
              onChange={(e) =>
                setSingerName(e.target.value)
              }
              placeholder="Enter singer name"
              style={inputStyle()}
            />
          </div>
        </div>

        {/* ROW 3 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div>
            <label style={labelStyle()}>
              Composer
            </label>

            <input
              value={composer}
              onChange={(e) =>
                setComposer(e.target.value)
              }
              placeholder="Enter composer"
              style={inputStyle()}
            />
          </div>

          <div>
            <label style={labelStyle()}>
              Lyricist
            </label>

            <input
              value={lyricist}
              onChange={(e) =>
                setLyricist(e.target.value)
              }
              placeholder="Enter lyricist"
              style={inputStyle()}
            />
          </div>
        </div>

        {/* ROW 4 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div>
            <label style={labelStyle()}>
              Genre
            </label>

            <input
              value={genre}
              onChange={(e) =>
                setGenre(e.target.value)
              }
              placeholder="e.g. Bhojpuri"
              style={inputStyle()}
            />
          </div>

          <div>
            <label style={labelStyle()}>
              Language
            </label>

            <input
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value)
              }
              placeholder="e.g. Bhojpuri"
              style={inputStyle()}
            />
          </div>
        </div>

        {/* RELEASE DATE */}
        <div
          style={{
            marginBottom: "25px",
            maxWidth: "400px",
          }}
        >
          <label style={labelStyle()}>
            Release Date
          </label>

          <input
            type="date"
            value={releaseDate}
            onChange={(e) =>
              setReleaseDate(e.target.value)
            }
            style={inputStyle()}
          />
        </div>

        {/* FILES */}
        <div
          style={{
            borderTop: "1px solid #1f2937",
            paddingTop: "25px",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "20px",
            }}
          >
            Files
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {/* COVER */}
            <div
              style={{
                background: "#1f2937",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <label style={labelStyle()}>
                Cover Image
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setCoverFile(
                    e.target.files?.[0] || null
                  )
                }
                style={{
                  width: "100%",
                  color: "#d1d5db",
                }}
              />

              {coverFile && (
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#86efac",
                    fontSize: "13px",
                  }}
                >
                  ✓ {coverFile.name}
                </p>
              )}
            </div>

            {/* AUDIO */}
            <div
              style={{
                background: "#1f2937",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <label style={labelStyle()}>
                Audio File *
              </label>

              <input
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                onChange={(e) =>
                  setAudioFile(
                    e.target.files?.[0] || null
                  )
                }
                style={{
                  width: "100%",
                  color: "#d1d5db",
                }}
              />

              {audioFile && (
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#86efac",
                    fontSize: "13px",
                  }}
                >
                  ✓ {audioFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SUBMIT */}
        <div
          style={{
            marginTop: "30px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={uploadSong}
            disabled={uploading}
            style={{
              padding: "14px 28px",
              border: "none",
              borderRadius: "9px",
              background: uploading
                ? "#4b5563"
                : "#2563eb",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: uploading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {uploading
              ? "Uploading..."
              : "Upload Song"}
          </button>
        </div>
      </section>
    </main>
  );
}