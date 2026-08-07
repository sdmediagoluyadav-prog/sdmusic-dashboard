"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [totalSongs, setTotalSongs] = useState(0);
  const [totalArtists, setTotalArtists] = useState(0);
  const [totalAlbums, setTotalAlbums] = useState(0);
  const [recentSongs, setRecentSongs] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    loadDashboard();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function loadDashboard() {
    const { count: songsCount } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true });

    setTotalSongs(songsCount || 0);

    const { data } = await supabase
      .from("songs")
      .select("artist_name, album_name");

    if (data) {
      const artists = new Set(data.map((item: any) => item.artist_name));
      const albums = new Set(data.map((item: any) => item.album_name));

      setTotalArtists(artists.size);
      setTotalAlbums(albums.size);
    }

    const { data: recent } = await supabase
      .from("songs")
      .select("*")
      .order("id", { ascending: false })
      .limit(5);

    if (recent) {
      setRecentSongs(recent);
    }
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
    loadDashboard();
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
        }}
      >
        <h1 style={{ color: "#22c55e", fontSize: "40px" }}>
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

      <p style={{ marginTop: "20px", fontSize: "20px" }}>
        Login Successful ✅
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "20px",
          marginTop: "40px",
        }}
      >
        <div style={{ background: "#1f2937", padding: "20px", borderRadius: "10px" }}>
          <h3>Total Songs</h3>
          <h1>{totalSongs}</h1>
        </div>

        <div style={{ background: "#1f2937", padding: "20px", borderRadius: "10px" }}>
          <h3>Total Artists</h3>
          <h1>{totalArtists}</h1>
        </div>

        <div style={{ background: "#1f2937", padding: "20px", borderRadius: "10px" }}>
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
        }}
      >
        <h2>🎵 Recent Uploaded Songs</h2>

        <table
          style={{
            width: "100%",
            marginTop: "20px",
            borderCollapse: "collapse",
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
                  <img
                    src={song.cover_url}
                    alt={song.song_title}
                    width={60}
                    height={60}
                    style={{ borderRadius: "8px" }}
                  />
                </td>

                <td>{song.song_title}</td>
                <td>{song.artist_name}</td>
                <td>{song.status}</td>

                <td>
                  <audio controls style={{ width: "220px" }}>
                    <source src={song.audio_url} />
                  </audio>
                </td>

                <td>
                  <button
                    onClick={() => deleteSong(song.id)}
                    style={{
                      background: "red",
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
          </tbody>
        </table>
      </div>
    </main>
  );
}