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

export default function EditSubLabelSong() {
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

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  useEffect(() => {
    if (!songId || Number.isNaN(songId)) {
      router.push("/sub-label-dashboard/my-songs");
      return;
    }

    loadSong();
  }, [songId]);

  async function loadSong() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const roleResponse = await fetch("/api/auth/role", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roleData = await roleResponse.json();

      if (!roleResponse.ok) {
        alert(roleData.error || "Role check failed");
        router.push("/login");
        return;
      }

      if (roleData.role !== "sub_label") {
        if (roleData.role === "customer") {
          router.push("/customer-dashboard");
        } else if (roleData.role === "admin") {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }

        return;
      }

      const subLabelId = roleData.subLabel?.id;

      if (!subLabelId) {
        alert("Sub Label account नहीं मिला");
        router.push("/sub-label-dashboard");
        return;
      }

      // Check that this song belongs to this Sub Label
      const {
        data: link,
        error: linkError,
      } = await supabase
        .from("sub_label_songs")
        .select("song_id")
        .eq("sub_label_id", subLabelId)
        .eq("song_id", songId)
        .maybeSingle();

      if (linkError) {
        console.error("Link Error:", linkError);
        alert(linkError.message);
        return;
      }

      if (!link) {
        alert("यह song आपके Sub Label का नहीं है।");
        router.push("/sub-label-dashboard/my-songs");
        return;
      }

      const {
        data: songData,
        error: songError,
      } = await supabase
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
        .maybeSingle();

      if (songError) {
        console.error("Song Error:", songError);
        alert(songError.message);
        return;
      }

      if (!songData) {
        alert("Song नहीं मिला");
        router.push("/sub-label-dashboard/my-songs");
        return;
      }

      setSong(songData);

      setSongTitle(songData.song_title || "");
      setArtistName(songData.artist_name || "");
      setAlbumName(songData.album_name || "");
      setSingerName(songData.singer_name || "");
      setComposer(songData.composer || "");
      setLyricist(songData.lyricist || "");
      setGenre(songData.genre || "");
      setLanguage(songData.language || "");
      setReleaseDate(songData.release_date || "");
    } catch (error) {
      console.error("Load Song Error:", error);
      alert("Song load नहीं हो पाया");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!song) return;

    if (!songTitle.trim()) {
      alert("Song Title डालें");
      return;
    }

    if (!artistName.trim()) {
      alert("Artist Name डालें");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const formData = new FormData();

      formData.append(
        "songId",
        String(song.id)
      );

      formData.append(
        "songTitle",
        songTitle.trim()
      );

      formData.append(
        "artistName",
        artistName.trim()
      );

      formData.append(
        "albumName",
        albumName.trim()
      );

      formData.append(
        "singerName",
        singerName.trim()
      );

      formData.append(
        "composer",
        composer.trim()
      );

      formData.append(
        "lyricist",
        lyricist.trim()
      );

      formData.append(
        "genre",
        genre.trim()
      );

      formData.append(
        "language",
        language.trim()
      );

      formData.append(
        "releaseDate",
        releaseDate
      );

      if (coverFile) {
        formData.append(
          "coverFile",
          coverFile
        );
      }

      if (audioFile) {
        formData.append(
          "audioFile",
          audioFile
        );
      }

      const response = await fetch(
        "/api/sub-label-songs/update",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      // Read raw response first
      const responseText = await response.text();

      let result: any = {};

      try {
        result = JSON.parse(responseText);
      } catch {
        console.error(
          "Server Raw Response:",
          responseText
        );
      }

      if (!response.ok) {
        console.error(
          "Update Error:",
          result
        );

        alert(
          result.error ||
            responseText ||
            "Song update नहीं हो पाया"
        );

        return;
      }

      alert(
        "Song successfully update होकर Pending में भेज दिया गया।"
      );

      router.push(
        "/sub-label-dashboard/my-songs"
      );
    } catch (error) {
      console.error(
        "Save Error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Song update नहीं हो पाया"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
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
        Loading Song...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#fff",
        padding: "35px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            gap: "15px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
              }}
            >
              Edit Song
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginTop: "8px",
              }}
            >
              Song details update करें
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/sub-label-dashboard/my-songs"
              )
            }
            style={{
              padding: "11px 16px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>

        {/* REJECTION MESSAGE */}
        {song?.status === "Rejected" &&
          song.rejection_reason && (
            <div
              style={{
                marginBottom: "25px",
                padding: "18px",
                borderRadius: "10px",
                background:
                  "rgba(127,29,29,0.25)",
                border:
                  "1px solid rgba(248,113,113,0.35)",
              }}
            >
              <div
                style={{
                  color: "#fca5a5",
                  fontWeight: "700",
                  marginBottom: "7px",
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

        {/* FORM */}
        <form
          onSubmit={handleSave}
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "14px",
            padding: "30px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            <Field
              label="Song Title"
              value={songTitle}
              onChange={setSongTitle}
              required
            />

            <Field
              label="Artist Name"
              value={artistName}
              onChange={setArtistName}
              required
            />

            <Field
              label="Album Name"
              value={albumName}
              onChange={setAlbumName}
            />

            <Field
              label="Singer Name"
              value={singerName}
              onChange={setSingerName}
            />

            <Field
              label="Composer"
              value={composer}
              onChange={setComposer}
            />

            <Field
              label="Lyricist"
              value={lyricist}
              onChange={setLyricist}
            />

            <Field
              label="Genre"
              value={genre}
              onChange={setGenre}
            />

            <Field
              label="Language"
              value={language}
              onChange={setLanguage}
            />

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#cbd5e1",
                  fontSize: "14px",
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
                style={inputStyle}
              />
            </div>
          </div>

          {/* COVER */}
          <div style={{ marginTop: "25px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#cbd5e1",
                fontSize: "14px",
              }}
            >
              Change Cover Art
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setCoverFile(
                  e.target.files?.[0] || null
                )
              }
              style={{
                width: "100%",
                color: "#cbd5e1",
              }}
            />

            {song?.cover_url && (
              <img
                src={song.cover_url}
                alt="Current Cover"
                style={{
                  marginTop: "15px",
                  width: "140px",
                  height: "140px",
                  objectFit: "cover",
                  borderRadius: "10px",
                }}
              />
            )}
          </div>

          {/* AUDIO */}
          <div style={{ marginTop: "25px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#cbd5e1",
                fontSize: "14px",
              }}
            >
              Change Audio
            </label>

            <input
              type="file"
              accept="audio/mpeg,audio/wav,audio/x-wav"
              onChange={(e) =>
                setAudioFile(
                  e.target.files?.[0] || null
                )
              }
              style={{
                width: "100%",
                color: "#cbd5e1",
              }}
            />

            {song?.audio_url && (
              <audio
                controls
                src={song.audio_url}
                style={{
                  width: "100%",
                  marginTop: "15px",
                }}
              />
            )}
          </div>

          {/* NOTICE */}
          <div
            style={{
              marginTop: "25px",
              padding: "15px",
              borderRadius: "9px",
              background: "#172033",
              border: "1px solid #26354d",
              color: "#94a3b8",
              fontSize: "13px",
              lineHeight: "1.7",
            }}
          >
            Save करने के बाद song दोबारा{" "}
            <strong style={{ color: "#facc15" }}>
              Pending
            </strong>{" "}
            status में चला जाएगा और Admin को
            दोबारा approve करना होगा।
          </div>

          {/* BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "30px",
            }}
          >
            <button
              type="submit"
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
                : "Save & Resubmit"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/my-songs"
                )
              }
              style={{
                padding: "13px 22px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          color: "#cbd5e1",
          fontSize: "14px",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "#f87171" }}>
            {" "}
            *
          </span>
        )}
      </label>

      <input
        type="text"
        value={value}
        required={required}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={inputStyle}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#020617",
  color: "#fff",
  outline: "none",
};