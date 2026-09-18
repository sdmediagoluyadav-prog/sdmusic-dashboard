"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
};

export default function CustomerDashboard() {
  const router = useRouter();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [labelName, setLabelName] = useState("");

  // SEARCH + FILTER
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadCustomerDashboard();
  }, []);

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

  async function loadCustomerDashboard() {
    setLoading(true);

    try {
      // CHECK LOGIN
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // FIND CUSTOMER
      const { data: customer, error: customerError } =
        await supabase
          .from("customers")
          .select(
            "id, customer_name, label_name"
          )
          .eq("auth_user_id", session.user.id)
          .single();

      if (customerError || !customer) {
        console.error(
          "Customer error:",
          customerError
        );

        alert(
          "Customer account nahi mila ❌"
        );

        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setCustomerName(
        customer.customer_name || ""
      );

      setLabelName(
        customer.label_name || ""
      );

      // CUSTOMER SONG LINKS
      const {
        data: customerSongs,
        error: customerSongsError,
      } = await supabase
        .from("customer_songs")
        .select("song_id")
        .eq("customer_id", customer.id);

      if (customerSongsError) {
        console.error(
          "Customer songs error:",
          customerSongsError
        );

        setSongs([]);
        setLoading(false);
        return;
      }

      if (
        !customerSongs ||
        customerSongs.length === 0
      ) {
        setSongs([]);
        setLoading(false);
        return;
      }

      const songIds = customerSongs.map(
        (item) => item.song_id
      );

      // GET SONGS
      const {
        data: songData,
        error: songError,
      } = await supabase
        .from("songs")
        .select(
          "id, song_title, artist_name, album_name, cover_url, audio_url, status, rejection_reason"
        )
        .in("id", songIds)
        .order("id", {
          ascending: false,
        });

      if (songError) {
        console.error(
          "Song error:",
          songError
        );

        alert(
          "Songs load nahi ho paaye ❌\n\n" +
            songError.message
        );

        setSongs([]);
        setLoading(false);
        return;
      }

      // CREATE SIGNED URLS
      const songsWithUrls =
        await Promise.all(
          (songData || []).map(
            async (song) => {
              const coverUrl =
                await createSignedUrl(
                  song.cover_url
                );

              const audioUrl =
                await createSignedUrl(
                  song.audio_url
                );

              return {
                ...song,
                cover_url: coverUrl,
                audio_url: audioUrl,
              };
            }
          )
        );

      setSongs(songsWithUrls);
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function getStatusStyle(
    status: string | null
  ) {
    if (status === "Approved") {
      return {
        background: "#052e16",
        color: "#4ade80",
        border: "1px solid #166534",
      };
    }

    if (status === "Rejected") {
      return {
        background: "#450a0a",
        color: "#f87171",
        border: "1px solid #991b1b",
      };
    }

    return {
      background: "#422006",
      color: "#fbbf24",
      border: "1px solid #92400e",
    };
  }

  function getStatusText(
    status: string | null
  ) {
    if (status === "Approved")
      return "🟢 Approved";

    if (status === "Rejected")
      return "🔴 Rejected";

    return "🟠 Pending";
  }

  // FILTERED SONGS
  const filteredSongs = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return songs.filter((song) => {
      const title =
        song.song_title
          ?.toLowerCase() || "";

      const artist =
        song.artist_name
          ?.toLowerCase() || "";

      const album =
        song.album_name
          ?.toLowerCase() || "";

      const matchesSearch =
        !searchText ||
        title.includes(searchText) ||
        artist.includes(searchText) ||
        album.includes(searchText);

      const currentStatus =
        song.status || "Pending";

      const matchesStatus =
        statusFilter === "All" ||
        currentStatus === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    songs,
    search,
    statusFilter,
  ]);

  // COUNTS
  const totalSongs = songs.length;

  const approvedSongs = songs.filter(
    (song) =>
      song.status === "Approved"
  ).length;

  const pendingSongs = songs.filter(
    (song) =>
      !song.status ||
      song.status === "Pending"
  ).length;

  const rejectedSongs = songs.filter(
    (song) =>
      song.status === "Rejected"
  ).length;

  const artists = new Set(
    songs
      .map((song) => song.artist_name)
      .filter(Boolean)
  ).size;

  const albums = new Set(
    songs
      .map((song) => song.album_name)
      .filter(Boolean)
  ).size;

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Arial, sans-serif",
          fontSize: "20px",
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
        background: "#020617",
        color: "white",
        fontFamily:
          "Arial, sans-serif",
        display: "flex",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "230px",
          minHeight: "100vh",
          background: "#0f172a",
          borderRight:
            "1px solid #1e293b",
          padding: "20px 14px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
        }}
      >
        {/* LOGO */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "125px",
              height: "125px",
              objectFit: "contain",
            }}
          />

          <p
            style={{
              margin: "5px 0 0",
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            Music Content Management
          </p>
        </div>

        {/* DASHBOARD */}
        <button
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          style={sideButtonStyle(
            true
          )}
        >
          🏠 Dashboard
        </button>

        {/* MY SONGS */}
        <button
          onClick={() =>
            window.scrollTo({
              top: 450,
              behavior: "smooth",
            })
          }
          style={sideButtonStyle(
            false
          )}
        >
          🎵 My Songs
        </button>

        {/* ARTISTS */}
        <button
          onClick={() => {
            alert(
              `Total Artists: ${artists}`
            );
          }}
          style={sideButtonStyle(
            false
          )}
        >
          🎤 Artists
        </button>

        {/* ALBUMS */}
        <button
          onClick={() => {
            alert(
              `Total Albums: ${albums}`
            );
          }}
          style={sideButtonStyle(
            false
          )}
        >
          💿 Albums
        </button>

        {/* ROYALTY */}
        <button
          onClick={() => {
            alert(
              "Royalty section abhi setup nahi hua hai."
            );
          }}
          style={sideButtonStyle(
            false
          )}
        >
          💰 Royalty
        </button>

        {/* SUB LABELS */}
        <button
          onClick={() => {
            alert(
              "Sub Labels section abhi setup nahi hua hai."
            );
          }}
          style={sideButtonStyle(
            false
          )}
        >
          🏷️ Sub Labels
        </button>

        {/* UPLOAD */}
        <button
          onClick={() =>
            router.push("/upload")
          }
          style={{
            ...sideButtonStyle(
              false
            ),
            background: "#2563eb",
            color: "white",
            fontWeight: "bold",
          }}
        >
          ⬆️ Upload Song
        </button>

        {/* LOGOUT */}
        <div
          style={{
            marginTop: "25px",
            paddingTop: "20px",
            borderTop:
              "1px solid #1e293b",
          }}
        >
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "12px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              textAlign: "left",
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
          marginLeft: "230px",
          width:
            "calc(100% - 230px)",
          padding: "30px",
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
                fontSize: "32px",
              }}
            >
              Customer Dashboard
            </h1>

            <p
              style={{
                color: "#94a3b8",
                margin:
                  "8px 0 0",
              }}
            >
              Welcome,{" "}
              {customerName ||
                "Customer"}
            </p>

            {labelName && (
              <p
                style={{
                  color: "#64748b",
                  margin:
                    "5px 0 0",
                }}
              >
                Label: {labelName}
              </p>
            )}
          </div>

          <button
            onClick={() =>
              router.push("/upload")
            }
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding:
                "12px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
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
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "15px",
            marginBottom: "30px",
          }}
        >
          <StatCard
            title="Total Songs"
            value={totalSongs}
          />

          <StatCard
            title="Approved"
            value={approvedSongs}
            valueColor="#4ade80"
          />

          <StatCard
            title="Pending"
            value={pendingSongs}
            valueColor="#fbbf24"
          />

          <StatCard
            title="Rejected"
            value={rejectedSongs}
            valueColor="#f87171"
          />

          <StatCard
            title="Artists"
            value={artists}
          />

          <StatCard
            title="Albums"
            value={albums}
          />
        </div>

        {/* MY SONGS HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
            marginBottom: "15px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
              }}
            >
              My Songs
            </h2>

            <p
              style={{
                color: "#64748b",
                margin:
                  "5px 0 0",
                fontSize: "13px",
              }}
            >
              Showing{" "}
              {filteredSongs.length}{" "}
              of {songs.length} songs
            </p>
          </div>
        </div>

        {/* SEARCH + FILTER */}
        <div
          style={{
            background: "#0f172a",
            border:
              "1px solid #1e293b",
            borderRadius: "12px",
            padding: "15px",
            marginBottom: "25px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* SEARCH */}
          <div
            style={{
              flex: 1,
              minWidth: "250px",
            }}
          >
            <input
              type="text"
              placeholder="🔎 Search song, artist or album..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                background:
                  "#020617",
                color: "white",
                border:
                  "1px solid #334155",
                borderRadius: "8px",
                padding:
                  "12px 14px",
                outline: "none",
                fontSize: "14px",
              }}
            />
          </div>

          {/* STATUS FILTER */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            style={{
              background:
                "#020617",
              color: "white",
              border:
                "1px solid #334155",
              borderRadius: "8px",
              padding:
                "12px 14px",
              minWidth: "160px",
              cursor: "pointer",
            }}
          >
            <option value="All">
              All Status
            </option>

            <option value="Approved">
              Approved
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Rejected">
              Rejected
            </option>
          </select>

          {/* CLEAR */}
          {(search ||
            statusFilter !==
              "All") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "All"
                );
              }}
              style={{
                background:
                  "#334155",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding:
                  "12px 16px",
                cursor: "pointer",
                fontWeight:
                  "600",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* NO SONG */}
        {songs.length === 0 ? (
          <div
            style={{
              background: "#0f172a",
              border:
                "1px solid #1e293b",
              borderRadius: "12px",
              padding:
                "50px 20px",
              textAlign: "center",
            }}
          >
            <h2>
              No Songs Found
            </h2>

            <p
              style={{
                color: "#94a3b8",
              }}
            >
              Abhi aapke account
              me koi song
              available nahi hai.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/upload"
                )
              }
              style={{
                background:
                  "#2563eb",
                color: "white",
                border: "none",
                borderRadius:
                  "8px",
                padding:
                  "11px 20px",
                cursor: "pointer",
                fontWeight:
                  "600",
              }}
            >
              Upload Your First Song
            </button>
          </div>
        ) : filteredSongs.length ===
          0 ? (
          <div
            style={{
              background: "#0f172a",
              border:
                "1px solid #1e293b",
              borderRadius: "12px",
              padding:
                "50px 20px",
              textAlign: "center",
            }}
          >
            <h2>
              No Matching Songs
            </h2>

            <p
              style={{
                color: "#94a3b8",
              }}
            >
              Search ya status
              filter change karke
              dekhiye.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "All"
                );
              }}
              style={{
                background:
                  "#334155",
                color: "white",
                border: "none",
                borderRadius:
                  "8px",
                padding:
                  "10px 18px",
                cursor: "pointer",
              }}
            >
              Clear Filter
            </button>
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
            {filteredSongs.map(
              (song) => (
                <div
                  key={song.id}
                  style={{
                    background:
                      "#0f172a",
                    border:
                      "1px solid #1e293b",
                    borderRadius:
                      "14px",
                    overflow:
                      "hidden",
                  }}
                >
                  {/* COVER */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio:
                        "1 / 1",
                      background:
                        "#020617",
                    }}
                  >
                    {song.cover_url ? (
                      <img
                        src={
                          song.cover_url
                        }
                        alt={
                          song.song_title ||
                          "Song Cover"
                        }
                        style={{
                          width:
                            "100%",
                          height:
                            "100%",
                          objectFit:
                            "cover",
                          display:
                            "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height:
                            "100%",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          color:
                            "#64748b",
                        }}
                      >
                        No Cover
                      </div>
                    )}
                  </div>

                  {/* SONG CONTENT */}
                  <div
                    style={{
                      padding:
                        "16px",
                    }}
                  >
                    <h3
                      style={{
                        margin:
                          "0 0 7px",
                        fontSize:
                          "18px",
                      }}
                    >
                      {song.song_title ||
                        "Untitled Song"}
                    </h3>

                    <p
                      style={{
                        margin:
                          "0 0 6px",
                        color:
                          "#94a3b8",
                      }}
                    >
                      Artist:{" "}
                      {song.artist_name ||
                        "Unknown"}
                    </p>

                    {song.album_name && (
                      <p
                        style={{
                          margin:
                            "0 0 12px",
                          color:
                            "#64748b",
                          fontSize:
                            "13px",
                        }}
                      >
                        Album:{" "}
                        {
                          song.album_name
                        }
                      </p>
                    )}

                    {/* STATUS */}
                    <div
                      style={{
                        marginBottom:
                          "12px",
                      }}
                    >
                      <span
                        style={{
                          ...getStatusStyle(
                            song.status
                          ),
                          display:
                            "inline-block",
                          borderRadius:
                            "999px",
                          padding:
                            "6px 10px",
                          fontSize:
                            "12px",
                          fontWeight:
                            "600",
                        }}
                      >
                        {getStatusText(
                          song.status
                        )}
                      </span>
                    </div>

                    {/* REJECTION REASON */}
                    {song.status ===
                      "Rejected" &&
                      song.rejection_reason && (
                        <div
                          style={{
                            background:
                              "#1c0a0a",
                            border:
                              "1px solid #7f1d1d",
                            borderRadius:
                              "8px",
                            padding:
                              "12px",
                            marginBottom:
                              "14px",
                          }}
                        >
                          <p
                            style={{
                              margin:
                                "0 0 5px",
                              color:
                                "#fca5a5",
                              fontSize:
                                "12px",
                              fontWeight:
                                "700",
                            }}
                          >
                            Rejection Reason
                          </p>

                          <p
                            style={{
                              margin: 0,
                              color:
                                "#fecaca",
                              fontSize:
                                "13px",
                              lineHeight:
                                "1.5",
                            }}
                          >
                            {
                              song.rejection_reason
                            }
                          </p>
                        </div>
                      )}

                    {/* AUDIO */}
                    {song.audio_url ? (
                      <audio
                        controls
                        src={
                          song.audio_url
                        }
                        style={{
                          width:
                            "100%",
                          marginBottom:
                            "12px",
                        }}
                      />
                    ) : (
                      <p
                        style={{
                          color:
                            "#64748b",
                          fontSize:
                            "13px",
                        }}
                      >
                        Audio not available
                      </p>
                    )}

                    {/* EDIT REJECTED SONG */}
                    {song.status ===
                      "Rejected" && (
                      <button
                        onClick={() =>
                          router.push(
                            `/customer-dashboard/edit/${song.id}`
                          )
                        }
                        style={{
                          width:
                            "100%",
                          background:
                            "#f59e0b",
                          color:
                            "#111827",
                          border:
                            "none",
                          borderRadius:
                            "8px",
                          padding:
                            "10px",
                          cursor:
                            "pointer",
                          fontWeight:
                            "700",
                        }}
                      >
                        ✏️ Edit & Resubmit
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}

/* STAT CARD */
function StatCard({
  title,
  value,
  valueColor = "white",
}: {
  title: string;
  value: number;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border:
          "1px solid #1e293b",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      <p
        style={{
          color: "#94a3b8",
          margin: 0,
          fontSize: "13px",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          margin:
            "7px 0 0",
          fontSize: "28px",
          color: valueColor,
        }}
      >
        {value}
      </h2>
    </div>
  );
}

/* SIDEBAR BUTTON */
function sideButtonStyle(
  active: boolean
) {
  return {
    width: "100%",
    padding: "12px",
    marginBottom: "8px",
    background: active
      ? "#2563eb"
      : "transparent",
    color: active
      ? "white"
      : "#d1d5db",
    border: "none",
    borderRadius: "8px",
    textAlign:
      "left" as const,
    cursor: "pointer",
    fontWeight: active
      ? "bold"
      : "normal",
  };
}