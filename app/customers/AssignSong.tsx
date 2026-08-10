"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
};

export default function AssignSong({
  customerId,
  customerName,
}: {
  customerId: number;
  customerName: string;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [songId, setSongId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSongs() {
      const { data, error } = await supabase
        .from("songs")
        .select("id, song_title, artist_name")
        .order("id", { ascending: false });

      if (error) {
        console.error("Songs load error:", error);
        return;
      }

      setSongs(data || []);
    }

    loadSongs();
  }, []);

  async function assignSong() {
    if (!songId) {
      alert("पहले Song चुनिए ❌");
      return;
    }

    const confirmAssign = confirm(
      `${customerName} को यह Song assign करना है?`
    );

    if (!confirmAssign) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("customer_songs")
        .insert({
          customer_id: customerId,
          song_id: Number(songId),
        });

      if (error) {
        console.error("Assign song error:", error);
        alert(`Song Assign Failed ❌\n${error.message}`);
        return;
      }

      alert("Song Assigned Successfully ✅");
      setSongId("");
    } catch (error) {
      console.error(error);
      alert("Song Assign Failed ❌");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <select
        value={songId}
        onChange={(e) => setSongId(e.target.value)}
        style={{
          background: "#0f172a",
          color: "white",
          border: "1px solid #475569",
          padding: "8px",
          borderRadius: "6px",
          minWidth: "180px",
        }}
      >
        <option value="">🎵 Select Song</option>

        {songs.map((song) => (
          <option key={song.id} value={song.id}>
            {song.id} - {song.song_title}
          </option>
        ))}
      </select>

      <button
        onClick={assignSong}
        disabled={loading}
        style={{
          background: loading ? "#64748b" : "#3b82f6",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        {loading ? "Assigning..." : "🎵 Assign"}
      </button>
    </div>
  );
}