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

  const [song, setSong] =
    useState<Song | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // Check whether current user is a customer
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

      // CUSTOMER
      const {
        data: customerData,
        error: customerError,
      } = await supabase
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

      // CHECK CUSTOMER SONG RELATION
      const {
        data: customerSong,
        error: customerSongError,
      } = await supabase
        .from("customer_songs")
        .select("song_id")
        .eq("customer_id", customerId)
        .eq("song_id", songId)
        .maybeSingle();

      if (customerSongError || !customerSong) {
        alert(
          "Ye song is customer ke account me nahi hai ❌"
        );

        router.replace(
          `/customers/${customerId}`
        );

        return;
      }

      // SONG
      const {
        data: songData,
        error: songError,
      } = await supabase
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

      // SIGNED COVER URL
      if (coverUrl) {
        const { data } =
          await supabase.storage
            .from("songs")
            .createSignedUrl(
              coverUrl,
              60 * 60
            );

        if (data?.signedUrl) {
          coverUrl = data.signedUrl;
        }
      }

      // SIGNED AUDIO URL
      if (audioUrl) {
        const { data } =
          await supabase.storage
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

  // APPROVE
  async function approveSong() {
    if (!song) return;

    const confirmed = window.confirm(
      "Kya aap is song ko APPROVE karna chahte hain?"
    );

    if (!confirmed) return;

    setActionLoading(true);

    try {
      const { error } =
        await supabase
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

  // REJECT
  async function rejectSong() {
    if (!song) return;

    const reason = window.prompt(
      "Rejection reason likhiye:"
    );

    if (reason === null) return;

    const trimmedReason =
      reason.trim();

    if (!trimmedReason) {
      alert(
        "Rejection reason dena zaroori hai ❌"
      );
      return;
    }

    setActionLoading(true);

    try {
      const { error } =
        await supabase
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

  // DELETE
  async function deleteSong() {
    if (!song) return;

    const firstConfirm =
      window.confirm(
        "Kya aap is song ko delete karna chahte hain?"
      );

    if (!firstConfirm) return;

    const secondConfirm =
      window.confirm(
        "WARNING ⚠️\n\nYe song customer ke account se delete ho jayega.\n\nKya aap REALLY delete karna chahte hain?"
      );

    if (!secondConfirm) return;

    setActionLoading(true);

    try {
      const {
        error: relationError,
      } = await supabase
        .from("customer_songs")
        .delete()
        .eq("customer_id", customerId)
        .eq("song_id", song.id);

      if (relationError) {
        console.error(
          relationError
        );

        alert(
          "Customer song relation delete nahi hua ❌"
        );

        return;
      }

      const {
        error: songDeleteError,
      } = await supabase
        .from("songs")
        .delete()
        .eq("id", song.id);

      if (songDeleteError) {
        console.error(
          songDeleteError
        );

        alert(
          "Song database se delete nahi hua ❌"
        );

        return;
      }

      alert(
        "Song successfully deleted ✅"
      );

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
        border: "1px solid #bbf7d0",
      };
    }

    if (status === "Rejected") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fecaca",
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fde68a",
    };
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #f8fafc, #eef2ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          fontWeight: "800",
          color: "#111827",
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

  const statusStyle =
    getStatusStyle(song.status);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        color: "#111827",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background:
            "linear-gradient(135deg, #111827, #1f2937)",
          color: "#fff",
          padding: "18px 25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "900",
              letterSpacing: "-0.5px",
            }}
          >
            🎵 Song Details
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
            border:
              "1px solid #4b5563",
            borderRadius: "9px",
            padding: "10px 16px",
            cursor: "pointer",
            fontWeight: "800",
          }}
        >
          ← Back to Customer
        </button>
      </header>

      <main
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "28px 20px 60px",
        }}
      >
        {/* CUSTOMER CARD */}
        <section
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "22px",
            boxShadow:
              "0 8px 30px rgba(15,23,42,0.07)",
            border:
              "1px solid #e5e7eb",
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
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                  marginBottom: "6px",
                }}
              >
                CUSTOMER ACCOUNT
              </div>

              <div
                style={{
                  fontSize: "23px",
                  fontWeight: "900",
                }}
              >
                {customer.customer_name ||
                  "Unknown Customer"}
              </div>

              <div
                style={{
                  color: "#6b7280",
                  marginTop: "5px",
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
                    fontSize: "14px",
                  }}
                >
                  ✉️ {customer.email}
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
                padding:
                  "8px 14px",
                borderRadius:
                  "999px",
                fontSize: "13px",
                fontWeight: "900",
              }}
            >
              {customer.is_active === false
                ? "● Inactive"
                : "● Active"}
            </span>
          </div>
        </section>

        {/* MAIN SONG CARD */}
        <section
          className="song-main-card"
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "25px",
            boxShadow:
              "0 10px 35px rgba(15,23,42,0.08)",
            border:
              "1px solid #e5e7eb",
            display: "grid",
            gridTemplateColumns:
              "330px minmax(0, 1fr)",
            gap: "32px",
          }}
        >
          {/* COVER */}
          <div>
            <div
              style={{
                position: "relative",
                width: "100%",
              }}
            >
              {song.cover_url ? (
                <img
                  src={song.cover_url}
                  alt={
                    song.song_title ??
                    "Song cover"
                  }
                  style={{
                    width: "100%",
                    aspectRatio:
                      "1 / 1",
                    objectFit: "cover",
                    borderRadius:
                      "18px",
                    display: "block",
                    boxShadow:
                      "0 15px 35px rgba(0,0,0,0.16)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio:
                      "1 / 1",
                    borderRadius:
                      "18px",
                    background:
                      "linear-gradient(135deg,#e5e7eb,#d1d5db)",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize: "65px",
                  }}
                >
                  🎵
                </div>
              )}
            </div>

            {/* COVER LABEL */}
            <div
              style={{
                textAlign: "center",
                color: "#6b7280",
                fontSize: "12px",
                fontWeight: "700",
                marginTop: "10px",
              }}
            >
              COVER ART
            </div>
          </div>

          {/* SONG DETAILS */}
          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "12px",
                fontWeight: "900",
                letterSpacing: "1px",
                marginBottom: "7px",
              }}
            >
              SONG
            </div>

            <div
              style={{
                fontSize: "36px",
                fontWeight: "950",
                lineHeight: "1.15",
                wordBreak:
                  "break-word",
              }}
            >
              {song.song_title ||
                "Untitled Song"}
            </div>

            <div
              style={{
                color: "#6b7280",
                fontSize: "18px",
                marginTop: "8px",
                marginBottom: "18px",
              }}
            >
              👤{" "}
              {song.artist_name ||
                "Unknown Artist"}
            </div>

            {/* STATUS */}
            <span
              style={{
                display:
                  "inline-block",
                ...statusStyle,
                padding:
                  "8px 15px",
                borderRadius:
                  "999px",
                fontWeight: "900",
                fontSize: "13px",
                marginBottom: "22px",
              }}
            >
              {song.status ||
                "Pending"}
            </span>

            {/* AUDIO BOX */}
            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontWeight: "900",
                  marginBottom: "10px",
                }}
              >
                🎧 Audio Preview
              </div>

              {song.audio_url ? (
                <audio
                  controls
                  src={song.audio_url}
                  style={{
                    width: "100%",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Audio file available nahi hai.
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "20px",
              }}
            >
              <button
                disabled={actionLoading}
                onClick={approveSong}
                style={{
                  background:
                    "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "9px",
                  padding:
                    "11px 17px",
                  cursor:
                    actionLoading
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "900",
                  opacity:
                    actionLoading
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
                  background:
                    "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "9px",
                  padding:
                    "11px 17px",
                  cursor:
                    actionLoading
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "900",
                  opacity:
                    actionLoading
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
                  background:
                    "#111827",
                  color: "#fff",
                  border: "none",
                  borderRadius: "9px",
                  padding:
                    "11px 17px",
                  cursor:
                    actionLoading
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "900",
                  opacity:
                    actionLoading
                      ? 0.6
                      : 1,
                }}
              >
                🗑️ Delete
              </button>
            </div>

            {/* REJECTION BOX */}
            {song.status ===
              "Rejected" && (
              <div
                style={{
                  marginTop: "20px",
                  background:
                    "#fff1f2",
                  border:
                    "1px solid #fecdd3",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    color: "#be123c",
                    fontWeight: "900",
                    marginBottom: "6px",
                  }}
                >
                  ❌ Rejection Reason
                </div>

                <div
                  style={{
                    color: "#881337",
                    lineHeight: "1.6",
                    fontSize: "14px",
                  }}
                >
                  {song.rejection_reason ||
                    "No reason provided"}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* COMPLETE INFORMATION */}
        <section
          style={{
            marginTop: "22px",
            background: "#fff",
            borderRadius: "18px",
            padding: "25px",
            boxShadow:
              "0 8px 30px rgba(15,23,42,0.06)",
            border:
              "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "12px",
                fontWeight: "900",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              METADATA
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "23px",
                fontWeight: "900",
              }}
            >
              📋 Complete Song Information
            </h2>
          </div>

          <div
            className="info-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "14px",
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

        {/* DOWNLOAD SECTION */}
        <section
          style={{
            marginTop: "22px",
            background: "#fff",
            borderRadius: "18px",
            padding: "25px",
            boxShadow:
              "0 8px 30px rgba(15,23,42,0.06)",
            border:
              "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "12px",
                fontWeight: "900",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              FILES
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "23px",
                fontWeight: "900",
              }}
            >
              📥 Download Files
            </h2>
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
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  background:
                    "#2563eb",
                  color: "#fff",
                  textDecoration:
                    "none",
                  padding:
                    "12px 18px",
                  borderRadius: "9px",
                  fontWeight: "900",
                  display:
                    "inline-block",
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
                  background:
                    "#059669",
                  color: "#fff",
                  textDecoration:
                    "none",
                  padding:
                    "12px 18px",
                  borderRadius: "9px",
                  fontWeight: "900",
                  display:
                    "inline-block",
                }}
              >
                🖼️ Download Cover
              </a>
            )}
          </div>
        </section>
      </main>

      {/* MOBILE RESPONSIVE */}
      <style jsx>{`
        @media (max-width: 800px) {
          .song-main-card {
            grid-template-columns: 1fr !important;
          }

          .info-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          main {
            padding: 18px 12px 45px !important;
          }

          header {
            padding: 15px !important;
          }

          .song-main-card {
            padding: 17px !important;
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
        background:
          "linear-gradient(135deg,#f8fafc,#ffffff)",
        border:
          "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "15px",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: "11px",
          fontWeight: "900",
          textTransform:
            "uppercase",
          letterSpacing: "0.7px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "15px",
          fontWeight: "800",
          wordBreak:
            "break-word",
          color: "#111827",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}