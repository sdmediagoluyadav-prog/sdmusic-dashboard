"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  album_name: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
};

type SubLabel = {
  id: number;
  name: string;
};

export default function CustomerDashboard() {
  const router = useRouter();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [labelName, setLabelName] = useState("");

  const [activeSection, setActiveSection] = useState("Dashboard");

  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [newSubLabel, setNewSubLabel] = useState("");

  useEffect(() => {
    loadCustomerDashboard();
  }, []);

  async function loadCustomerDashboard() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // CUSTOMER ACCOUNT
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, customer_name, label_name")
        .eq("auth_user_id", session.user.id)
        .single();

      if (customerError || !customer) {
        console.error("Customer error:", customerError);

        alert("Customer account नहीं मिला ❌");

        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      setCustomerName(customer.customer_name || "");
      setLabelName(customer.label_name || "");

      // CUSTOMER SONGS
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

      // SONGS
      const { data: songData, error: songError } =
        await supabase
          .from("songs")
          .select(
            "id, song_title, artist_name, album_name, cover_url, audio_url, status, rejection_reason"
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

  function addSubLabel() {
    const name = newSubLabel.trim();

    if (!name) {
      alert("Sub Label ka naam likhiye.");
      return;
    }

    const newItem: SubLabel = {
      id: Date.now(),
      name,
    };

    setSubLabels((old) => [...old, newItem]);
    setNewSubLabel("");

    alert(
      "Sub Label add ho gaya ✅\n\nNote: Abhi ye dashboard me temporary hai. Database me permanent save karna next step me karenge."
    );
  }

  function removeSubLabel(id: number) {
    setSubLabels((old) =>
      old.filter((item) => item.id !== id)
    );
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

  const artists = useMemo(() => {
    const names = songs
      .map((song) => song.artist_name?.trim())
      .filter(Boolean);

    return [...new Set(names)];
  }, [songs]);

  const albums = useMemo(() => {
    const names = songs
      .map((song) => song.album_name?.trim())
      .filter(Boolean);

    return [...new Set(names)];
  }, [songs]);

  const approvedSongs = useMemo(() => {
    return songs.filter(
      (song) => song.status === "Approved"
    ).length;
  }, [songs]);

  // फिलहाल royalty database में नहीं है
  const totalRoyalty = 0;

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
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
        }}
      >
        {/* ================= SIDEBAR ================= */}

        <aside
          style={{
            width: "240px",
            background: "#0f172a",
            borderRight: "1px solid #1e293b",
            padding: "20px 15px",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            overflowY: "auto",
            zIndex: 10,
          }}
        >
          {/* LOGO */}

          <div
            style={{
              textAlign: "center",
              marginBottom: "25px",
            }}
          >
            <img
              src="/sd-logo.png"
              alt="SD Media Entertainment"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto 8px",
              }}
            />

            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "11px",
              }}
            >
              Music Content Management
            </p>
          </div>

          {/* CUSTOMER */}

          <div
            style={{
              background: "#020617",
              border: "1px solid #1e293b",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "20px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "11px",
              }}
            >
              CUSTOMER
            </p>

            <p
              style={{
                margin: "5px 0 0",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              {customerName || "Customer"}
            </p>

            {labelName && (
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                {labelName}
              </p>
            )}
          </div>

          {/* MENU */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "7px",
            }}
          >
            <button
              onClick={() => setActiveSection("Dashboard")}
              style={menuStyle(activeSection === "Dashboard")}
            >
              🏠 Dashboard
            </button>

            <button
              onClick={() => setActiveSection("Songs")}
              style={menuStyle(activeSection === "Songs")}
            >
              🎵 My Songs
            </button>

            <button
              onClick={() => setActiveSection("Royalty")}
              style={menuStyle(activeSection === "Royalty")}
            >
              💰 Royalty
            </button>

            <button
              onClick={() => setActiveSection("Artists")}
              style={menuStyle(activeSection === "Artists")}
            >
              🎤 Artists
            </button>

            <button
              onClick={() => setActiveSection("Albums")}
              style={menuStyle(activeSection === "Albums")}
            >
              💿 Albums
            </button>

            <button
              onClick={() => setActiveSection("Sub Labels")}
              style={menuStyle(activeSection === "Sub Labels")}
            >
              🏷️ Sub Labels
            </button>

            <button
              onClick={() => router.push("/upload")}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "none",
                background: "#2563eb",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                marginTop: "8px",
              }}
            >
              ➕ Upload Song
            </button>
          </div>

          {/* LOGOUT */}

          <button
            onClick={logout}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid #7f1d1d",
              background: "#450a0a",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              marginTop: "30px",
            }}
          >
            🚪 Logout
          </button>
        </aside>

        {/* ================= MAIN ================= */}

        <section
          style={{
            marginLeft: "240px",
            width: "calc(100% - 240px)",
            padding: "25px",
          }}
        >
          <div
            style={{
              maxWidth: "1250px",
              margin: "0 auto",
            }}
          >
            {/* HEADER */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "30px",
                  }}
                >
                  {activeSection}
                </h1>

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#94a3b8",
                  }}
                >
                  Welcome, {customerName || "Customer"}
                </p>
              </div>

              <button
                onClick={loadCustomerDashboard}
                style={{
                  background: "#0f172a",
                  color: "#cbd5e1",
                  border: "1px solid #334155",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {/* ================= DASHBOARD ================= */}

            {activeSection === "Dashboard" && (
              <>
                {/* STATS */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "15px",
                    marginBottom: "30px",
                  }}
                >
                  <StatCard
                    title="Total Songs"
                    value={songs.length.toString()}
                    icon="🎵"
                  />

                  <StatCard
                    title="Approved Songs"
                    value={approvedSongs.toString()}
                    icon="✅"
                  />

                  <StatCard
                    title="Artists"
                    value={artists.length.toString()}
                    icon="🎤"
                  />

                  <StatCard
                    title="Albums"
                    value={albums.length.toString()}
                    icon="💿"
                  />

                  <StatCard
                    title="Royalty"
                    value={`₹${totalRoyalty.toFixed(2)}`}
                    icon="💰"
                  />

                  <StatCard
                    title="Sub Labels"
                    value={subLabels.length.toString()}
                    icon="🏷️"
                  />
                </div>

                {/* QUICK ACTIONS */}

                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "20px",
                    marginBottom: "25px",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "15px",
                    }}
                  >
                    Quick Actions
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <QuickButton
                      text="🎵 View My Songs"
                      onClick={() =>
                        setActiveSection("Songs")
                      }
                    />

                    <QuickButton
                      text="💰 View Royalty"
                      onClick={() =>
                        setActiveSection("Royalty")
                      }
                    />

                    <QuickButton
                      text="🎤 Artists"
                      onClick={() =>
                        setActiveSection("Artists")
                      }
                    />

                    <QuickButton
                      text="💿 Albums"
                      onClick={() =>
                        setActiveSection("Albums")
                      }
                    />

                    <QuickButton
                      text="🏷️ Sub Labels"
                      onClick={() =>
                        setActiveSection("Sub Labels")
                      }
                    />

                    <QuickButton
                      text="➕ Upload Song"
                      onClick={() =>
                        router.push("/upload")
                      }
                    />
                  </div>
                </div>

                {/* RECENT SONGS */}

                <h2
                  style={{
                    marginBottom: "15px",
                  }}
                >
                  Recent Songs
                </h2>

                <SongGrid
                  songs={songs.slice(0, 6)}
                  getStatusStyle={getStatusStyle}
                  getStatusText={getStatusText}
                />
              </>
            )}

            {/* ================= SONGS ================= */}

            {activeSection === "Songs" && (
              <>
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "12px",
                    padding: "18px",
                    marginBottom: "20px",
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    My Songs
                  </h2>

                  <p
                    style={{
                      color: "#94a3b8",
                      marginBottom: 0,
                    }}
                  >
                    Aapke account ke saare songs yahan
                    दिखाई देंगे.
                  </p>
                </div>

                {songs.length === 0 ? (
                  <EmptyState
                    text="Abhi koi song available nahi hai."
                    onClick={() =>
                      router.push("/upload")
                    }
                  />
                ) : (
                  <SongGrid
                    songs={songs}
                    getStatusStyle={getStatusStyle}
                    getStatusText={getStatusText}
                  />
                )}
              </>
            )}

            {/* ================= ROYALTY ================= */}

            {activeSection === "Royalty" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "18px",
                    marginBottom: "25px",
                  }}
                >
                  <StatCard
                    title="Total Royalty"
                    value={`₹${totalRoyalty.toFixed(2)}`}
                    icon="💰"
                  />

                  <StatCard
                    title="Approved Songs"
                    value={approvedSongs.toString()}
                    icon="✅"
                  />
                </div>

                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "30px",
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>
                    Royalty Details
                  </h2>

                  <p
                    style={{
                      color: "#94a3b8",
                      lineHeight: 1.6,
                    }}
                  >
                    Royalty amount abhi ₹0.00 दिख रहा है
                    क्योंकि database में अभी royalty/earning
                    data connect नहीं किया गया है.
                  </p>

                  <div
                    style={{
                      marginTop: "20px",
                      padding: "20px",
                      background: "#020617",
                      borderRadius: "12px",
                      border: "1px solid #1e293b",
                    }}
                  >
                    <p
                      style={{
                        color: "#64748b",
                        margin: 0,
                        fontSize: "13px",
                      }}
                    >
                      TOTAL ROYALTY
                    </p>

                    <h1
                      style={{
                        margin: "8px 0 0",
                        fontSize: "35px",
                      }}
                    >
                      ₹0.00
                    </h1>
                  </div>
                </div>
              </>
            )}

            {/* ================= ARTISTS ================= */}

            {activeSection === "Artists" && (
              <>
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>
                    My Artists
                  </h2>

                  {artists.length === 0 ? (
                    <p
                      style={{
                        color: "#94a3b8",
                      }}
                    >
                      अभी कोई artist नहीं मिला.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: "15px",
                      }}
                    >
                      {artists.map((artist, index) => (
                        <div
                          key={artist}
                          style={{
                            background: "#020617",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                            padding: "18px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "28px",
                              marginBottom: "8px",
                            }}
                          >
                            🎤
                          </div>

                          <h3
                            style={{
                              margin: 0,
                              fontSize: "17px",
                            }}
                          >
                            {artist}
                          </h3>

                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "#64748b",
                              fontSize: "13px",
                            }}
                          >
                            Artist #{index + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ================= ALBUMS ================= */}

            {activeSection === "Albums" && (
              <>
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>
                    My Albums
                  </h2>

                  {albums.length === 0 ? (
                    <p
                      style={{
                        color: "#94a3b8",
                      }}
                    >
                      अभी कोई album नहीं मिला.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: "15px",
                      }}
                    >
                      {albums.map((album, index) => (
                        <div
                          key={album}
                          style={{
                            background: "#020617",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                            padding: "18px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "28px",
                              marginBottom: "8px",
                            }}
                          >
                            💿
                          </div>

                          <h3
                            style={{
                              margin: 0,
                              fontSize: "17px",
                            }}
                          >
                            {album}
                          </h3>

                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "#64748b",
                              fontSize: "13px",
                            }}
                          >
                            Album #{index + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ================= SUB LABELS ================= */}

            {activeSection === "Sub Labels" && (
              <>
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>
                    Sub Labels
                  </h2>

                  <p
                    style={{
                      color: "#94a3b8",
                      lineHeight: 1.6,
                    }}
                  >
                    Yahan se aap apne Sub Labels manage
                    kar sakte hain.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "20px",
                    }}
                  >
                    <input
                      value={newSubLabel}
                      onChange={(e) =>
                        setNewSubLabel(e.target.value)
                      }
                      placeholder="Sub Label Name"
                      style={{
                        flex: 1,
                        minWidth: "220px",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "white",
                        outline: "none",
                      }}
                    />

                    <button
                      onClick={addSubLabel}
                      style={{
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        padding: "12px 20px",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      + Add Sub Label
                    </button>
                  </div>
                </div>

                {subLabels.length === 0 ? (
                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "14px",
                      padding: "35px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "40px",
                        marginBottom: "10px",
                      }}
                    >
                      🏷️
                    </div>

                    <h3 style={{ margin: 0 }}>
                      No Sub Labels
                    </h3>

                    <p
                      style={{
                        color: "#64748b",
                      }}
                    >
                      Upar se + Add Sub Label karke add
                      karein.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: "15px",
                    }}
                  >
                    {subLabels.map((subLabel) => (
                      <div
                        key={subLabel.id}
                        style={{
                          background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "12px",
                          padding: "18px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "25px",
                              }}
                            >
                              🏷️
                            </div>

                            <h3
                              style={{
                                margin:
                                  "8px 0 0",
                              }}
                            >
                              {subLabel.name}
                            </h3>
                          </div>

                          <button
                            onClick={() =>
                              removeSubLabel(
                                subLabel.id
                              )
                            }
                            style={{
                              background:
                                "#450a0a",
                              color: "#fca5a5",
                              border:
                                "1px solid #7f1d1d",
                              borderRadius: "7px",
                              padding:
                                "7px 10px",
                              cursor:
                                "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* MOBILE STYLE */}

      <style jsx>{`
        @media (max-width: 700px) {
          aside {
            width: 100% !important;
            position: relative !important;
            min-height: auto !important;
          }

          section {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 15px !important;
          }

          main > div {
            display: block !important;
          }
        }
      `}</style>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function menuStyle(active: boolean) {
  return {
    width: "100%",
    textAlign: "left" as const,
    padding: "12px 14px",
    borderRadius: "8px",
    border: active
      ? "1px solid #2563eb"
      : "1px solid transparent",
    background: active
      ? "#172554"
      : "transparent",
    color: active ? "#60a5fa" : "#cbd5e1",
    cursor: "pointer",
    fontWeight: active ? "600" : "500",
    fontSize: "14px",
  };
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "14px",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            {title}
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              fontSize: "27px",
            }}
          >
            {value}
          </h2>
        </div>

        <div
          style={{
            fontSize: "28px",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickButton({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#020617",
        color: "#e2e8f0",
        border: "1px solid #334155",
        borderRadius: "10px",
        padding: "14px",
        cursor: "pointer",
        textAlign: "left",
        fontWeight: "600",
      }}
    >
      {text}
    </button>
  );
}

function EmptyState({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "14px",
        padding: "45px 20px",
        textAlign: "center",
      }}
    >
      <h2>No Songs Found</h2>

      <p
        style={{
          color: "#94a3b8",
        }}
      >
        {text}
      </p>

      <button
        onClick={onClick}
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
        Upload Song
      </button>
    </div>
  );
}

function SongGrid({
  songs,
  getStatusStyle,
  getStatusText,
}: {
  songs: Song[];
  getStatusStyle: (status: string | null) => object;
  getStatusText: (status: string | null) => string;
}) {
  if (songs.length === 0) {
    return (
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "14px",
          padding: "40px",
          textAlign: "center",
          color: "#94a3b8",
        }}
      >
        No Songs Found
      </div>
    );
  }

  return (
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
                margin: "0 0 7px",
                color: "#94a3b8",
              }}
            >
              Artist: {song.artist_name}
            </p>

            {song.album_name && (
              <p
                style={{
                  margin: "0 0 12px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Album: {song.album_name}
              </p>
            )}

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
  );
}