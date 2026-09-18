"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: string;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
        router.replace("/login");
        return;
      }

      // Customer information
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

      setCustomerName(customerData.customer_name || "");
      setLabelName(customerData.label_name || "");

      // Customer songs
      const { data: customerSongs, error: customerSongsError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customerData.id);

      if (customerSongsError) {
        console.error(customerSongsError);
        alert("Songs load nahi ho paaye ❌");
        return;
      }

      const songIds = (customerSongs || []).map(
        (item) => item.song_id
      );

      if (songIds.length === 0) {
        setSongs([]);
        return;
      }

      // Songs data
      const { data: songsData, error: songsError } =
        await supabase
          .from("songs")
          .select(
            `
            id,
            song_title,
            artist_name,
            album_name,
            cover_url,
            audio_url,
            status,
            rejection_reason
          `
          )
          .in("id", songIds)
          .order("created_at", {
            ascending: false,
          });

      if (songsError) {
        console.error(songsError);
        alert("Song data load nahi hua ❌");
        return;
      }

      // Signed URLs
      const songsWithUrls = await Promise.all(
        (songsData || []).map(async (song) => {
          let coverUrl = song.cover_url;
          let audioUrl = song.audio_url;

          if (coverUrl) {
            const { data } = await supabase.storage
              .from("songs")
              .createSignedUrl(coverUrl, 60 * 60);

            if (data?.signedUrl) {
              coverUrl = data.signedUrl;
            }
          }

          if (audioUrl) {
            const { data } = await supabase.storage
              .from("songs")
              .createSignedUrl(audioUrl, 60 * 60);

            if (data?.signedUrl) {
              audioUrl = data.signedUrl;
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
      alert("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        (song.song_title || "")
          .toLowerCase()
          .includes(searchText) ||
        (song.artist_name || "")
          .toLowerCase()
          .includes(searchText) ||
        (song.album_name || "")
          .toLowerCase()
          .includes(searchText) ||
        (song.status || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        (song.status || "Pending") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [songs, search, statusFilter]);

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

  const artists = new Set(
    songs
      .map((song) => song.artist_name)
      .filter(Boolean)
  ).size;

  const albums = new Set(
    songs
      .map((song) => song.album_name)
      .filter(Boolean)
  ).size;

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
          fontSize: "20px",
          fontWeight: "700",
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
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "245px",
          background: "#111827",
          color: "#fff",
          padding: "20px 15px",
          overflowY: "auto",
        }}
      >
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

        <div
          style={{
            color: "#9ca3af",
            fontSize: "11px",
            fontWeight: "800",
            marginBottom: "8px",
            paddingLeft: "10px",
          }}
        >
          MAIN
        </div>

        <SideButton
          active
          onClick={() => window.scrollTo({ top: 0 })}
        >
          🏠 Dashboard
        </SideButton>

        <SideButton
          onClick={() =>
            document
              .getElementById("songs-section")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          🎵 My Songs
        </SideButton>

        <SideButton
          onClick={() =>
            document
              .getElementById("royalty-section")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          💰 Royalty
        </SideButton>

        <SideButton
          onClick={() =>
            document
              .getElementById("artists-section")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          👤 Artists
        </SideButton>

        <SideButton
          onClick={() =>
            document
              .getElementById("albums-section")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          💿 Albums
        </SideButton>

        <SideButton
          onClick={() =>
            router.push("/upload")
          }
        >
          ⬆️ Upload Song
        </SideButton>

        <div
          style={{
            marginTop: "25px",
            borderTop: "1px solid #374151",
            paddingTop: "15px",
          }}
        >
          <SideButton
            onClick={loadCustomerDashboard}
          >
            🔄 Refresh
          </SideButton>

          <SideButton onClick={logout}>
            🚪 Logout
          </SideButton>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          marginLeft: "245px",
          padding: "30px",
          minHeight: "100vh",
        }}
      >
        {/* TOP HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "800",
              }}
            >
              Customer Dashboard
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
              }}
            >
              Welcome,{" "}
              <strong>
                {customerName || "Customer"}
              </strong>
              {labelName
                ? ` • ${labelName}`
                : ""}
            </p>
          </div>

          <button
            onClick={() => router.push("/upload")}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 18px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            ＋ Upload New Song
          </button>
        </div>

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <StatCard
            title="Total Songs"
            value={totalSongs}
            icon="🎵"
          />

          <StatCard
            title="Approved"
            value={approvedSongs}
            icon="✅"
          />

          <StatCard
            title="Pending"
            value={pendingSongs}
            icon="⏳"
          />

          <StatCard
            title="Rejected"
            value={rejectedSongs}
            icon="❌"
          />

          <StatCard
            title="Artists"
            value={artists}
            icon="👤"
          />

          <StatCard
            title="Albums"
            value={albums}
            icon="💿"
          />
        </div>

        {/* SEARCH + FILTER */}
        <section
          id="songs-section"
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "25px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="🔍 Search song, artist, album..."
              style={{
                flex: 1,
                minWidth: "250px",
                padding: "12px 14px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "9px",
                outline: "none",
                fontSize: "14px",
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              style={{
                padding: "12px 14px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "9px",
                background: "#fff",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <option value="All">
                All Status
              </option>

              <option value="Approved">
                Approved
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Rejected">
                Rejected
              </option>
            </select>

            {(search || statusFilter !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
                style={{
                  padding: "12px 14px",
                  border: "none",
                  borderRadius: "9px",
                  background: "#e5e7eb",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          <div
            style={{
              marginTop: "12px",
              color: "#6b7280",
              fontSize: "13px",
            }}
          >
            Showing{" "}
            <strong>
              {filteredSongs.length}
            </strong>{" "}
            of{" "}
            <strong>
              {songs.length}
            </strong>{" "}
            songs
          </div>
        </section>

        {/* SONG LIST */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "800",
              }}
            >
              🎵 My Songs
            </h2>
          </div>

          {filteredSongs.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "15px",
                padding: "50px 20px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              <div
                style={{
                  fontSize: "45px",
                  marginBottom: "10px",
                }}
              >
                🎵
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                {songs.length === 0
                  ? "No songs uploaded yet"
                  : "No matching songs found"}
              </div>

              <p>
                {songs.length === 0
                  ? "Upload your first song to get started."
                  : "Try changing your search or status filter."}
              </p>

              {songs.length === 0 && (
                <button
                  onClick={() =>
                    router.push("/upload")
                  }
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  ＋ Upload Song
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "20px",
              }}
            >
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  style={{
                    background: "#fff",
                    borderRadius: "15px",
                    overflow: "hidden",
                    boxShadow:
                      "0 5px 20px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Cover */}
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
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        background: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        fontSize: "40px",
                      }}
                    >
                      🎵
                    </div>
                  )}

                  <div style={{ padding: "17px" }}>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "800",
                        marginBottom: "5px",
                      }}
                    >
                      {song.song_title ||
                        "Untitled Song"}
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: "14px",
                        marginBottom: "3px",
                      }}
                    >
                      👤{" "}
                      {song.artist_name ||
                        "Unknown Artist"}
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: "13px",
                        marginBottom: "12px",
                      }}
                    >
                      💿{" "}
                      {song.album_name ||
                        "No Album"}
                    </div>

                    {/* STATUS */}
                    <StatusBadge
                      status={
                        song.status || "Pending"
                      }
                    />

                    {/* AUDIO */}
                    {song.audio_url && (
                      <audio
                        controls
                        src={song.audio_url}
                        style={{
                          width: "100%",
                          marginTop: "12px",
                        }}
                      />
                    )}

                    {/* VIEW DETAILS */}
                    <Link
                      href={`/customer-dashboard/song/${song.id}`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: "#111827",
                        color: "#fff",
                        textDecoration: "none",
                        padding: "10px 13px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "800",
                        marginTop: "12px",
                      }}
                    >
                      👁️ View Details
                    </Link>

                    {/* REJECTED REASON */}
                    {song.status ===
                      "Rejected" && (
                      <div
                        style={{
                          marginTop: "12px",
                          background: "#fef2f2",
                          border:
                            "1px solid #fecaca",
                          borderRadius: "9px",
                          padding: "12px",
                        }}
                      >
                        <div
                          style={{
                            color: "#991b1b",
                            fontSize: "12px",
                            fontWeight: "800",
                            marginBottom: "5px",
                          }}
                        >
                          ❌ Rejection Reason
                        </div>

                        <div
                          style={{
                            color: "#7f1d1d",
                            fontSize: "13px",
                            lineHeight: "1.4",
                          }}
                        >
                          {song.rejection_reason ||
                            "No reason provided"}
                        </div>

                        <button
                          onClick={() =>
                            router.push(
                              `/customer-dashboard/edit/${song.id}`
                            )
                          }
                          style={{
                            width: "100%",
                            marginTop: "10px",
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "9px",
                            cursor: "pointer",
                            fontWeight: "800",
                          }}
                        >
                          ✏️ Edit & Resubmit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ARTISTS */}
        <section
          id="artists-section"
          style={{
            marginTop: "30px",
            background: "#fff",
            borderRadius: "15px",
            padding: "22px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "21px",
              fontWeight: "800",
            }}
          >
            👤 Artists
          </h2>

          {artists === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No artists available.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {Array.from(
                new Set(
                  songs
                    .map(
                      (song) =>
                        song.artist_name
                    )
                    .filter(Boolean)
                )
              ).map((artist) => (
                <div
                  key={artist}
                  style={{
                    background: "#f3f4f6",
                    padding:
                      "10px 14px",
                    borderRadius: "8px",
                    fontWeight: "700",
                  }}
                >
                  {artist}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ALBUMS */}
        <section
          id="albums-section"
          style={{
            marginTop: "20px",
            background: "#fff",
            borderRadius: "15px",
            padding: "22px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "21px",
              fontWeight: "800",
            }}
          >
            💿 Albums
          </h2>

          {albums === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No albums available.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {Array.from(
                new Set(
                  songs
                    .map(
                      (song) =>
                        song.album_name
                    )
                    .filter(Boolean)
                )
              ).map((album) => (
                <div
                  key={album}
                  style={{
                    background: "#f3f4f6",
                    padding:
                      "10px 14px",
                    borderRadius: "8px",
                    fontWeight: "700",
                  }}
                >
                  {album}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ROYALTY */}
        <section
          id="royalty-section"
          style={{
            marginTop: "20px",
            background: "#fff",
            borderRadius: "15px",
            padding: "22px",
            marginBottom: "30px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "21px",
              fontWeight: "800",
            }}
          >
            💰 Royalty
          </h2>

          <div
            style={{
              fontSize: "32px",
              fontWeight: "900",
              marginTop: "10px",
            }}
          >
            ₹0.00
          </div>

          <p
            style={{
              color: "#6b7280",
              marginBottom: 0,
            }}
          >
            Royalty data will appear here
            when connected.
          </p>
        </section>
      </main>

      {/* RESPONSIVE CSS */}
      <style jsx>{`
        @media (max-width: 1100px) {
          main {
            padding: 20px !important;
          }

          div[style*="repeat(6, minmax(0, 1fr))"] {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            ) !important;
          }

          div[style*="repeat(3, minmax(0, 1fr))"] {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }
        }

        @media (max-width: 700px) {
          aside {
            position: relative !important;
            width: 100% !important;
            bottom: auto !important;
          }

          main {
            margin-left: 0 !important;
            padding: 15px !important;
          }

          div[style*="repeat(6, minmax(0, 1fr))"] {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          div[style*="repeat(3, minmax(0, 1fr))"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* SIDEBAR BUTTON */

function SideButton({
  children,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: "none",
        borderRadius: "8px",
        padding: "11px 12px",
        marginBottom: "5px",
        background: active
          ? "#1d4ed8"
          : "transparent",
        color: "#fff",
        cursor: "pointer",
        fontWeight: active
          ? "800"
          : "600",
        fontSize: "14px",
      }}
    >
      {children}
    </button>
  );
}

/* STAT CARD */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "13px",
        padding: "18px",
        boxShadow:
          "0 5px 18px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "25px",
          marginBottom: "7px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: "700",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: "900",
          marginTop: "3px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* STATUS BADGE */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let background = "#fef3c7";
  let color = "#92400e";

  if (status === "Approved") {
    background = "#dcfce7";
    color = "#166534";
  }

  if (status === "Rejected") {
    background = "#fee2e2";
    color = "#991b1b";
  }

  return (
    <span
      style={{
        display: "inline-block",
        background,
        color,
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "800",
      }}
    >
      {status}
    </span>
  );
}