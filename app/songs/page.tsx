"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SongsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [songs, setSongs] = useState<any[]>([]);

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

      await fetchSongs();

      if (mounted) {
        setCheckingAuth(false);
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

  async function fetchSongs() {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Songs fetch error:", error);
      return;
    }

    setSongs(data || []);
  }

  if (checkingAuth) {
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
        minHeight: "100vh",
        background: "#111827",
        color: "white",
        padding: "30px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <h1 style={{ color: "#22c55e" }}>🎵 Uploaded Songs</h1>

        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "#22c55e",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Dashboard
        </button>
      </div>

      <div
        style={{
          background: "#1f2937",
          padding: "20px",
          borderRadius: "10px",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            marginTop: "10px",
            borderCollapse: "collapse",
            minWidth: "800px",
          }}
        >
          <thead>
            <tr>
              <th align="left">Cover</th>
              <th align="left">Song</th>
              <th align="left">Artist</th>
              <th align="left">Album</th>
              <th align="left">Status</th>
            </tr>
          </thead>

          <tbody>
            {songs.map((song) => (
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
                    "No Cover"
                  )}
                </td>

                <td>{song.song_title}</td>
                <td>{song.artist_name}</td>
                <td>{song.album_name}</td>
                <td>{song.status}</td>
              </tr>
            ))}

            {songs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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