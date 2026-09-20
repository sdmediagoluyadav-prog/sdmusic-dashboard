"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  album_name: string;
  singer_name: string;
  composer: string;
  lyricist: string;
  genre: string;
  language: string;
  release_date: string;
  cover_url: string | null;
  audio_url: string | null;
  status: string;
  rejection_reason: string | null;
};

export default function EditSongPage() {
  const router = useRouter();
  const params = useParams();

  const songId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [song, setSong] = useState<Song | null>(null);

  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [singerName, setSingerName] = useState("");
  const [composer, setComposer] = useState("");
  const [lyricist, setLyricist] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  useEffect(() => {
    loadSong();
  }, []);

  async function loadSong() {
    try {
      setLoading(true);

      if (!songId || Number.isNaN(songId)) {
        alert("Invalid Song ID");
        router.push("/sub-label-dashboard/my-songs");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // ==============================
      // ROLE CHECK
      // ==============================

      const roleResponse = await fetch("/api/auth/role", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const roleData = await roleResponse.json();

      if (!roleResponse.ok) {
        alert(roleData.error || "Role check failed");
        router.push("/login");
        return;
      }

      if (roleData.role === "customer") {
        router.push("/customer-dashboard");
        return;
      }

      if (roleData.role === "admin") {
        router.push("/dashboard");
        return;
      }

      if (roleData.role !== "sub_label") {
        router.push("/login");
        return;
      }

      const subLabelId = roleData.subLabel?.id;

      if (!subLabelId) {
        alert("Sub Label account nahi mila");
        router.push("/sub-label-dashboard");
        return;
      }

      // ==============================
      // CHECK SONG BELONGS TO SUB LABEL
      // ==============================

      const { data: link, error: linkError } =
        await supabase
          .from("sub_label_songs")
          .select("song_id")
          .eq("sub_label_id", subLabelId)
          .eq("song_id", songId)
          .maybeSingle();

      if (linkError) {
        console.error(linkError);
        alert(linkError.message);
        router.push("/sub-label-dashboard/my-songs");
        return;
      }

      if (!link) {
        alert("Ye song aapke Sub Label account ka nahi hai ❌");
        router.push("/sub-label-dashboard/my-songs");
        return;
      }

      // ==============================
      // LOAD SONG
      // ==============================

      const { data, error } = await supabase
        .from("songs")
        .select(`
          id,
          song_title,
          artist_name,
          album_name,
          singer_name,
          composer,
          lyricist,
          genre,
          language,
          release_date,
          cover_url,
          audio_url,
          status,
          rejection_reason
        `)
        .eq("id", songId)
        .single();

      if (error) {
        console.error(error);
        alert(error.message);
        router.push("/sub-label-dashboard/my-songs");
        return;
      }

      if (!data) {
        alert("Song nahi mila ❌");
        router.push("/sub-label-dashboard/my-songs");
        return;
      }

      setSong(data);

      setSongTitle(data.song_title || "");
      setArtistName(data.artist_name || "");
      setAlbumName(data.album_name || "");
      setSingerName(data.singer_name || "");
      setComposer(data.composer || "");
      setLyricist(data.lyricist || "");
      setGenre(data.genre || "");
      setLanguage(data.language || "");
      setReleaseDate(data.release_date || "");
    } catch (error) {
      console.error("Load Edit Song Error:", error);

      alert("Song load nahi ho paya ❌");

      router.push("/sub-label-dashboard/my-songs");
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // SAVE CHANGES
  // ==============================

  async function saveChanges() {
    try {
      if (!song) return;

      if (!songTitle.trim()) {
        alert("Song Title required hai");
        return;
      }

      if (!artistName.trim()) {
        alert("Artist Name required hai");
        return;
      }

      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // ==============================
      // UPDATE SONG
      // ==============================

      const { error } = await supabase
        .from("songs")
        .update({
          song_title: songTitle.trim(),
          artist_name: artistName.trim(),
          album_name: albumName.trim(),
          singer_name: singerName.trim(),
          composer: composer.trim(),
          lyricist: lyricist.trim(),
          genre: genre.trim(),
          language: language.trim(),
          release_date: releaseDate || null,

          // Rejected song ko edit ke baad
          // dobara Pending kar diya jayega.
          status: "Pending",
          rejection_reason: null,
        })
        .eq("id", song.id);

      if (error) {
        console.error("Update Song Error:", error);

        alert(
          "Song update nahi ho paya ❌\n\n" +
            error.message
        );

        return;
      }

      alert(
        "Song successfully update ho gaya ✅\n\n" +
          "Song dobara approval ke liye Pending me bhej diya gaya hai."
      );

      router.push("/sub-label-dashboard/my-songs");
      router.refresh();
    } catch (error) {
      console.error("Save Error:", error);

      alert("Song save karte waqt problem aa gayi ❌");
    } finally {
      setSaving(false);
    }
  }

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading Edit Song...
      </main>
    );
  }

  if (!song) {
    return null;
  }

  // ==============================
  // PAGE
  // ==============================

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#fff",
        padding: "35px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto 25px",
        }}
      >
        <button
          onClick={() =>
            router.push("/sub-label-dashboard/my-songs")
          }
          style={{
            padding: "10px 15px",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#fff",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← My Songs
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: "30px",
          }}
        >
          ✏️ Edit Song
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginTop: "8px",
          }}
        >
          Rejected song ki details edit karein.
        </p>
      </div>

      {/* FORM */}

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "14px",
          padding: "25px",
          boxSizing: "border-box",
        }}
      >
        {/* REJECTION REASON */}

        {song.status === "Rejected" &&
          song.rejection_reason && (
            <div
              style={{
                marginBottom: "25px",
                padding: "15px",
                borderRadius: "9px",
                background: "rgba(127,29,29,0.25)",
                border:
                  "1px solid rgba(248,113,113,0.35)",
              }}
            >
              <div
                style={{
                  color: "#fca5a5",
                  fontWeight: "700",
                  marginBottom: "6px",
                }}
              >
                Rejection Reason
              </div>

              <div
                style={{
                  color: "#fecaca",
                  lineHeight: "1.6",
                }}
              >
                {song.rejection_reason}
              </div>
            </div>
          )}

        {/* FORM GRID */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "18px",
          }}
        >
          <InputField
            label="Song Title"
            value={songTitle}
            onChange={setSongTitle}
          />

          <InputField
            label="Artist Name"
            value={artistName}
            onChange={setArtistName}
          />

          <InputField
            label="Album Name"
            value={albumName}
            onChange={setAlbumName}
          />

          <InputField
            label="Singer Name"
            value={singerName}
            onChange={setSingerName}
          />

          <InputField
            label="Composer"
            value={composer}
            onChange={setComposer}
          />

          <InputField
            label="Lyricist"
            value={lyricist}
            onChange={setLyricist}
          />

          <InputField
            label="Genre"
            value={genre}
            onChange={setGenre}
          />

          <InputField
            label="Language"
            value={language}
            onChange={setLanguage}
          />

          <div>
            <label
              style={{
                display: "block",
                color: "#cbd5e1",
                fontSize: "13px",
                marginBottom: "7px",
              }}
            >
              Release Date
            </label>

            <input
              type="date"
              value={releaseDate}
              onChange={(e) =>
                setReleaseDate(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* BUTTONS */}

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              router.push(
                "/sub-label-dashboard/my-songs"
              )
            }
            disabled={saving}
            style={{
              padding: "13px 20px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#fff",
              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={saveChanges}
            disabled={saving}
            style={{
              padding: "13px 22px",
              borderRadius: "8px",
              border: "none",
              background: saving
                ? "#475569"
                : "#2563eb",
              color: "#fff",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight: "600",
            }}
          >
            {saving
              ? "Saving..."
              : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}

/* =========================
   INPUT FIELD
========================= */

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          color: "#cbd5e1",
          fontSize: "13px",
          marginBottom: "7px",
        }}
      >
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #334155",
          background: "#020617",
          color: "#fff",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}