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
};

type FilterType =
  | "All"
  | "Pending"
  | "Approved"
  | "Rejected";

export default function SubLabelMySongs() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<FilterType>("All");

  const [subLabelName, setSubLabelName] =
    useState("Sub Label");

  useEffect(() => {
    loadSongs();
  }, []);

  async function loadSongs() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // ROLE CHECK
      const roleResponse = await fetch(
        "/api/auth/role",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const roleData =
        await roleResponse.json();

      if (!roleResponse.ok) {
        alert(
          roleData.error ||
            "Role check failed"
        );

        router.push("/login");
        return;
      }

      // CUSTOMER
      if (roleData.role === "customer") {
        router.push(
          "/customer-dashboard"
        );
        return;
      }

      // ADMIN
      if (roleData.role === "admin") {
        router.push("/dashboard");
        return;
      }

      // ONLY SUB LABEL
      if (roleData.role !== "sub_label") {
        router.push("/login");
        return;
      }

      const subLabelId =
        roleData.subLabel?.id;

      const name =
        roleData.subLabel
          ?.sub_label_name;

      if (name) {
        setSubLabelName(name);
      }

      if (!subLabelId) {
        alert(
          "Sub Label account नहीं मिला"
        );

        router.push(
          "/sub-label-dashboard"
        );

        return;
      }

      // GET SONG LINKS
      const {
        data: links,
        error: linkError,
      } = await supabase
        .from("sub_label_songs")
        .select("song_id")
        .eq(
          "sub_label_id",
          subLabelId
        )
        .order("created_at", {
          ascending: false,
        });

      if (linkError) {
        console.error(
          "Sub Label Songs Error:",
          linkError
        );

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

      // GET SONGS
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
          rejection_reason
        `)
        .in("id", songIds);

      if (songError) {
        console.error(
          "Songs Error:",
          songError
        );

        alert(songError.message);
        return;
      }

      if (!songData) {
        setSongs([]);
        return;
      }

      // Keep same order as sub_label_songs
      const orderedSongs =
        songIds
          .map((songId) =>
            songData.find(
              (song) =>
                song.id === songId
            )
          )
          .filter(
            (
              song
            ): song is Song =>
              Boolean(song)
          );

      setSongs(orderedSongs);
    } catch (error) {
      console.error(
        "Load Songs Error:",
        error
      );

      alert(
        "Songs load नहीं हो पाए"
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getFileUrl(
    url: string | null
  ) {
    if (!url) return null;

    // Already full URL
    if (
      url.startsWith("http://") ||
      url.startsWith("https://")
    ) {
      return url;
    }

    return url;
  }

  const filteredSongs =
    songs.filter((song) => {
      const searchText =
        search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        song.song_title
          ?.toLowerCase()
          .includes(searchText) ||
        song.artist_name
          ?.toLowerCase()
          .includes(searchText) ||
        song.album_name
          ?.toLowerCase()
          .includes(searchText) ||
        song.singer_name
          ?.toLowerCase()
          .includes(searchText);

      const matchesFilter =
        filter === "All" ||
        song.status === filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  const totalSongs = songs.length;

  const pendingSongs =
    songs.filter(
      (song) =>
        song.status === "Pending"
    ).length;

  const approvedSongs =
    songs.filter(
      (song) =>
        song.status === "Approved"
    ).length;

  const rejectedSongs =
    songs.filter(
      (song) =>
        song.status === "Rejected"
    ).length;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading My Songs...
      </div>
    );
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
          borderRight:
            "1px solid #1e293b",
          padding: "25px 18px",
          boxSizing: "border-box",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* LOGO */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
              display: "block",
              margin: "0 auto 8px",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            Music Content Management
          </p>
        </div>

        {/* SUB LABEL NAME */}
        <div
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "#172033",
            border:
              "1px solid #26354d",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: "11px",
              marginBottom: "4px",
            }}
          >
            SUB LABEL
          </div>

          <div
            style={{
              color: "#fff",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            {subLabelName}
          </div>
        </div>

        {/* NAVIGATION */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <NavButton
            text="🏠 Dashboard"
            onClick={() =>
              router.push(
                "/sub-label-dashboard"
              )
            }
          />

          <NavButton
            text="⬆️ Upload Song"
            onClick={() =>
              router.push(
                "/sub-label-dashboard/upload"
              )
            }
          />

          <NavButton
            text="🎵 My Songs"
            active
            onClick={() =>
              router.push(
                "/sub-label-dashboard/my-songs"
              )
            }
          />

          <NavButton
            text="🎤 Artists"
            onClick={() =>
              alert(
                "Artists section जल्द उपलब्ध होगा।"
              )
            }
          />

          <NavButton
            text="👤 Profile"
            onClick={() =>
              alert(
                "Profile section जल्द उपलब्ध होगा।"
              )
            }
          />
        </div>

        {/* LOGOUT */}
        <button
          onClick={logout}
          style={{
            width: "100%",
            marginTop: "30px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #7f1d1d",
            background: "#450a0a",
            color: "#fca5a5",
            cursor: "pointer",
            fontWeight: "600",
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
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
              }}
            >
              My Songs
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#94a3b8",
              }}
            >
              आपके Sub Label के सभी songs
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

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "18px",
            marginBottom: "30px",
          }}
        >
          <StatCard
            title="Total Songs"
            value={totalSongs}
            icon="🎵"
          />

          <StatCard
            title="Pending"
            value={pendingSongs}
            icon="⏳"
          />

          <StatCard
            title="Approved"
            value={approvedSongs}
            icon="✅"
          />

          <StatCard
            title="Rejected"
            value={rejectedSongs}
            icon="❌"
          />
        </div>

        {/* SEARCH + FILTER */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <input
            type="text"
            placeholder="Search song, artist, album..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              flex: 1,
              minWidth: "260px",
              padding: "13px 15px",
              borderRadius: "8px",
              border:
                "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              outline: "none",
            }}
          />

          <select
            value={filter}
            onChange={(e) =>
              setFilter(
                e.target
                  .value as FilterType
              )
            }
            style={{
              padding: "13px 15px",
              borderRadius: "8px",
              border:
                "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              outline: "none",
              minWidth: "150px",
            }}
          >
            <option value="All">
              All
            </option>
            <option value="Pending">
              Pending
            </option>
            <option value="Approved">
              Approved
            </option>
            <option value="Rejected">
              Rejected
            </option>
          </select>
        </div>

        {/* EMPTY */}
        {filteredSongs.length === 0 && (
          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
              background: "#0f172a",
              border:
                "1px solid #1e293b",
              borderRadius: "14px",
            }}
          >
            <div
              style={{
                fontSize: "45px",
                marginBottom: "15px",
              }}
            >
              🎵
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "20px",
              }}
            >
              {songs.length === 0
                ? "अभी कोई song नहीं है"
                : "कोई song नहीं मिला"}
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginTop: "8px",
              }}
            >
              {songs.length === 0
                ? "अपना पहला song upload करें।"
                : "Search या filter बदलकर देखें।"}
            </p>

            {songs.length === 0 && (
              <button
                onClick={() =>
                  router.push(
                    "/sub-label-dashboard/upload"
                  )
                }
                style={{
                  marginTop: "15px",
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
            )}
          </div>
        )}

        {/* SONG LIST */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {filteredSongs.map(
            (song) => {
              const coverUrl =
                getFileUrl(
                  song.cover_url
                );

              const audioUrl =
                getFileUrl(
                  song.audio_url
                );

              return (
                <div
                  key={song.id}
                  style={{
                    background:
                      "#0f172a",
                    border:
                      "1px solid #1e293b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  {/* SONG TOP */}
                  <div
                    style={{
                      display: "flex",
                      gap: "18px",
                      alignItems:
                        "flex-start",
                    }}
                  >
                    {/* COVER */}
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        flexShrink: 0,
                        borderRadius: "10px",
                        overflow: "hidden",
                        background:
                          "#020617",
                        border:
                          "1px solid #334155",
                      }}
                    >
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={
                            song.song_title
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            color:
                              "#64748b",
                            fontSize:
                              "30px",
                          }}
                        >
                          🎵
                        </div>
                      )}
                    </div>

                    {/* INFO */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: "15px",
                        }}
                      >
                        <div>
                          <h2
                            style={{
                              margin: 0,
                              fontSize:
                                "21px",
                            }}
                          >
                            {
                              song.song_title
                            }
                          </h2>

                          <p
                            style={{
                              margin:
                                "7px 0 0",
                              color:
                                "#94a3b8",
                            }}
                          >
                            Artist:{" "}
                            {
                              song.artist_name
                            }
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            song.status
                          }
                        />
                      </div>

                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(170px, 1fr))",
                          gap: "10px",
                          marginTop:
                            "16px",
                        }}
                      >
                        <InfoItem
                          label="Album"
                          value={
                            song.album_name
                          }
                        />

                        <InfoItem
                          label="Singer"
                          value={
                            song.singer_name
                          }
                        />

                        <InfoItem
                          label="Language"
                          value={
                            song.language
                          }
                        />

                        <InfoItem
                          label="Genre"
                          value={
                            song.genre
                          }
                        />

                        <InfoItem
                          label="Composer"
                          value={
                            song.composer
                          }
                        />

                        <InfoItem
                          label="Lyricist"
                          value={
                            song.lyricist
                          }
                        />

                        <InfoItem
                          label="Release Date"
                          value={
                            song.release_date
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* REJECTION REASON */}
                  {song.status ===
                    "Rejected" &&
                    song.rejection_reason && (
                      <div
                        style={{
                          marginTop:
                            "18px",
                          padding:
                            "15px",
                          borderRadius:
                            "9px",
                          background:
                            "rgba(127,29,29,0.25)",
                          border:
                            "1px solid rgba(248,113,113,0.35)",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#fca5a5",
                            fontWeight:
                              "700",
                            marginBottom:
                              "6px",
                          }}
                        >
                          Rejection Reason
                        </div>

                        <div
                          style={{
                            color:
                              "#fecaca",
                            lineHeight:
                              "1.6",
                          }}
                        >
                          {
                            song.rejection_reason
                          }
                        </div>
                      </div>
                    )}

                  {/* AUDIO */}
                  {audioUrl && (
                    <div
                      style={{
                        marginTop:
                          "18px",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#cbd5e1",
                          fontSize:
                            "13px",
                          marginBottom:
                            "8px",
                        }}
                      >
                        Audio Preview
                      </div>

                      <audio
                        controls
                        src={audioUrl}
                        style={{
                          width:
                            "100%",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </main>
    </div>
  );
}

/* =========================
   NAV BUTTON
========================= */

function NavButton({
  text,
  onClick,
  active = false,
}: {
  text: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: "8px",
        border: active
          ? "1px solid #2563eb"
          : "1px solid transparent",
        background: active
          ? "#1d4ed8"
          : "transparent",
        color: "#fff",
        cursor: "pointer",
        textAlign: "left",
        fontSize: "14px",
      }}
    >
      {text}
    </button>
  );
}

/* =========================
   STAT CARD
========================= */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border:
          "1px solid #1e293b",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: "13px",
              marginBottom: "7px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: "28px",
              fontWeight: "700",
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            fontSize: "28px",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================
   STATUS BADGE
========================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let background =
    "rgba(148,163,184,0.15)";
  let color = "#cbd5e1";

  if (status === "Approved") {
    background =
      "rgba(34,197,94,0.15)";
    color = "#86efac";
  }

  if (status === "Rejected") {
    background =
      "rgba(239,68,68,0.15)";
    color = "#fca5a5";
  }

  if (status === "Pending") {
    background =
      "rgba(250,204,21,0.15)";
    color = "#fde047";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background,
        color,
        fontSize: "12px",
        fontWeight: "700",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

/* =========================
   INFO ITEM
========================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "8px",
        background: "#020617",
        border:
          "1px solid #1e293b",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "11px",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#e2e8f0",
          fontSize: "13px",
          overflow: "hidden",
          textOverflow:
            "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}