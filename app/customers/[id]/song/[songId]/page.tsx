"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  customer_name: string | null;
  label_name: string | null;
  email: string | null;
  is_active: boolean | null;
};

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

export default function AdminCustomerSongDetails() {
  const params = useParams();
  const router = useRouter();

  const customerId = params.id as string;
  const songId = params.songId as string;

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [song, setSong] = useState<Song | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      // Current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // Check whether current user is a customer.
      // Admin account should not be connected to customers table.
      const { data: currentCustomer } =
        await supabase
          .from("customers")
          .select("id")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

      if (currentCustomer) {
        alert("Admin access required ❌");
        router.replace("/customer-dashboard");
        return;
      }

      // Customer
      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select(
            "id, customer_name, label_name, email, is_active"
          )
          .eq("id", customerId)
          .single();

      if (customerError || !customerData) {
        alert("Customer nahi mila ❌");
        router.replace("/customers");
        return;
      }

      setCustomer(customerData);

      // Check customer-song relation
      const {
        data: customerSong,
        error: customerSongError,
      } = await supabase
        .from("customer_songs")
        .select("song_id")
        .eq("customer_id", customerId)
        .eq("song_id", songId)
        .maybeSingle();

      if (
        customerSongError ||
        !customerSong
      ) {
        alert(
          "Ye song is customer ke account me nahi hai ❌"
        );

        router.replace(
          `/customers/${customerId}`
        );

        return;
      }

      // Song
      const { data: songData, error: songError } =
        await supabase
          .from("songs")
          .select(
            `
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
          `
          )
          .eq("id", songId)
          .single();

      if (songError || !songData) {
        alert("Song nahi mila ❌");

        router.replace(
          `/customers/${customerId}`
        );

        return;
      }

      let coverUrl = songData.cover_url;
      let audioUrl = songData.audio_url;

      // Signed cover URL
      if (coverUrl) {
        const { data } = await supabase.storage
          .from("songs")
          .createSignedUrl(
            coverUrl,
            60 * 60
          );

        if (data?.signedUrl) {
          coverUrl = data.signedUrl;
        }
      }

      // Signed audio URL
      if (audioUrl) {
        const { data } = await supabase.storage
          .from("songs")
          .createSignedUrl(
            audioUrl,
            60 * 60
          );

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

  async function approveSong() {
    if (!song) return;

    const confirmed = window.confirm(
      "Kya aap is song ko APPROVE karna chahte hain?"
    );

    if (!confirmed) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("songs")
        .update({
          status: "Approved",
          rejection_reason: null,
        })
        .eq("id", song.id);

      if (error) {
        console.error(error);
        alert(
          "Song approve nahi ho paya ❌"
        );
        return;
      }

      setSong({
        ...song,
        status: "Approved",
        rejection_reason: null,
      });

      alert("Song Approved ✅");
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectSong() {
    if (!song) return;

    const reason = window.prompt(
      "Rejection reason likhiye:"
    );

    if (reason === null) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      alert(
        "Rejection reason dena zaroori hai ❌"
      );
      return;
    }

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("songs")
        .update({
          status: "Rejected",
          rejection_reason:
            trimmedReason,
        })
        .eq("id", song.id);

      if (error) {
        console.error(error);
        alert(
          "Song reject nahi ho paya ❌"
        );
        return;
      }

      setSong({
        ...song,
        status: "Rejected",
        rejection_reason:
          trimmedReason,
      });

      alert("Song Rejected ❌");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteSong() {
    if (!song) return;

    const firstConfirm = window.confirm(
      "Kya aap is song ko delete karna chahte hain?"
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "WARNING ⚠️\n\nYe song customer ke account se delete ho jayega.\n\nKya aap REALLY delete karna chahte hain?"
    );

    if (!secondConfirm) return;

    setActionLoading(true);

    try {
      // Delete customer-song relation first
      const { error: relationError } =
        await supabase
          .from("customer_songs")
          .delete()
          .eq("customer_id", customerId)
          .eq("song_id", song.id);

      if (relationError) {
        console.error(relationError);

        alert(
          "Customer song relation delete nahi hua ❌"
        );

        return;
      }

      // Delete song row
      const { error: songDeleteError } =
        await supabase
          .from("songs")
          .delete()
          .eq("id", song.id);

      if (songDeleteError) {
        console.error(songDeleteError);

        alert(
          "Song database se delete nahi hua ❌"
        );

        return;
      }

      alert("Song successfully deleted ✅");

      router.replace(
        `/customers/${customerId}`
      );
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusStyle(
    status: string | null
  ) {
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
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          fontWeight: "800",
        }}
      >
        Loading Customer Song... 🎵
      </div>
    );
  }

  if (!customer || !song) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          fontWeight: "800",
        }}
      >
        Data not found ❌
      </div>
    );
  }

  const statusStyle = getStatusStyle(
    song.status
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#111827",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "#111827",
          color: "#fff",
          padding: "16px 25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "23px",
              fontWeight: "900",
            }}
          >
            🎵 Customer Song Details
          </div>

          <div
            style={{
              color: "#9ca3af",
              fontSize: "13px",
              marginTop: "4px",
            }}
          >
            SD Media Entertainment
          </div>
        </div>

        <button
          onClick={() =>
            router.push(
              `/customers/${customerId}`
            )
          }
          style={{
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 15px",
            cursor: "pointer",
            fontWeight: "800",
          }}
        >
          ← Back to Customer
        </button>
      </header>

      <main
        style={{
          maxWidth: "1150px",
          margin: "0 auto",
          padding: "30px 20px 60px",
        }}
      >
        {/* CUSTOMER INFO */}
        <section
          style={{
            background: "#fff",
            borderRadius: "15px",
            padding: "20px",
            marginBottom: "22px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  fontWeight: "700",
                  marginBottom: "5px",
                }}
              >
                CUSTOMER
              </div>

              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "900",
                }}
              >
                {customer.customer_name ||
                  "Unknown Customer"}
              </div>

              <div
                style={{
                  color: "#6b7280",
                  marginTop: "4px",
                }}
              >
                Label:{" "}
                {customer.label_name ||
                  "—"}
              </div>

              {customer.email && (
                <div
                  style={{
                    color: "#6b7280",
                    marginTop: "3px",
                  }}
                >
                  Email: {customer.email}
                </div>
              )}
            </div>

            <span
              style={{
                background:
                  customer.is_active === false
                    ? "#fee2e2"
                    : "#dcfce7",
                color:
                  customer.is_active === false
                    ? "#991b1b"
                    : "#166534",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "800",
              }}
            >
              {customer.is_active === false
                ? "Inactive"
                : "Active"}
            </span>
          </div>
        </section>

        {/* SONG HEADER */}
        <section
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.06)",
            display: "grid",
            gridTemplateColumns:
              "300px minmax(0, 1fr)",
            gap: "30px",
          }}
        >
          {/* COVER */}
          <div>
            {song.cover_url ? (
              <img
                src={song.cover_url}
                alt={
                  song.song_title ??
                  "Song cover"
                }
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
                  fontSize: "50px",
                }}
              >
                🎵
              </div>
            )}
          </div>

          {/* SONG BASIC */}
          <div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "900",
                marginBottom: "7px",
              }}
            >
              {song.song_title ||
                "Untitled Song"}
            </div>

            <div
              style={{
                color: "#6b7280",
                fontSize: "17px",
                marginBottom: "18px",
              }}
            >
              👤{" "}
              {song.artist_name ||
                "Unknown Artist"}
            </div>

            <span
              style={{
                display: "inline-block",
                ...statusStyle,
                padding: "8px 14px",
                borderRadius: "999px",
                fontWeight: "900",
                fontSize: "13px",
                marginBottom: "25px",
              }}
            >
              {song.status ||
                "Pending"}
            </span>

            {/* AUDIO */}
            {song.audio_url && (
              <div
                style={{
                  marginTop: "5px",
                }}
              >
                <div
                  style={{
                    fontWeight: "800",
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

            {/* ACTIONS */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "22px",
              }}
            >
              <button
                disabled={actionLoading}
                onClick={approveSong}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "11px 16px",
                  cursor: actionLoading
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "800",
                  opacity: actionLoading
                    ? 0.6
                    : 1,
                }}
              >
                ✅ Approve
              </button>

              <button
                disabled={actionLoading}
                onClick={rejectSong}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "11px 16px",
                  cursor: actionLoading
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "800",
                  opacity: actionLoading
                    ? 0.6
                    : 1,
                }}
              >
                ❌ Reject
              </button>

              <button
                disabled={actionLoading}
                onClick={deleteSong}
                style={{
                  background: "#111827",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "11px 16px",
                  cursor: actionLoading
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "800",
                  opacity: actionLoading
                    ? 0.6
                    : 1,
                }}
              >
                🗑️ Delete
              </button>
            </div>

            {/* REJECTION */}
            {song.status ===
              "Rejected" && (
              <div
                style={{
                  marginTop: "22px",
                  background: "#fef2f2",
                  border:
                    "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    color: "#991b1b",
                    fontWeight: "900",
                    marginBottom: "6px",
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
                  {song.rejection_reason ||
                    "No reason provided"}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FULL SONG INFORMATION */}
        <section
          style={{
            marginTop: "22px",
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "22px",
              fontWeight: "900",
            }}
          >
            📋 Complete Song Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "15px",
            }}
          >
            <Info
              label="Song Title"
              value={song.song_title}
            />

            <Info
              label="Artist Name"
              value={song.artist_name}
            />

            <Info
              label="Album Name"
              value={song.album_name}
            />

            <Info
              label="Singer Name"
              value={song.singer_name}
            />

            <Info
              label="Composer"
              value={song.composer}
            />

            <Info
              label="Lyricist"
              value={song.lyricist}
            />

            <Info
              label="Genre"
              value={song.genre}
            />

            <Info
              label="Language"
              value={song.language}
            />

            <Info
              label="Release Date"
              value={song.release_date}
            />

            <Info
              label="Status"
              value={song.status}
            />
          </div>
        </section>

        {/* DOWNLOAD FILES */}
        <section
          style={{
            marginTop: "22px",
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: "22px",
              fontWeight: "900",
            }}
          >
            📥 Download Files
          </h2>

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
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "11px 16px",
                  borderRadius: "8px",
                  fontWeight: "800",
                }}
              >
                🎧 Download Audio
              </a>
            )}

            {song.cover_url && (
              <a
                href={song.cover_url}
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  background: "#059669",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "11px 16px",
                  borderRadius: "8px",
                  fontWeight: "800",
                }}
              >
                🖼️ Download Cover
              </a>
            )}
          </div>
        </section>
      </main>

      <style jsx>{`
        @media (max-width: 750px) {
          main {
            padding: 18px 12px !important;
          }

          section[style*="300px minmax"] {
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
        padding: "15px",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: "800",
          textTransform: "uppercase",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "15px",
          fontWeight: "800",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}