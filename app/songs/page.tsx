"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SongsPage() {
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    fetchSongs();
  }, []);

  async function fetchSongs() {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("id", { ascending: false });

    if (!error) {
      setSongs(data || []);
    }
  }

  return (
    <main style={{ padding: "30px" }}>
      <h1>🎵 Uploaded Songs</h1>

      <table
        border={1}
        cellPadding={10}
        style={{
          width: "100%",
          marginTop: "20px",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>Cover</th>
            <th>Song</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {songs.map((song) => (
            <tr key={song.id}>
              <td>
                <img
                  src={song.cover_url}
                  alt=""
                  width={60}
                  height={60}
                  style={{ borderRadius: "8px" }}
                />
              </td>

              <td>{song.song_title}</td>
              <td>{song.artist_name}</td>
              <td>{song.album_name}</td>
              <td>{song.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}