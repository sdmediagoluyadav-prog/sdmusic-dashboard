"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: string;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  singer_name: string | null;
  composer: string | null;
  lyricist: string | null;
  genre: string | null;
  language: string | null;
  release_date: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
};

export default function SongDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const songId = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    loadSong();
  }, []);

  async function loadSong() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // Customer check
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (customerError || !customer) {
        alert("Customer account nahi mila ❌");
        router.replace("/login");
        return;
      }

      setCustomerId(customer.id);

      // Ownership check
      const { data: customerSong, error: customerSongError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customer.id)
          .eq("song_id", songId)
          .maybeSingle();

      if (customerSongError || !customerSong) {
        alert("Ye song aapke account me available nahi hai ❌");
        router.replace("/customer-dashboard");
        return;
      }

      // Song load
      const { data: songData, error: songError } = await supabase
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

      if (songError || !songData) {
        alert("Song nahi mila ❌");
        router.replace("/customer-dashboard");
        return;
      }

      let coverUrl = songData.cover_url;
      let audioUrl = songData.audio_url;

      // Cover signed URL
      if (coverUrl) {
        const { data } = await supabase.storage
          .from("songs")
          .createSignedUrl(coverUrl, 60 * 60);

        if (data?.signedUrl) {
          coverUrl = data.signedUrl;
        }
      }

      // Audio signed URL
      if (audioUrl) {
        const { data } = await supabase.storage
          .from("songs")
          .createSignedUrl(audioUrl, 60 * 60);

        if (data?.signedUrl) {
          audioUrl = data.signedUrl;
        }
      }

      setSong({
        ...songData,
        cover_url: coverUrl,
        audio_url: audioUrl,
      });
    } catch (error) {
      console.error(error);
      alert("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  }

  function statusStyle(status: string | null) {
    if (status === "Approved") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (status === "Rejected") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading Song Details... 🎵
      </div>
    );
  }

  if (!song) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Song not found ❌
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#111827",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#111827",
          color: "#fff",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "22px", fontWeight: "800" }}>
            🎵 Song Details
          </div>

          <div
            style={{
              color: "#9ca3af",
              fontSize: "13px",
              marginTop: "3px",
            }}
          >
            SD Media Entertainment
          </div>
        </div>

        <button
          onClick={() => router.push("/customer-dashboard")}
          style={{
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 15px",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Main */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "30px 20px 50px",
        }}
      >
        {/* Cover + basic info */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: "30px",
          }}
        >
          {/* Cover */}
          <div>
            {song.cover_url ? (
              <img
                src={song.cover_url}
                alt={song.song_title ?? "Song cover"}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  borderRadius: "14px",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: "14px",
                  background: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                }}
              >
                No Cover
              </div>
            )}
          </div>

          {/* Main information */}
          <div>
            <div
              style={{
                fontSize: "30px",
                fontWeight: "800",
                marginBottom: "8px",
              }}
            >
              {song.song_title || "Untitled Song"}
            </div>

            <div
              style={{
                fontSize: "17px",
                color: "#6b7280",
                marginBottom: "18px",
              }}
            >
              {song.artist_name || "Unknown Artist"}
            </div>

            <span
              style={{
                ...statusStyle(song.status),
                padding: "7px 13px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "800",
                display: "inline-block",
                marginBottom: "25px",
              }}
            >
              {song.status || "Pending"}
            </span>

            {song.audio_url && (
              <div style={{ marginTop: "5px" }}>
                <div
                  style={{
                    fontWeight: "700",
                    marginBottom: "8px",
                  }}
                >
                  🎧 Audio Preview
                </div>

                <audio
                  controls
                  src={song.audio_url}
                  style={{
                    width: "100%",
                  }}
                />
              </div>
            )}

            {song.status === "Rejected" && (
              <div
                style={{
                  marginTop: "22px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    color: "#991b1b",
                    fontWeight: "800",
                    marginBottom: "5px",
                  }}
                >
                  ❌ Rejection Reason
                </div>

                <div
                  style={{
                    color: "#7f1d1d",
                    lineHeight: "1.5",
                  }}
                >
                  {song.rejection_reason || "No reason provided"}
                </div>

                <button
                  onClick={() =>
                    router.push(
                      `/customer-dashboard/edit/${song.id}`
                    )
                  }
                  style={{
                    marginTop: "15px",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  ✏️ Edit & Resubmit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Song Information */}
        <div
          style={{
            marginTop: "25px",
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: "21px",
              fontWeight: "800",
              marginBottom: "20px",
            }}
          >
            📋 Song Information
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "15px",
            }}
          >
            <Info label="Song Title" value={song.song_title} />
            <Info label="Artist Name" value={song.artist_name} />
            <Info label="Album Name" value={song.album_name} />
            <Info label="Singer Name" value={song.singer_name} />
            <Info label="Composer" value={song.composer} />
            <Info label="Lyricist" value={song.lyricist} />
            <Info label="Genre" value={song.genre} />
            <Info label="Language" value={song.language} />
            <Info label="Release Date" value={song.release_date} />
            <Info label="Status" value={song.status} />
          </div>
        </div>

        {/* Download */}
        <div
          style={{
            marginTop: "25px",
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: "21px",
              fontWeight: "800",
              marginBottom: "18px",
            }}
          >
            📥 Files
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {song.audio_url && (
              <a
                href={song.audio_url}
                download
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "11px 16px",
                  borderRadius: "8px",
                  fontWeight: "700",
                }}
              >
                🎧 Download Audio
              </a>
            )}

            {song.cover_url && (
              <a
                href={song.cover_url}
                download
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#059669",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "11px 16px",
                  borderRadius: "8px",
                  fontWeight: "700",
                }}
              >
                🖼️ Download Cover
              </a>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 700px) {
          div[style*="grid-template-columns: 280px 1fr"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="repeat(2, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
          marginBottom: "5px",
          fontWeight: "700",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "15px",
          fontWeight: "700",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}