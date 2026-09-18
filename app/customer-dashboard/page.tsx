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

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [labelName, setLabelName] = useState("");

  useEffect(() => {
    loadCustomerDashboard();
  }, []);

  async function loadCustomerDashboard() {
    setLoading(true);

    try {
      // CHECK LOGIN
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // FIND CUSTOMER
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, name, label_name")
        .eq("auth_user_id", session.user.id)
        .single();

      if (customerError || !customer) {
        console.error("Customer error:", customerError);

        alert("Customer account नहीं मिला ❌");

        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      setCustomerName(customer.name || "");
      setLabelName(customer.label_name || "");

      // FIND CUSTOMER SONG ASSIGNMENTS
      const { data: customerSongs, error: customerSongsError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customer.id);

      if (customerSongsError) {
        console.error(
          "Customer songs error:",
          customerSongsError
        );

        setSongs([]);
        setLoading(false);
        return;
      }

      if (!customerSongs || customerSongs.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      const songIds = customerSongs.map(
        (item) => item.song_id
      );

      // GET SONGS
      const { data: songData, error: songError } =
        await supabase
          .from("songs")
          .select(
            "id, song_title, artist_name, cover_url, audio_url, status, rejection_reason"
          )
          .in("id", songIds)
          .order("id", { ascending: false });

      if (songError) {
        console.error("Song error:", songError);

        alert(
          "Songs load nahi ho paaye ❌\n\n" +
            songError.message
        );

        setSongs([]);
      } else {
        setSongs(songData || []);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getStatusStyle(status: string | null) {
    if (status === "Approved") {
      return {
        background: "#052e16",
        color: "#4ade80",
        border: "1px solid #166534",
      };
    }

    if (status === "Rejected") {
      return {
        background: "#450a0a",
        color: "#f87171",
        border: "1px solid #991b1b",
      };
    }

    return {
      background: "#422006",
      color: "#fbbf24",
      border: "1px solid #92400e",
    };
  }

  function getStatusText(status: string | null) {
    if (status === "Approved") return "🟢 Approved";
    if (status === "Rejected") return "🔴 Rejected";

    return "🟠 Pending";
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading Customer Dashboard... 🔐
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "25px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* LOGO */}
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

        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "30px",
                margin: 0,
                marginBottom: "8px",
              }}
            >
              Customer Dashboard
            </h1>

            <p
              style={{
                color: "#94a3b8",
                margin: 0,
              }}
            >
              Welcome, {customerName || "Customer"}
            </p>

            {labelName && (
              <p
                style={{
                  color: "#64748b",
                  marginTop: "5px",
                  marginBottom: 0,
                }}
              >
                Label: {labelName}
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {/* UPLOAD BUTTON */}
            <button
              onClick={() => router.push("/upload")}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "11px 18px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              + Upload Song
            </button>

            {/* LOGOUT */}
            <button
              onClick={logout}
              style={{
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "11px 18px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* SONG COUNT */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "25px",
          }}
        >
          <p
            style={{
              color: "#94a3b8",
              margin: 0,
              fontSize: "14px",
            }}
          >
            Total Songs
          </p>

          <h2
            style={{
              margin: "5px 0 0",
              fontSize: "28px",
            }}
          >
            {songs.length}
          </h2>
        </div>

        {/* SONGS */}
        {songs.length === 0 ? (
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              No Songs Found
            </h2>

            <p
              style={{
                color: "#94a3b8",
              }}
            >
              Abhi aapke account me koi song available nahi hai.
            </p>

            <button
              onClick={() => router.push("/upload")}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "11px 20px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Upload Your First Song
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {songs.map((song) => (
              <div
                key={song.id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                {/* COVER */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    background: "#020617",
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
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                      }}
                    >
                      No Cover
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div
                  style={{
                    padding: "16px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 7px",
                      fontSize: "18px",
                    }}
                  >
                    {song.song_title}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 12px",
                      color: "#94a3b8",
                    }}
                  >
                    Artist: {song.artist_name}
                  </p>

                  {/* STATUS */}
                  <div
                    style={{
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        ...getStatusStyle(song.status),
                        display: "inline-block",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {getStatusText(song.status)}
                    </span>
                  </div>

                  {/* REJECTION REASON */}
                  {song.status === "Rejected" &&
                    song.rejection_reason && (
                      <div
                        style={{
                          background: "#1c0a0a",
                          border: "1px solid #7f1d1d",
                          borderRadius: "8px",
                          padding: "12px",
                          marginBottom: "14px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 5px",
                            color: "#fca5a5",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          Rejection Reason
                        </p>

                        <p
                          style={{
                            margin: 0,
                            color: "#fecaca",
                            fontSize: "13px",
                            lineHeight: "1.5",
                          }}
                        >
                          {song.rejection_reason}
                        </p>
                      </div>
                    )}

                  {/* AUDIO */}
                  {song.audio_url ? (
                    <audio
                      controls
                      src={song.audio_url}
                      style={{
                        width: "100%",
                      }}
                    />
                  ) : (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      Audio not available
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}