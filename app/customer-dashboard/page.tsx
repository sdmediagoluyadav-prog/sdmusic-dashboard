"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
};

export default function CustomerDashboard() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadCustomerDashboard();
  }, []);

  async function loadCustomerDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

      // Check login session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // Find customer account
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, customer_name, label_name")
        .eq("auth_user_id", session.user.id)
        .single();

      if (customerError || !customer) {
        console.error("Customer error:", customerError);
        setErrorMessage("Customer account नहीं मिला ❌");
        setLoading(false);
        return;
      }

      setCustomerName(customer.customer_name || "");
      setLabelName(customer.label_name || "");

      // Find customer's songs
      const { data: customerSongs, error: customerSongsError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customer.id);

      if (customerSongsError) {
        console.error("Customer songs error:", customerSongsError);
        setErrorMessage("Songs load नहीं हो पाए ❌");
        setLoading(false);
        return;
      }

      const songIds = (customerSongs || []).map((item) => item.song_id);

      if (songIds.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      // Get songs
      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select(
          "id, song_title, artist_name, cover_url, audio_url, status, rejection_reason"
        )
        .in("id", songIds)
        .order("id", { ascending: false });

      if (songsError) {
        console.error("Songs error:", songsError);
        setErrorMessage("Songs load नहीं हो पाए ❌");
        setLoading(false);
        return;
      }

      setSongs(songsData || []);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("कुछ गलत हो गया ❌");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getStatusStyle(status: string | null) {
    const currentStatus = status?.toLowerCase();

    if (currentStatus === "approved") {
      return {
        background: "#14532d",
        color: "#86efac",
        border: "1px solid #166534",
      };
    }

    if (currentStatus === "rejected") {
      return {
        background: "#7f1d1d",
        color: "#fca5a5",
        border: "1px solid #991b1b",
      };
    }

    return {
      background: "#78350f",
      color: "#fdba74",
      border: "1px solid #92400e",
    };
  }

  function getStatusText(status: string | null) {
    if (!status) return "Pending";

    const currentStatus = status.toLowerCase();

    if (currentStatus === "approved") return "Approved";
    if (currentStatus === "rejected") return "Rejected";
    if (currentStatus === "pending") return "Pending";

    return status;
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b0f19",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
      >
        Loading Customer Dashboard... 🔐
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b0f19",
          color: "#fff",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "80px auto",
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "16px",
            padding: "40px 25px",
          }}
        >
          <h1 style={{ fontSize: "28px", marginBottom: "15px" }}>
            {errorMessage}
          </h1>

          <p style={{ color: "#9ca3af", marginBottom: "25px" }}>
            कृपया customer account की जानकारी check करें।
          </p>

          <button
            onClick={() => router.push("/login")}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "12px 22px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            वापस Login करें
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f19",
        color: "#fff",
        padding: "25px",
      }}
    >
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "700",
                margin: 0,
              }}
            >
              Customer Dashboard
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#9ca3af",
              }}
            >
              {customerName}
              {labelName ? ` • ${labelName}` : ""}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => router.push("/upload")}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "12px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              + Upload Song
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: "#1f2937",
                color: "#fff",
                border: "1px solid #374151",
                padding: "12px 18px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Logo */}
        <div
          style={{
            padding: "5px",
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "150px",
              height: "150px",
              objectFit: "contain",
              display: "block",
              margin: "0 auto 8px",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            Music Content Management
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "16px",
              padding: "22px",
            }}
          >
            <p
              style={{
                color: "#9ca3af",
                margin: 0,
                fontSize: "14px",
              }}
            >
              Total Songs
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "32px",
              }}
            >
              {songs.length}
            </h2>
          </div>
        </div>

        {/* Songs Section */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "10px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
              }}
            >
              My Songs
            </h2>

            <button
              onClick={loadCustomerDashboard}
              style={{
                background: "#111827",
                color: "#d1d5db",
                border: "1px solid #374151",
                padding: "9px 14px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          {songs.length === 0 ? (
            <div
              style={{
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: "16px",
                padding: "50px 20px",
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: "22px",
                }}
              >
                अभी कोई Song नहीं है 🎵
              </h3>

              <p
                style={{
                  color: "#9ca3af",
                  marginBottom: "20px",
                }}
              >
                अपना पहला song upload करें।
              </p>

              <button
                onClick={() => router.push("/upload")}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                Upload Song
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              {songs.map((song) => (
                <div
                  key={song.id}
                  style={{
                    background: "#111827",
                    border: "1px solid #1f2937",
                    borderRadius: "16px",
                    overflow: "hidden",
                  }}
                >
                  {/* Cover */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      background: "#1f2937",
                    }}
                  >
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.song_title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
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

                  {/* Song Details */}
                  <div
                    style={{
                      padding: "18px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "20px",
                        lineHeight: "1.3",
                      }}
                    >
                      {song.song_title}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 14px",
                        color: "#9ca3af",
                        fontSize: "14px",
                      }}
                    >
                      Artist: {song.artist_name}
                    </p>

                    {/* Status */}
                    <div
                      style={{
                        display: "inline-block",
                        padding: "7px 12px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: "600",
                        ...getStatusStyle(song.status),
                      }}
                    >
                      {getStatusText(song.status)}
                    </div>

                    {/* Rejection Reason */}
                    {song.status?.toLowerCase() === "rejected" &&
                      song.rejection_reason && (
                        <div
                          style={{
                            marginTop: "15px",
                            padding: "12px",
                            background: "#450a0a",
                            border: "1px solid #7f1d1d",
                            borderRadius: "10px",
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 5px",
                              color: "#fca5a5",
                              fontSize: "13px",
                              fontWeight: "700",
                            }}
                          >
                            Rejection Reason
                          </p>

                          <p
                            style={{
                              margin: 0,
                              color: "#fecaca",
                              fontSize: "14px",
                              lineHeight: "1.5",
                            }}
                          >
                            {song.rejection_reason}
                          </p>
                        </div>
                      )}

                    {/* Audio */}
                    {song.audio_url && (
                      <div
                        style={{
                          marginTop: "18px",
                        }}
                      >
                        <audio
                          controls
                          preload="none"
                          style={{
                            width: "100%",
                          }}
                        >
                          <source src={song.audio_url} />
                          Your browser does not support audio.
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}