"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  album_name: string;
  singer_name: string;
  composer: string;
  lyricist: string;
  genre: string;
  language: string;
  release_date: string;
  cover_url: string | null;
  audio_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

export default function MySongsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);
  const [subLabelName, setSubLabelName] = useState("");

  useEffect(() => {
    loadSongs();
  }, []);

  async function loadSongs() {
    try {
      setLoading(true);

      const {
        data: {
          session,
        },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/auth/role", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roleData = await response.json();

      if (!response.ok) {
        alert(roleData.error || "Role check failed");
        router.push("/login");
        return;
      }

      if (roleData.role !== "sub_label") {
        if (roleData.role === "customer") {
          router.push("/customer-dashboard");
        } else if (roleData.role === "admin") {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }

        return;
      }

      const subLabelId = roleData.subLabel?.id;
      const name = roleData.subLabel?.sub_label_name || "";

      setSubLabelName(name);

      if (!subLabelId) {
        setSongs([]);
        return;
      }

      const {
        data: links,
        error: linkError,
      } = await supabase
        .from("sub_label_songs")
        .select("song_id")
        .eq("sub_label_id", subLabelId);

      if (linkError) {
        console.error("Sub Label Songs Error:", linkError);
        alert(linkError.message);
        return;
      }

      if (!links || links.length === 0) {
        setSongs([]);
        return;
      }

      const songIds = links.map(
        (item) => item.song_id
      );

      const {
        data: songData,
        error: songError,
      } = await supabase
        .from("songs")
        .select(`
          id,
          song_title,
          artist_name,
          album_name,
          singer_name,
          composer,
          lyricist,
          genre,
          language,
          release_date,
          cover_url,
          audio_url,
          status,
          rejection_reason,
          created_at
        `)
        .in("id", songIds)
        .order("created_at", {
          ascending: false,
        });

      if (songError) {
        console.error("Songs Error:", songError);
        alert(songError.message);
        return;
      }

      setSongs(songData || []);
    } catch (error) {
      console.error("My Songs Error:", error);
      alert("Songs load nahi ho paaye");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function statusClass(status: string) {
    if (status === "Approved") {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }

    if (status === "Rejected") {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#fff",
        display: "flex",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          padding: "25px 15px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "110px",
              height: "110px",
              objectFit: "contain",
              margin: "0 auto 10px",
            }}
          />

          <div
            style={{
              color: "#9ca3af",
              fontSize: "12px",
            }}
          >
            Music Distribution
          </div>
        </div>

        <button
          onClick={() =>
            router.push("/sub-label-dashboard")
          }
          style={{
            width: "100%",
            padding: "13px 15px",
            marginBottom: "8px",
            borderRadius: "8px",
            border: "none",
            background: "#1e293b",
            color: "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          🏠 Dashboard
        </button>

        <button
          onClick={() =>
            router.push("/sub-label-dashboard/upload")
          }
          style={{
            width: "100%",
            padding: "13px 15px",
            marginBottom: "8px",
            borderRadius: "8px",
            border: "none",
            background: "#1e293b",
            color: "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          ⬆️ Upload Song
        </button>

        <button
          style={{
            width: "100%",
            padding: "13px 15px",
            marginBottom: "8px",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#2563eb",
            color: "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          🎵 My Songs
        </button>

        <button
          style={{
            width: "100%",
            padding: "13px 15px",
            marginBottom: "8px",
            borderRadius: "8px",
            border: "none",
            background: "#1e293b",
            color: "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          🎤 Artists
        </button>

        <button
          style={{
            width: "100%",
            padding: "13px 15px",
            marginBottom: "8px",
            borderRadius: "8px",
            border: "none",
            background: "#1e293b",
            color: "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          👤 Profile
        </button>

        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: "13px 15px",
            marginTop: "25px",
            borderRadius: "8px",
            border: "1px solid #7f1d1d",
            background: "#450a0a",
            color: "#fca5a5",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          🚪 Logout
        </button>
      </aside>

      {/* MAIN */}
      <main
        style={{
          marginLeft: "250px",
          width: "calc(100% - 250px)",
          padding: "35px",
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
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "700",
              }}
            >
              My Songs
            </h1>

            <p
              style={{
                marginTop: "7px",
                color: "#94a3b8",
              }}
            >
              {subLabelName
                ? `${subLabelName} ke uploaded songs`
                : "Your uploaded songs"}
            </p>
          </div>

          <button
            onClick={() =>
              router.push(
                "/sub-label-dashboard/upload"
              )
            }
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            + Upload Song
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              background: "#0f172a",
              borderRadius: "12px",
              border: "1px solid #1e293b",
              color: "#94a3b8",
            }}
          >
            Loading Songs...
          </div>
        )}

        {/* EMPTY */}
        {!loading && songs.length === 0 && (
          <div
            style={{
              padding: "70px 30px",
              textAlign: "center",
              background: "#0f172a",
              borderRadius: "12px",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                fontSize: "50px",
                marginBottom: "15px",
              }}
            >
              🎵
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              No Songs Found
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginTop: "10px",
              }}
            >
              Abhi is Sub Label ke liye koi song
              available nahi hai.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/upload"
                )
              }
              style={{
                marginTop: "20px",
                padding: "12px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Upload First Song
            </button>
          </div>
        )}

        {/* SONGS */}
        {!loading && songs.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {songs.map((song) => (
              <div
                key={song.id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {song.cover_url ? (
                  <img
                    src={song.cover_url}
                    alt={song.song_title}
                    style={{
                      width: "100%",
                      height: "230px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: "230px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#111827",
                      fontSize: "60px",
                    }}
                  >
                    🎵
                  </div>
                )}

                <div style={{ padding: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        lineHeight: "1.4",
                      }}
                    >
                      {song.song_title}
                    </h2>

                    <span
                      className={statusClass(
                        song.status
                      )}
                      style={{
                        whiteSpace: "nowrap",
                        padding: "5px 9px",
                        borderRadius: "20px",
                        border: "1px solid",
                        fontSize: "11px",
                      }}
                    >
                      {song.status}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "15px",
                      color: "#94a3b8",
                      fontSize: "14px",
                      lineHeight: "1.8",
                    }}
                  >
                    <div>
                      <strong
                        style={{ color: "#cbd5e1" }}
                      >
                        Artist:
                      </strong>{" "}
                      {song.artist_name || "-"}
                    </div>

                    <div>
                      <strong
                        style={{ color: "#cbd5e1" }}
                      >
                        Singer:
                      </strong>{" "}
                      {song.singer_name || "-"}
                    </div>

                    <div>
                      <strong
                        style={{ color: "#cbd5e1" }}
                      >
                        Album:
                      </strong>{" "}
                      {song.album_name || "-"}
                    </div>

                    <div>
                      <strong
                        style={{ color: "#cbd5e1" }}
                      >
                        Language:
                      </strong>{" "}
                      {song.language || "-"}
                    </div>
                  </div>

                  {song.rejection_reason && (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "10px",
                        borderRadius: "8px",
                        background:
                          "rgba(127,29,29,0.25)",
                        border:
                          "1px solid rgba(248,113,113,0.25)",
                        color: "#fca5a5",
                        fontSize: "13px",
                      }}
                    >
                      <strong>
                        Rejection Reason:
                      </strong>
                      <br />
                      {song.rejection_reason}
                    </div>
                  )}

                  {song.audio_url && (
                    <audio
                      controls
                      src={song.audio_url}
                      style={{
                        width: "100%",
                        marginTop: "18px",
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}