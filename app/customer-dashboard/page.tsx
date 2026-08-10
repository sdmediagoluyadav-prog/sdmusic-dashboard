"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  cover_url: string | null;
  audio_url: string | null;
};

export default function CustomerDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    async function loadCustomer() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: customer, error: customerError } =
        await supabase
          .from("customers")
          .select("id, customer_name, label_name")
          .eq("auth_user_id", session.user.id)
          .single();

      if (customerError || !customer) {
        console.error(customerError);
        alert("Customer account नहीं मिला ❌");
        router.replace("/login");
        return;
      }

      const { data: songData, error: songError } =
        await supabase
          .from("songs")
          .select(
            "id, song_title, artist_name, cover_url, audio_url"
          )
          .eq("customer_id", customer.id)
          .order("id", { ascending: false });

      if (songError) {
        console.error(songError);
      }

      setSongs(songData || []);
      setLoading(false);
    }

    loadCustomer();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
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
        }}
      >
        Loading Customer Dashboard...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1>Customer Dashboard 🎵</h1>
            <p>आपके Label के Songs</p>
          </div>

          <button
            onClick={logout}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        {songs.length === 0 ? (
          <div
            style={{
              background: "#1e293b",
              padding: "30px",
              borderRadius: "12px",
            }}
          >
            अभी कोई song उपलब्ध नहीं है।
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {songs.map((song) => (
              <div
                key={song.id}
                style={{
                  background: "#1e293b",
                  padding: "18px",
                  borderRadius: "12px",
                }}
              >
                {song.cover_url && (
                  <img
                    src={song.cover_url}
                    alt={song.song_title}
                    style={{
                      width: "100%",
                      height: "220px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                )}

                <h3>{song.song_title}</h3>
                <p>{song.artist_name}</p>

                {song.audio_url && (
                  <audio
                    controls
                    src={song.audio_url}
                    style={{ width: "100%" }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}