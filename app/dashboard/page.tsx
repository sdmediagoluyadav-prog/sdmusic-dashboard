"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
  customer_name: string | null;
  label_name: string | null;
  signed_cover_url?: string | null;
  signed_audio_url?: string | null;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [totalSongs, setTotalSongs] = useState(0);
  const [totalArtists, setTotalArtists] = useState(0);
  const [totalAlbums, setTotalAlbums] = useState(0);

  const [pendingSongs, setPendingSongs] = useState(0);
  const [approvedSongs, setApprovedSongs] = useState(0);
  const [rejectedSongs, setRejectedSongs] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const [recentSongs, setRecentSongs] = useState<Song[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    await loadDashboard();
  }

  async function createSignedUrl(
    path: string | null
  ): Promise<string | null> {
    if (!path) return null;

    // Agar already full URL hai
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // Supabase Storage path
    const { data, error } = await supabase.storage
      .from("songs")
      .createSignedUrl(path, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  }

  async function loadDashboard() {
    try {
      setLoading(true);

      // --------------------------------
      // TOTAL SONGS
      // --------------------------------
      const { count: songsCount, error: songsCountError } =
        await supabase
          .from("songs")
          .select("*", {
            count: "exact",
            head: true,
          });

      if (songsCountError) {
        console.error(songsCountError);
      }

      setTotalSongs(songsCount || 0);

      // --------------------------------
      // STATUS COUNTS
      // --------------------------------
      const { count: pendingCount } = await supabase
        .from("songs")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "Pending");

      const { count: approvedCount } = await supabase
        .from("songs")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "Approved");

      const { count: rejectedCount } = await supabase
        .from("songs")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "Rejected");

      setPendingSongs(pendingCount || 0);
      setApprovedSongs(approvedCount || 0);
      setRejectedSongs(rejectedCount || 0);

      // --------------------------------
      // CUSTOMERS COUNT
      // --------------------------------
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", {
          count: "exact",
          head: true,
        });

      setTotalCustomers(customersCount || 0);

      // --------------------------------
      // ARTISTS + ALBUMS
      // --------------------------------
      const { data: allSongs, error: allSongsError } =
        await supabase
          .from("songs")
          .select("artist_name, album_name");

      if (allSongsError) {
        console.error(allSongsError);
      }

      const artistSet = new Set<string>();
      const albumSet = new Set<string>();

      (allSongs || []).forEach((song) => {
        if (song.artist_name) {
          artistSet.add(song.artist_name.trim());
        }

        if (song.album_name) {
          albumSet.add(song.album_name.trim());
        }
      });

      setTotalArtists(artistSet.size);
      setTotalAlbums(albumSet.size);

      // --------------------------------
      // RECENT SONGS
      // --------------------------------
      const { data: songs, error: recentError } =
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
          .order("id", {
            ascending: false,
          })
          .limit(5);

      if (recentError) {
        console.error(recentError);
        setRecentSongs([]);
        return;
      }

      if (!songs || songs.length === 0) {
        setRecentSongs([]);
        return;
      }

      // --------------------------------
      // CUSTOMER SONG LINKS
      // --------------------------------
      const songIds = songs.map((song) => song.id);

      const { data: customerLinks, error: linksError } =
        await supabase
          .from("customer_songs")
          .select("customer_id, song_id")
          .in("song_id", songIds);

      if (linksError) {
        console.error(linksError);
      }

      const customerIds = Array.from(
        new Set(
          (customerLinks || [])
            .map((item) => item.customer_id)
            .filter(Boolean)
        )
      );

      let customers: {
        id: number;
        customer_name: string | null;
        label_name: string | null;
      }[] = [];

      if (customerIds.length > 0) {
        const { data: customerData, error: customerError } =
          await supabase
            .from("customers")
            .select("id, customer_name, label_name")
            .in("id", customerIds);

        if (customerError) {
          console.error(customerError);
        }

        customers = customerData || [];
      }

      // --------------------------------
      // FINAL SONG DATA
      // --------------------------------
      const finalSongs: Song[] = await Promise.all(
        songs.map(async (song) => {
          const link = (customerLinks || []).find(
            (item) => item.song_id === song.id
          );

          const customer = customers.find(
            (item) => item.id === link?.customer_id
          );

          const signedCoverUrl = await createSignedUrl(
            song.cover_url
          );

          const signedAudioUrl = await createSignedUrl(
            song.audio_url
          );

          return {
            ...song,
            customer_name:
              customer?.customer_name || "Unknown Customer",
            label_name:
              customer?.label_name || "No Label",
            signed_cover_url: signedCoverUrl,
            signed_audio_url: signedAudioUrl,
          };
        })
      );

      setRecentSongs(finalSongs);
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------
  // APPROVE SONG
  // --------------------------------
  async function approveSong(songId: number) {
    const confirmApprove = window.confirm(
      "Kya aap is song ko Approve karna chahte hain?"
    );

    if (!confirmApprove) return;

    try {
      setActionLoading(songId);

      const { error } = await supabase
        .from("songs")
        .update({
          status: "Approved",
          rejection_reason: null,
        })
        .eq("id", songId);

      if (error) {
        alert("Approve nahi hua: " + error.message);
        return;
      }

      alert("Song successfully Approved ✅");

      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Kuch error aa gaya.");
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------
  // REJECT SONG
  // --------------------------------
  async function rejectSong(songId: number) {
    const reason = window.prompt(
      "Song reject karne ka reason likhiye:"
    );

    if (reason === null) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      alert("Rejection reason likhna zaroori hai.");
      return;
    }

    try {
      setActionLoading(songId);

      const { error } = await supabase
        .from("songs")
        .update({
          status: "Rejected",
          rejection_reason: trimmedReason,
        })
        .eq("id", songId);

      if (error) {
        alert("Reject nahi hua: " + error.message);
        return;
      }

      alert("Song Rejected ❌");

      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Kuch error aa gaya.");
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------
  // DELETE SONG
  // --------------------------------
  async function deleteSong(songId: number) {
    const confirmDelete = window.confirm(
      "Kya aap sure hain? Ye song permanently delete ho jayega."
    );

    if (!confirmDelete) return;

    try {
      setActionLoading(songId);

      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId);

      if (error) {
        alert("Delete nahi hua: " + error.message);
        return;
      }

      alert("Song deleted successfully 🗑️");

      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Delete karte time error aa gaya.");
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------
  // LOGOUT
  // --------------------------------
  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // --------------------------------
  // STATUS STYLE
  // --------------------------------
  function getStatusStyle(status: string | null) {
    if (status === "Approved") {
      return {
        background: "#064e3b",
        color: "#6ee7b7",
      };
    }

    if (status === "Rejected") {
      return {
        background: "#7f1d1d",
        color: "#fca5a5",
      };
    }

    return {
      background: "#78350f",
      color: "#fcd34d",
    };
  }

  // --------------------------------
  // SEARCH + FILTER
  // --------------------------------
  const filteredSongs = recentSongs.filter((song) => {
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
      (song.customer_name || "")
        .toLowerCase()
        .includes(searchText) ||
      (song.label_name || "")
        .toLowerCase()
        .includes(searchText);

    const matchesStatus =
      statusFilter === "All" ||
      song.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // --------------------------------
  // LOADING
  // --------------------------------
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          fontWeight: "bold",
        }}
      >
        Loading Admin Dashboard... 🔐
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
      }}
    >
      {/* =========================
          SIDEBAR
      ========================== */}
      <aside
        style={{
          width: "250px",
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          padding: "20px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
          zIndex: 20,
        }}
      >
        {/* LOGO */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
              display: "block",
              margin: "0 auto 8px",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            Admin Panel
          </p>
        </div>

        {/* NAVIGATION */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              ...menuButtonStyle,
              background: "#1e293b",
            }}
          >
            🏠 Dashboard
          </button>

          <button
            onClick={() => router.push("/songs")}
            style={menuButtonStyle}
          >
            🎵 All Songs
          </button>

          <button
            onClick={() => router.push("/upload")}
            style={menuButtonStyle}
          >
            ➕ Upload Song
          </button>

          <button
            onClick={() => router.push("/customers")}
            style={menuButtonStyle}
          >
            👥 Customers
          </button>

          <button
            onClick={() => router.push("/customer-dashboard")}
            style={menuButtonStyle}
          >
            🎧 Customer Dashboard
          </button>

          <button
            onClick={loadDashboard}
            style={menuButtonStyle}
          >
            🔄 Refresh
          </button>

          <button
            onClick={logout}
            style={{
              ...menuButtonStyle,
              marginTop: "20px",
              background: "#7f1d1d",
              color: "#fecaca",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* =========================
          MAIN
      ========================== */}
      <main
        style={{
          marginLeft: "250px",
          width: "calc(100% - 250px)",
          padding: "30px",
          minHeight: "100vh",
        }}
      >
        {/* HEADER */}
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
                margin: 0,
                fontSize: "30px",
                fontWeight: "800",
              }}
            >
              Admin Dashboard
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#94a3b8",
              }}
            >
              SD Media Entertainment Distribution
            </p>
          </div>

          <button
            onClick={() => router.push("/upload")}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "12px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            ➕ Upload Song
          </button>
        </div>

        {/* =========================
            MAIN STATS
        ========================== */}
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
            title="Pending"
            value={pendingSongs}
            icon="⏳"
          />

          <StatCard
            title="Approved"
            value={approvedSongs}
            icon="✅"
          />

          <StatCard
            title="Rejected"
            value={rejectedSongs}
            icon="❌"
          />

          <StatCard
            title="Artists"
            value={totalArtists}
            icon="🎤"
          />

          <StatCard
            title="Albums"
            value={totalAlbums}
            icon="💿"
          />

          <StatCard
            title="Customers"
            value={totalCustomers}
            icon="👥"
          />
        </div>

        {/* =========================
            SEARCH + FILTER
        ========================== */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "20px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search song, artist, album, customer..."
            style={{
              flex: 1,
              minWidth: "250px",
              background: "#020617",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "12px",
              outline: "none",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            style={{
              background: "#020617",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "12px",
              outline: "none",
              minWidth: "150px",
            }}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* =========================
            RECENT SONGS
        ========================== */}
        <section
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
              }}
            >
              Recent Songs
            </h2>

            <p
              style={{
                color: "#94a3b8",
                margin: "6px 0 0",
                fontSize: "13px",
              }}
            >
              Latest uploaded songs
            </p>
          </div>

          <div
            style={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1100px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#020617",
                    textAlign: "left",
                  }}
                >
                  <th style={thStyle}>Cover</th>
                  <th style={thStyle}>Song</th>
                  <th style={thStyle}>Artist</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>
                    Rejection Reason
                  </th>
                  <th style={thStyle}>
                    Customer / Label
                  </th>
                  <th style={thStyle}>Play</th>
                  <th style={thStyle}>Approval</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSongs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#94a3b8",
                      }}
                    >
                      No songs found.
                    </td>
                  </tr>
                ) : (
                  filteredSongs.map((song) => (
                    <tr
                      key={song.id}
                      style={{
                        borderTop:
                          "1px solid #1e293b",
                      }}
                    >
                      {/* COVER */}
                      <td style={tdStyle}>
                        {song.signed_cover_url ? (
                          <img
                            src={song.signed_cover_url}
                            alt={
                              song.song_title ??
                              "Song cover"
                            }
                            style={{
                              width: "60px",
                              height: "60px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "8px",
                              background: "#1e293b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent:
                                "center",
                              color: "#64748b",
                              fontSize: "12px",
                            }}
                          >
                            No Cover
                          </div>
                        )}
                      </td>

                      {/* SONG */}
                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight: "700",
                            color: "white",
                          }}
                        >
                          {song.song_title ||
                            "Untitled Song"}
                        </div>

                        {song.album_name && (
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            Album:{" "}
                            {song.album_name}
                          </div>
                        )}
                      </td>

                      {/* ARTIST */}
                      <td style={tdStyle}>
                        {song.artist_name ||
                          "Unknown Artist"}
                      </td>

                      {/* STATUS */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            ...getStatusStyle(
                              song.status
                            ),
                            padding:
                              "6px 10px",
                            borderRadius:
                              "999px",
                            fontSize: "12px",
                            fontWeight: "700",
                            display:
                              "inline-block",
                          }}
                        >
                          {song.status ||
                            "Pending"}
                        </span>
                      </td>

                      {/* REJECTION REASON */}
                      <td style={tdStyle}>
                        {song.status ===
                          "Rejected" &&
                        song.rejection_reason ? (
                          <div
                            style={{
                              color: "#fca5a5",
                              background:
                                "#450a0a",
                              border:
                                "1px solid #7f1d1d",
                              padding: "8px",
                              borderRadius:
                                "6px",
                              fontSize: "12px",
                              maxWidth:
                                "220px",
                            }}
                          >
                            {
                              song.rejection_reason
                            }
                          </div>
                        ) : (
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: "12px",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* CUSTOMER */}
                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight: "600",
                          }}
                        >
                          {song.customer_name ||
                            "Unknown"}
                        </div>

                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "12px",
                            marginTop: "3px",
                          }}
                        >
                          {song.label_name ||
                            "No Label"}
                        </div>
                      </td>

                      {/* AUDIO */}
                      <td style={tdStyle}>
                        {song.signed_audio_url ? (
                          <audio
                            controls
                            preload="none"
                            style={{
                              width: "220px",
                              maxWidth:
                                "220px",
                            }}
                          >
                            <source
                              src={
                                song.signed_audio_url
                              }
                            />
                            Your browser does not
                            support audio.
                          </audio>
                        ) : (
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: "12px",
                            }}
                          >
                            No Audio
                          </span>
                        )}
                      </td>

                      {/* APPROVAL */}
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection:
                              "column",
                            gap: "7px",
                            minWidth: "100px",
                          }}
                        >
                          <button
                            onClick={() =>
                              approveSong(
                                song.id
                              )
                            }
                            disabled={
                              actionLoading ===
                              song.id
                            }
                            style={{
                              background:
                                actionLoading ===
                                song.id
                                  ? "#334155"
                                  : "#059669",
                              color: "white",
                              border: "none",
                              padding:
                                "8px 10px",
                              borderRadius:
                                "6px",
                              cursor:
                                actionLoading ===
                                song.id
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight: "700",
                              fontSize: "12px",
                            }}
                          >
                            {actionLoading ===
                            song.id
                              ? "Please wait..."
                              : "✅ Approve"}
                          </button>

                          <button
                            onClick={() =>
                              rejectSong(
                                song.id
                              )
                            }
                            disabled={
                              actionLoading ===
                              song.id
                            }
                            style={{
                              background:
                                actionLoading ===
                                song.id
                                  ? "#334155"
                                  : "#dc2626",
                              color: "white",
                              border: "none",
                              padding:
                                "8px 10px",
                              borderRadius:
                                "6px",
                              cursor:
                                actionLoading ===
                                song.id
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight: "700",
                              fontSize: "12px",
                            }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </td>

                      {/* DELETE */}
                      <td style={tdStyle}>
                        <button
                          onClick={() =>
                            deleteSong(song.id)
                          }
                          disabled={
                            actionLoading ===
                            song.id
                          }
                          style={{
                            background:
                              actionLoading ===
                              song.id
                                ? "#334155"
                                : "#991b1b",
                            color: "white",
                            border: "none",
                            padding:
                              "9px 12px",
                            borderRadius: "6px",
                            cursor:
                              actionLoading ===
                              song.id
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "700",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* FOOTER */}
        <div
          style={{
            marginTop: "25px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "12px",
          }}
        >
          SD Media Entertainment • Admin
          Dashboard
        </div>
      </main>
    </div>
  );
}

/* =====================================
   STAT CARD
===================================== */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: "13px",
              marginBottom: "8px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
            }}
          >
            {value}
          </div>
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

/* =====================================
   STYLES
===================================== */

const menuButtonStyle = {
  width: "100%",
  background: "transparent",
  color: "#cbd5e1",
  border: "none",
  padding: "12px 14px",
  borderRadius: "8px",
  textAlign: "left" as const,
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
};

const thStyle = {
  padding: "14px",
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "700",
  whiteSpace: "nowrap" as const,
};

const tdStyle = {
  padding: "14px",
  verticalAlign: "middle" as const,
  color: "#e2e8f0",
  fontSize: "13px",
};