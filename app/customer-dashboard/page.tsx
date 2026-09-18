"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  singer_name?: string | null;
  composer?: string | null;
  lyricist?: string | null;
  genre?: string | null;
  language?: string | null;
  release_date?: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
};

type Customer = {
  id: number;
  customer_name: string | null;
  label_name: string | null;
};

export default function CustomerDashboard() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("Dashboard");

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Logged-in user
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      // Find customer account
      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select("id, customer_name, label_name")
          .eq("auth_user_id", session.user.id)
          .single();

      if (customerError || !customerData) {
        alert("Customer account nahi mila ❌");
        router.replace("/login");
        return;
      }

      setCustomer(customerData);

      // Get customer's song IDs
      const { data: customerSongs, error: customerSongsError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customerData.id);

      if (customerSongsError) {
        console.error(customerSongsError);
        setSongs([]);
        return;
      }

      const songIds = (customerSongs || [])
        .map((item) => item.song_id)
        .filter(Boolean);

      if (songIds.length === 0) {
        setSongs([]);
        return;
      }

      // Get songs
      const { data: songsData, error: songsError } = await supabase
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
        .in("id", songIds)
        .order("id", { ascending: false });

      if (songsError) {
        console.error(songsError);
        setSongs([]);
        return;
      }

      // Create signed URLs
      const songsWithUrls: Song[] = await Promise.all(
        (songsData || []).map(async (song) => {
          let coverUrl = song.cover_url;
          let audioUrl = song.audio_url;

          // Cover signed URL
          if (song.cover_url) {
            if (song.cover_url.startsWith("http")) {
              coverUrl = song.cover_url;
            } else {
              const { data: coverData } = await supabase.storage
                .from("songs")
                .createSignedUrl(song.cover_url, 60 * 60);

              if (coverData?.signedUrl) {
                coverUrl = coverData.signedUrl;
              }
            }
          }

          // Audio signed URL
          if (song.audio_url) {
            if (song.audio_url.startsWith("http")) {
              audioUrl = song.audio_url;
            } else {
              const { data: audioData } = await supabase.storage
                .from("songs")
                .createSignedUrl(song.audio_url, 60 * 60);

              if (audioData?.signedUrl) {
                audioUrl = audioData.signedUrl;
              }
            }
          }

          return {
            ...song,
            cover_url: coverUrl,
            audio_url: audioUrl,
          };
        })
      );

      setSongs(songsWithUrls);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalSongs = songs.length;

  const approvedSongs = songs.filter(
    (song) => song.status === "Approved"
  ).length;

  const pendingSongs = songs.filter(
    (song) => song.status === "Pending"
  ).length;

  const rejectedSongs = songs.filter(
    (song) => song.status === "Rejected"
  ).length;

  const artists = useMemo(() => {
    return new Set(
      songs
        .map((song) => song.artist_name)
        .filter((artist) => artist && artist.trim() !== "")
    ).size;
  }, [songs]);

  const albums = useMemo(() => {
    return new Set(
      songs
        .map((song) => song.album_name)
        .filter((album) => album && album.trim() !== "")
    ).size;
  }, [songs]);

  const getStatusStyle = (status: string | null) => {
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
  };

  const navItems = [
    "Dashboard",
    "My Songs",
    "Royalty",
    "Artists",
    "Albums",
    "Sub Labels",
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading Customer Dashboard... 🔐
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#111827",
        display: "flex",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          background: "#111827",
          color: "white",
          padding: "20px 15px",
          boxSizing: "border-box",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
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

        {/* CUSTOMER INFO */}
        <div
          style={{
            background: "#1f2937",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "white",
            }}
          >
            {customer?.customer_name || "Customer"}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "3px",
            }}
          >
            {customer?.label_name || "Label"}
          </div>
        </div>

        {/* NAVIGATION */}
        <div>
          {navItems.map((item) => {
            const active = activeSection === item;

            return (
              <button
                key={item}
                onClick={() => setActiveSection(item)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  marginBottom: "6px",
                  border: "none",
                  borderRadius: "8px",
                  background: active
                    ? "#2563eb"
                    : "transparent",
                  color: active
                    ? "white"
                    : "#d1d5db",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: active ? "700" : "500",
                }}
              >
                {item === "Dashboard" && "🏠 "}
                {item === "My Songs" && "🎵 "}
                {item === "Royalty" && "💰 "}
                {item === "Artists" && "🎤 "}
                {item === "Albums" && "💿 "}
                {item === "Sub Labels" && "🏷️ "}
                {item}
              </button>
            );
          })}
        </div>

        {/* UPLOAD */}
        <Link
          href="/upload"
          style={{
            display: "block",
            textDecoration: "none",
            textAlign: "center",
            background: "#16a34a",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            marginTop: "20px",
            fontSize: "14px",
            fontWeight: "700",
          }}
        >
          ⬆️ Upload Song
        </Link>

        {/* LOGOUT */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "11px",
            border: "1px solid #374151",
            borderRadius: "8px",
            background: "transparent",
            color: "#fca5a5",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🚪 Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          padding: "30px",
          minWidth: 0,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "800",
              }}
            >
              {activeSection}
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Welcome,{" "}
              <strong>
                {customer?.customer_name || "Customer"}
              </strong>
            </p>
          </div>

          <Link
            href="/upload"
            style={{
              background: "#2563eb",
              color: "white",
              textDecoration: "none",
              padding: "11px 18px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            + Upload New Song
          </Link>
        </div>

        {/* DASHBOARD */}
        {activeSection === "Dashboard" && (
          <>
            {/* STATS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                marginBottom: "25px",
              }}
            >
              <StatCard
                title="Total Songs"
                value={totalSongs}
                icon="🎵"
              />

              <StatCard
                title="Approved Songs"
                value={approvedSongs}
                icon="✅"
              />

              <StatCard
                title="Pending Songs"
                value={pendingSongs}
                icon="⏳"
              />

              <StatCard
                title="Rejected Songs"
                value={rejectedSongs}
                icon="❌"
              />

              <StatCard
                title="Artists"
                value={artists}
                icon="🎤"
              />

              <StatCard
                title="Albums"
                value={albums}
                icon="💿"
              />

              <StatCard
                title="Royalty"
                value="₹0.00"
                icon="💰"
              />

              <StatCard
                title="Sub Labels"
                value="0"
                icon="🏷️"
              />
            </div>

            {/* QUICK ACTIONS */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "25px",
                border: "1px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "19px",
                }}
              >
                Quick Actions
              </h2>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href="/upload"
                  style={{
                    background: "#2563eb",
                    color: "white",
                    textDecoration: "none",
                    padding: "11px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  🎵 Upload Song
                </Link>

                <button
                  onClick={() => setActiveSection("My Songs")}
                  style={{
                    background: "#111827",
                    color: "white",
                    border: "none",
                    padding: "11px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  📋 My Songs
                </button>

                <button
                  onClick={loadDashboard}
                  style={{
                    background: "#f3f4f6",
                    color: "#111827",
                    border: "1px solid #d1d5db",
                    padding: "11px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* RECENT SONGS */}
            <section
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "18px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "19px",
                  }}
                >
                  Recent Songs
                </h2>

                <button
                  onClick={() => setActiveSection("My Songs")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#2563eb",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  View All →
                </button>
              </div>

              {songs.length === 0 ? (
                <EmptySongs />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {songs.slice(0, 6).map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      getStatusStyle={getStatusStyle}
                      router={router}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* MY SONGS */}
        {activeSection === "My Songs" && (
          <section
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                  }}
                >
                  My Songs
                </h2>

                <p
                  style={{
                    color: "#6b7280",
                    margin: "5px 0 0",
                    fontSize: "13px",
                  }}
                >
                  Aapke account ke saare uploaded songs
                </p>
              </div>

              <Link
                href="/upload"
                style={{
                  background: "#16a34a",
                  color: "white",
                  textDecoration: "none",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                + Upload Song
              </Link>
            </div>

            {songs.length === 0 ? (
              <EmptySongs />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "18px",
                }}
              >
                {songs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    getStatusStyle={getStatusStyle}
                    router={router}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ROYALTY */}
        {activeSection === "Royalty" && (
          <section
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              border: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "55px" }}>💰</div>

            <h2>Royalty</h2>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              Royalty section abhi setup nahi hua hai.
            </p>

            <div
              style={{
                margin: "20px auto",
                maxWidth: "300px",
                background: "#f9fafb",
                padding: "20px",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                Total Royalty
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: "800",
                  marginTop: "5px",
                }}
              >
                ₹0.00
              </div>
            </div>
          </section>
        )}

        {/* ARTISTS */}
        {activeSection === "Artists" && (
          <section
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Artists
            </h2>

            {artists === 0 ? (
              <EmptySongs />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "15px",
                }}
              >
                {Array.from(
                  new Set(
                    songs
                      .map((song) => song.artist_name)
                      .filter(Boolean)
                  )
                ).map((artist) => (
                  <div
                    key={artist}
                    style={{
                      padding: "18px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontSize: "25px" }}>🎤</div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontWeight: "700",
                      }}
                    >
                      {artist}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ALBUMS */}
        {activeSection === "Albums" && (
          <section
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Albums
            </h2>

            {albums === 0 ? (
              <EmptySongs />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "15px",
                }}
              >
                {Array.from(
                  new Set(
                    songs
                      .map((song) => song.album_name)
                      .filter(Boolean)
                  )
                ).map((album) => (
                  <div
                    key={album}
                    style={{
                      padding: "20px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontSize: "28px" }}>💿</div>

                    <div
                      style={{
                        marginTop: "10px",
                        fontWeight: "700",
                      }}
                    >
                      {album}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SUB LABELS */}
        {activeSection === "Sub Labels" && (
          <section
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              border: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "55px" }}>🏷️</div>

            <h2>Sub Labels</h2>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              Sub Label management feature abhi setup nahi hua hai.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

/* =========================
   STAT CARD
========================= */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "18px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "22px",
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          fontSize: "26px",
          fontWeight: "800",
          marginTop: "10px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================
   EMPTY SONGS
========================= */

function EmptySongs() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "50px 20px",
        color: "#6b7280",
      }}
    >
      <div
        style={{
          fontSize: "50px",
          marginBottom: "10px",
        }}
      >
        🎵
      </div>

      <h3
        style={{
          color: "#111827",
          margin: "0 0 8px",
        }}
      >
        Abhi koi song nahi hai
      </h3>

      <p
        style={{
          margin: 0,
        }}
      >
        Apna pehla song upload kijiye.
      </p>

      <Link
        href="/upload"
        style={{
          display: "inline-block",
          marginTop: "18px",
          background: "#2563eb",
          color: "white",
          textDecoration: "none",
          padding: "10px 18px",
          borderRadius: "8px",
          fontWeight: "700",
        }}
      >
        Upload Song
      </Link>
    </div>
  );
}

/* =========================
   SONG CARD
========================= */

function SongCard({
  song,
  getStatusStyle,
  router,
}: {
  song: Song;
  getStatusStyle: (status: string | null) => {
    background: string;
    color: string;
  };
  router: ReturnType<typeof useRouter>;
}) {
  const statusStyle = getStatusStyle(song.status);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        overflow: "hidden",
        background: "white",
      }}
    >
      {/* COVER */}
      <div
        style={{
          width: "100%",
          height: "220px",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {song.cover_url ? (
          <img
            src={song.cover_url}
            alt={song.song_title ?? "Song cover"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: "55px",
            }}
          >
            🎵
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div
        style={{
          padding: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: "800",
                wordBreak: "break-word",
              }}
            >
              {song.song_title || "Untitled Song"}
            </h3>

            <p
              style={{
                margin: "5px 0 0",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              {song.artist_name || "Unknown Artist"}
            </p>
          </div>

          <span
            style={{
              ...statusStyle,
              padding: "5px 9px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "800",
              whiteSpace: "nowrap",
            }}
          >
            {song.status || "Pending"}
          </span>
        </div>

        {/* ALBUM */}
        {song.album_name && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "13px",
              color: "#4b5563",
            }}
          >
            💿 {song.album_name}
          </div>
        )}

        {/* EXTRA INFO */}
        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gap: "5px",
            fontSize: "12px",
            color: "#6b7280",
          }}
        >
          {song.singer_name && (
            <div>
              <strong>Singer:</strong> {song.singer_name}
            </div>
          )}

          {song.genre && (
            <div>
              <strong>Genre:</strong> {song.genre}
            </div>
          )}

          {song.language && (
            <div>
              <strong>Language:</strong> {song.language}
            </div>
          )}

          {song.release_date && (
            <div>
              <strong>Release Date:</strong>{" "}
              {song.release_date}
            </div>
          )}
        </div>

        {/* REJECTION REASON */}
        {song.status === "Rejected" &&
          song.rejection_reason && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#991b1b",
                fontSize: "13px",
              }}
            >
              <strong>Rejection Reason:</strong>

              <div
                style={{
                  marginTop: "4px",
                }}
              >
                {song.rejection_reason}
              </div>
            </div>
          )}

        {/* AUDIO */}
        {song.audio_url && (
          <div
            style={{
              marginTop: "14px",
            }}
          >
            <audio
              controls
              src={song.audio_url}
              style={{
                width: "100%",
                height: "38px",
              }}
            />
          </div>
        )}

        {/* REJECTED EDIT BUTTON */}
        {song.status === "Rejected" && (
          <button
            onClick={() =>
              router.push(
                `/customer-dashboard/edit/${song.id}`
              )
            }
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              background: "#dc2626",
              color: "white",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "13px",
            }}
          >
            ✏️ Edit & Resubmit
          </button>
        )}
      </div>
    </div>
  );
}