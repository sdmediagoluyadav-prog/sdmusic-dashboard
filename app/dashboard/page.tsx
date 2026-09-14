"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [totalSongs, setTotalSongs] = useState(0);
  const [totalArtists, setTotalArtists] = useState(0);
  const [totalAlbums, setTotalAlbums] = useState(0);
  const [recentSongs, setRecentSongs] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      await loadDashboard();

      if (mounted) {
        setLoading(false);
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function createSignedUrl(
    pathOrUrl: string | null,
    expiresIn = 3600
  ) {
    if (!pathOrUrl) return null;

    if (!pathOrUrl.startsWith("http")) {
      const { data, error } = await supabase.storage
        .from("songs")
        .createSignedUrl(pathOrUrl, expiresIn);

      if (error) {
        console.error("Signed URL error:", error);
        return null;
      }

      return data?.signedUrl || null;
    }

    return pathOrUrl;
  }

  async function loadDashboard() {
    // TOTAL SONGS
    const { count, error: countError } = await supabase
      .from("songs")
      .select("*", {
        count: "exact",
        head: true,
      });

    if (countError) {
      console.error("Songs count error:", countError);
    } else {
      setTotalSongs(count || 0);
    }

    // ARTISTS + ALBUMS
    const { data: songInfo, error: infoError } = await supabase
      .from("songs")
      .select("artist_name, album_name");

    if (infoError) {
      console.error("Artist/Album error:", infoError);
    }

    if (songInfo) {
      const artists = new Set(
        songInfo
          .map((item: any) => item.artist_name)
          .filter(Boolean)
      );

      const albums = new Set(
        songInfo
          .map((item: any) => item.album_name)
          .filter(Boolean)
      );

      setTotalArtists(artists.size);
      setTotalAlbums(albums.size);
    }

    // RECENT SONGS
    const { data: recent, error: recentError } = await supabase
      .from("songs")
      .select("*")
      .order("id", { ascending: false })
      .limit(5);

    if (recentError) {
      console.error("Recent songs error:", recentError);
      return;
    }

    if (!recent || recent.length === 0) {
      setRecentSongs([]);
      return;
    }

    // GET CUSTOMER LINKS FROM customer_songs
    const songIds = recent.map((song: any) => song.id);

    const { data: customerLinks, error: linkError } = await supabase
      .from("customer_songs")
      .select("customer_id, song_id")
      .in("song_id", songIds);

    if (linkError) {
      console.error("Customer links error:", linkError);
    }

    // GET CUSTOMERS
    let customers: any[] = [];

    if (customerLinks && customerLinks.length > 0) {
      const customerIds = [
        ...new Set(
          customerLinks
            .map((item: any) => item.customer_id)
            .filter(Boolean)
        ),
      ];

      if (customerIds.length > 0) {
        const { data: customerData, error: customerError } =
          await supabase
            .from("customers")
            .select("id, customer_name, label_name")
            .in("id", customerIds);

        if (customerError) {
          console.error("Customer data error:", customerError);
        } else {
          customers = customerData || [];
        }
      }
    }

    // ADD CUSTOMER INFO TO SONGS
    const songsWithUrls = await Promise.all(
      recent.map(async (song: any) => {
        const coverUrl = await createSignedUrl(song.cover_url);
        const audioUrl = await createSignedUrl(song.audio_url);

        const link = customerLinks?.find(
          (item: any) => item.song_id === song.id
        );

        const customer = customers.find(
          (item: any) => item.id === link?.customer_id
        );

        return {
          ...song,
          display_cover_url: coverUrl,
          display_audio_url: audioUrl,
          customer: customer || null,
        };
      })
    );

    setRecentSongs(songsWithUrls);
  }

  // APPROVE SONG
  async function approveSong(id: number) {
    const confirmApprove = confirm(
      "Kya aap is song ko Approve karna chahte hain?"
    );

    if (!confirmApprove) return;

    setActionLoading(id);

    const { error } = await supabase
      .from("songs")
      .update({
        status: "Approved",
      })
      .eq("id", id);

    setActionLoading(null);

    if (error) {
      console.error("Approve error:", error);
      alert(
        "Approve Failed ❌\n\n" +
        error.message
      );
      return;
    }

    alert("Song Approved Successfully ✅");

    await loadDashboard();
  }

  // REJECT SONG
  async function rejectSong(id: number) {
    const confirmReject = confirm(
      "Kya aap is song ko Reject karna chahte hain?"
    );

    if (!confirmReject) return;

    setActionLoading(id);

    const { error } = await supabase
      .from("songs")
      .update({
        status: "Rejected",
      })
      .eq("id", id);

    setActionLoading(null);

    if (error) {
      console.error("Reject error:", error);
      alert(
        "Reject Failed ❌\n\n" +
        error.message
      );
      return;
    }

    alert("Song Rejected ❌");

    await loadDashboard();
  }

  // DELETE SONG
  async function deleteSong(id: number) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this song?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("songs")
      .delete()
      .eq("id", id);

    if (error) {
      alert(
        "Delete Failed ❌\n\n" +
        error.message
      );
      console.error(error);
      return;
    }

    alert("Song Deleted Successfully ✅");

    await loadDashboard();
  }

  // LOGOUT
  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout Failed ❌");
      console.error(error);
      return;
    }

    router.replace("/login");
  }

  // STATUS STYLE
  function getStatusStyle(status: string) {
    if (status === "Approved") {
      return {
        background: "#14532d",
        color: "#86efac",
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
      color: "#fbbf24",
    };
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "22px",
        }}
      >
        Checking Login... 🔐
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "240px",
          minHeight: "100vh",
          background: "#111827",
          borderRight: "1px solid #1f2937",
          padding: "25px 15px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
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

        {/* DASHBOARD */}
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            width: "100%",
            padding: "13px",
            marginBottom: "10px",
            background: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "8px",
            textAlign: "left",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🏠 Dashboard
        </button>

        {/* ALL SONGS */}
        <button
          onClick={() => router.push("/songs")}
          style={{
            width: "100%",
            padding: "13px",
            marginBottom: "10px",
            background: "transparent",
            color: "#d1d5db",
            border: "none",
            borderRadius: "8px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          🎵 All Songs
        </button>

        {/* UPLOAD */}
        <button
          onClick={() => router.push("/upload")}
          style={{
            width: "100%",
            padding: "13px",
            marginBottom: "10px",
            background: "transparent",
            color: "#d1d5db",
            border: "none",
            borderRadius: "8px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          ⬆️ Upload Song
        </button>

        {/* CUSTOMERS */}
        <button
          onClick={() => router.push("/customers")}
          style={{
            width: "100%",
            padding: "13px",
            marginBottom: "10px",
            background: "transparent",
            color: "#d1d5db",
            border: "none",
            borderRadius: "8px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          👥 Customers
        </button>

        {/* LOGOUT */}
        <div
          style={{
            marginTop: "25px",
            borderTop: "1px solid #1f2937",
            paddingTop: "20px",
          }}
        >
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "13px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              textAlign: "left",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section
        style={{
          marginLeft: "240px",
          width: "calc(100% - 240px)",
          padding: "35px",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "35px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
              }}
            >
              Dashboard
            </h1>

            <p
              style={{
                color: "#9ca3af",
                marginTop: "8px",
              }}
            >
              Welcome back! Manage your music here.
            </p>
          </div>

          <button
            onClick={() => router.push("/upload")}
            style={{
              background: "#22c55e",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            + Upload Song
          </button>
        </div>

        {/* STAT CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
          }}
        >
          {/* SONGS */}
          <div
            style={{
              background: "#1e293b",
              padding: "25px",
              borderRadius: "14px",
              border: "1px solid #334155",
            }}
          >
            <p
              style={{
                color: "#94a3b8",
                margin: 0,
              }}
            >
              Total Songs
            </p>

            <h2
              style={{
                fontSize: "34px",
                margin: "10px 0 0",
                color: "#22c55e",
              }}
            >
              {totalSongs}
            </h2>
          </div>

          {/* ARTISTS */}
          <div
            style={{
              background: "#1e293b",
              padding: "25px",
              borderRadius: "14px",
              border: "1px solid #334155",
            }}
          >
            <p
              style={{
                color: "#94a3b8",
                margin: 0,
              }}
            >
              Total Artists
            </p>

            <h2
              style={{
                fontSize: "34px",
                margin: "10px 0 0",
                color: "#38bdf8",
              }}
            >
              {totalArtists}
            </h2>
          </div>

          {/* ALBUMS */}
          <div
            style={{
              background: "#1e293b",
              padding: "25px",
              borderRadius: "14px",
              border: "1px solid #334155",
            }}
          >
            <p
              style={{
                color: "#94a3b8",
                margin: 0,
              }}
            >
              Total Albums
            </p>

            <h2
              style={{
                fontSize: "34px",
                margin: "10px 0 0",
                color: "#f59e0b",
              }}
            >
              {totalAlbums}
            </h2>
          </div>
        </div>

        {/* RECENT SONGS */}
        <div
          style={{
            marginTop: "35px",
            background: "#1e293b",
            borderRadius: "14px",
            padding: "25px",
            border: "1px solid #334155",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: 0 }}>
              🎵 Recent Uploaded Songs
            </h2>

            <button
              onClick={() => router.push("/songs")}
              style={{
                background: "transparent",
                color: "#22c55e",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              View All →
            </button>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1050px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #334155",
                  color: "#94a3b8",
                }}
              >
                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Cover
                </th>

                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Song
                </th>

                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Artist
                </th>

                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Status
                </th>

                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Customer / Label
                </th>

                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Play
                </th>

                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Approval
                </th>

                <th
                  align="left"
                  style={{ padding: "12px 8px" }}
                >
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {recentSongs.map((song: any) => {
                const statusStyle = getStatusStyle(
                  song.status
                );

                return (
                  <tr
                    key={song.id}
                    style={{
                      borderBottom:
                        "1px solid #273449",
                    }}
                  >
                    {/* COVER */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      {song.display_cover_url ? (
                        <img
                          src={song.display_cover_url}
                          alt={
                            song.song_title ||
                            "Song Cover"
                          }
                          width={55}
                          height={55}
                          style={{
                            borderRadius: "8px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        "No Cover"
                      )}
                    </td>

                    {/* SONG */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      <strong>
                        {song.song_title}
                      </strong>
                    </td>

                    {/* ARTIST */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      {song.artist_name}
                    </td>

                    {/* STATUS */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      <span
                        style={{
                          ...statusStyle,
                          padding: "5px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {song.status || "Pending"}
                      </span>
                    </td>

                    {/* CUSTOMER */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      {song.customer ? (
                        <div>
                          <div
                            style={{
                              fontWeight: "bold",
                            }}
                          >
                            {song.customer.customer_name}
                          </div>

                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: "12px",
                              marginTop: "3px",
                            }}
                          >
                            {song.customer.label_name ||
                              "No Label"}
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "#94a3b8",
                          }}
                        >
                          No Customer
                        </span>
                      )}
                    </td>

                    {/* PLAY */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      {song.display_audio_url ? (
                        <audio
                          controls
                          style={{
                            width: "210px",
                          }}
                        >
                          <source
                            src={
                              song.display_audio_url
                            }
                          />
                        </audio>
                      ) : (
                        "No Audio"
                      )}
                    </td>

                    {/* APPROVAL */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {song.status !== "Approved" && (
                          <button
                            onClick={() =>
                              approveSong(song.id)
                            }
                            disabled={
                              actionLoading ===
                              song.id
                            }
                            style={{
                              background: "#16a34a",
                              color: "white",
                              border: "none",
                              padding:
                                "7px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              opacity:
                                actionLoading ===
                                song.id
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {actionLoading ===
                            song.id
                              ? "..."
                              : "✓ Approve"}
                          </button>
                        )}

                        {song.status !== "Rejected" && (
                          <button
                            onClick={() =>
                              rejectSong(song.id)
                            }
                            disabled={
                              actionLoading ===
                              song.id
                            }
                            style={{
                              background: "#dc2626",
                              color: "white",
                              border: "none",
                              padding:
                                "7px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              opacity:
                                actionLoading ===
                                song.id
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {actionLoading ===
                            song.id
                              ? "..."
                              : "✕ Reject"}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* DELETE */}
                    <td
                      style={{
                        padding: "12px 8px",
                      }}
                    >
                      <button
                        onClick={() =>
                          deleteSong(song.id)
                        }
                        style={{
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          padding: "7px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {recentSongs.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    अभी कोई song upload नहीं हुआ है।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}