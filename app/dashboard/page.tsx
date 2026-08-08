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

      if (mounted) {
        await loadDashboard();

        if (mounted) {
          setLoading(false);
        }
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

  async function loadDashboard() {
    const { count: songsCount, error: songsError } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true });

    if (songsError) {
      console.error("Songs count error:", songsError);
      return;
    }

    setTotalSongs(songsCount || 0);

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

    if (recent) {
      setRecentSongs(recent);
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      alert("Logout Failed ❌");
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
      console.error("Delete error:", error);
      alert("Delete Failed ❌");
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
          background: "#111827",
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
        background: "#111827",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            color: "#22c55e",
            fontSize: "40px",
            margin: 0,
          }}
        >
          🎉 Welcome to SD Music Dashboard
        </h1>

        <button
          onClick={logout}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Logout
        </button>
      </div>

      <p
        style={{
          marginTop: "20px",
          fontSize: "20px",
        }}
      >
        Login Successful ✅
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginTop: "40px",
        }}
      >
        <div
          style={{
            background: "#1f2937",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h3>Total Songs</h3>
          <h1>{totalSongs}</h1>
        </div>

        <div
          style={{
            background: "#1f2937",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h3>Total Artists</h3>
          <h1>{totalArtists}</h1>
        </div>

        <div
          style={{
            background: "#1f2937",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h3>Total Albums</h3>
          <h1>{totalAlbums}</h1>
        </div>
      </div>

      <div
        style={{
          marginTop: "50px",
          background: "#1f2937",
          padding: "20px",
          borderRadius: "10px",
          overflowX: "auto",
        }}
      >
        <h2>🎵 Recent Uploaded Songs</h2>

        <table
          style={{
            width: "100%",
            marginTop: "20px",
            borderCollapse: "collapse",
            minWidth: "900px",
          }}
        >
          <thead>
            <tr>
              <th align="left">Cover</th>
              <th align="left">Song</th>
              <th align="left">Artist</th>
              <th align="left">Status</th>
              <th align="left">Play</th>
              <th align="left">Action</th>
            </tr>
          </thead>

          <tbody>
            {recentSongs.map((song: any) => (
              <tr key={song.id}>
                <td style={{ padding: "10px" }}>
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.song_title || "Song Cover"}
                      width={60}
                      height={60}
                      style={{
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div>No Cover</div>
                  )}
                </td>

                <td>{song.song_title}</td>

                <td>{song.artist_name}</td>

                <td>{song.status}</td>

                <td>
                  {song.audio_url ? (
                    <audio controls style={{ width: "220px" }}>
                      <source src={song.audio_url} />
                      Your browser does not support audio.
                    </audio>
                  ) : (
                    "No Audio"
                  )}
                </td>

                <td>
                  <button
                    onClick={() => deleteSong(song.id)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
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
                    padding: "30px",
                    textAlign: "center",
                  }}
                >
                  अभी कोई song upload नहीं हुआ है।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}