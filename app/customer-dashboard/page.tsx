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
  const [customerName, setCustomerName] = useState("");
  const [labelName, setLabelName] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCustomerDashboard() {
      try {
        // 1. Check login
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        // 2. Get customer
        const { data: customer, error: customerError } =
          await supabase
            .from("customers")
            .select("id, customer_name, label_name")
            .eq("auth_user_id", session.user.id)
            .single();

        if (customerError || !customer) {
          console.error("Customer fetch error:", customerError);
          alert("Customer account नहीं मिला ❌");
          router.replace("/login");
          return;
        }

        if (!mounted) return;

        setCustomerName(customer.customer_name);
        setLabelName(customer.label_name);

        // 3. Get assigned songs from customer_songs
        const { data: assignments, error: assignmentError } =
          await supabase
            .from("customer_songs")
            .select("song_id")
            .eq("customer_id", customer.id);

        if (assignmentError) {
          console.error(
            "Customer songs fetch error:",
            assignmentError
          );
          setSongs([]);
          setLoading(false);
          return;
        }

        // No assigned songs
        if (!assignments || assignments.length === 0) {
          setSongs([]);
          setLoading(false);
          return;
        }

        // 4. Get song IDs
        const songIds = assignments.map(
          (item) => item.song_id
        );

        // 5. Get actual songs
        const { data: songData, error: songError } =
          await supabase
            .from("songs")
            .select(
              "id, song_title, artist_name, cover_url, audio_url"
            )
            .in("id", songIds)
            .order("id", { ascending: false });

        if (songError) {
          console.error("Songs fetch error:", songError);
          setSongs([]);
        } else {
          setSongs(songData || []);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCustomerDashboard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
          fontSize: "22px",
        }}
      >
        Loading Customer Dashboard... 🔐
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                color: "#22c55e",
              }}
            >
              Customer Dashboard 🎵
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#94a3b8",
              }}
            >
              {customerName || "Customer"}
              {labelName ? ` • ${labelName}` : ""}
            </p>
          </div>

          <button
            onClick={logout}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "11px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Logout
          </button>
        </div>

        {/* No songs */}
        {songs.length === 0 ? (
          <div
            style={{
              background: "#1e293b",
              padding: "35px",
              borderRadius: "14px",
              color: "#cbd5e1",
            }}
          >
            अभी कोई Song उपलब्ध नहीं है।
          </div>
        ) : (
          <>
            <h2
              style={{
                marginBottom: "20px",
              }}
            >
              🎵 आपके Songs
            </h2>

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
                    borderRadius: "14px",
                  }}
                >
                  {/* Cover */}
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.song_title}
                      style={{
                        width: "100%",
                        height: "260px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        marginBottom: "15px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "260px",
                        background: "#334155",
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "50px",
                        marginBottom: "15px",
                      }}
                    >
                      🎵
                    </div>
                  )}

                  {/* Song title */}
                  <h3
                    style={{
                      margin: "0 0 8px",
                      color: "white",
                    }}
                  >
                    {song.song_title}
                  </h3>

                  {/* Artist */}
                  <p
                    style={{
                      margin: "0 0 15px",
                      color: "#94a3b8",
                    }}
                  >
                    {song.artist_name}
                  </p>

                  {/* Audio */}
                  {song.audio_url ? (
                    <audio
                      controls
                      src={song.audio_url}
                      style={{
                        width: "100%",
                      }}
                    />
                  ) : (
                    <p
                      style={{
                        color: "#f87171",
                        fontSize: "14px",
                      }}
                    >
                      Audio उपलब्ध नहीं है
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}