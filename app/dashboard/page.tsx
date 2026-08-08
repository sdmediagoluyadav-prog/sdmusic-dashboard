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
    const { count, error } = await supabase
      .from("songs")
      .select("*", {
        count: "exact",
        head: true,
      });

    if (error) {
      console.error("Songs count error:", error);
      return;
    }

    setTotalSongs(count || 0);

    const { data, error: artistError } = await supabase
      .from("songs")
      .select("artist_name, album_name");

    if (artistError) {
      console.error("Artist/Album error:", artistError);
    }

    if (data) {
      const artists = new Set(
        data
          .map((item: any) => item.artist_name)
          .filter(Boolean)
      );

      const albums = new Set(
        data
          .map((item: any) => item.album_name)
          .filter(Boolean)
      );

      setTotalArtists(artists.size);
      setTotalAlbums(albums.size);
    }

    const { data: recent, error: recentError } = await supabase
      .from("songs")
      .select("*")
      .order("id", { ascending: false })
      .limit(5);

    if (recentError) {
      console.error("Recent songs error:", recentError);
      return;
    }

    if (!recent) {
      setRecentSongs([]);
      return;
    }

    const songsWithUrls = await Promise.all(
      recent.map(async (song: any) => {
        const coverUrl = await createSignedUrl(song.cover_url);
        const audioUrl = await createSignedUrl(song.audio_url);

        return {
          ...song,
          display_cover_url: coverUrl,
          display_audio_url: audioUrl,
        };
      })
    );

    setRecentSongs(songsWithUrls);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout Failed ❌");
      console.error(error);
      return;
    }

    router.replace("/login");
  }

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
      alert("Delete Failed ❌");
      console.error(error);
      return;
    }

    alert("Song Deleted Successfully ✅");

    await loadDashboard();
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
        <div
          style={{
            padding: "10px",
            marginBottom: "30px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#22c55e",
              fontSize: "24px",
            }}
          >
            🎵 SD MUSIC
          </h2>

          <p
            style={{
              marginTop: "6px",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            Music Management
          </p>
        </div>

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

        <div
          style={{
            marginTop: "40px",
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
          <div
            style={{
              background: "#1e293b",
              padding: "25px",
              borderRadius: "14px",
              border: "1px solid #334155",
            }}
          >
            <p style={{ color: "#94a3b8", margin: 0 }}>
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

          <div
            style={{
              background: "#1e293b",
              padding: "25px",
              borderRadius: "14px",
              border: "1px solid #334155",
            }}
          >
            <p style={{ color: "#94a3b8", margin: 0 }}>
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

          <div
            style={{
              background: "#1e293b",
              padding: "25px",
              borderRadius: "14px",
              border: "1px solid #334155",
            }}
          >
            <p style={{ color: "#94a3b8", margin: 0 }}>
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
              minWidth: "850px",
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
                  Play
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
              {recentSongs.map((song: any) => (
                <tr
                  key={song.id}
                  style={{
                    borderBottom:
                      "1px solid #273449",
                  }}
                >
                  <td style={{ padding: "12px 8px" }}>
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

                  <td style={{ padding: "12px 8px" }}>
                    <strong>
                      {song.song_title}
                    </strong>
                  </td>

                  <td style={{ padding: "12px 8px" }}>
                    {song.artist_name}
                  </td>

                  <td style={{ padding: "12px 8px" }}>
                    <span
                      style={{
                        background:
                          song.status === "Pending"
                            ? "#78350f"
                            : "#14532d",
                        color:
                          song.status === "Pending"
                            ? "#fbbf24"
                            : "#86efac",
                        padding:
                          "5px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                      }}
                    >
                      {song.status}
                    </span>
                  </td>

                  <td style={{ padding: "12px 8px" }}>
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

                  <td style={{ padding: "12px 8px" }}>
                    <button
                      onClick={() =>
                        deleteSong(song.id)
                      }
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding:
                          "7px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {recentSongs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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