"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SubLabel = {
  id: number;
  customer_id: number;
  sub_label_name: string;
  email: string;
  auth_user_id: string;
  is_active: boolean;
  created_at: string;
};

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  singer_name: string;
  album_name: string;
  status: string;
  cover_url: string | null;
  cover_signed_url?: string | null;
};

type Artist = {
  name: string;
  songs: Song[];
  totalSongs: number;
  approved: number;
  pending: number;
  rejected: number;
  albums: number;
};

type UserRole = "customer" | "sub_label" | "admin" | null;

export default function SubLabelArtists() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [selectedSubLabel, setSelectedSubLabel] =
    useState<SubLabel | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [openArtist, setOpenArtist] = useState<string | null>(null);

  useEffect(() => {
    loadArtists();
  }, []);

  async function loadArtists() {
    try {
      setLoading(true);

      // ==============================
      // SESSION
      // ==============================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      // ==============================
      // ROLE
      // ==============================

      const roleResponse = await fetch("/api/auth/role", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const roleData = await roleResponse.json();

      if (!roleResponse.ok) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      // ==============================
      // CUSTOMER
      // ==============================

      if (roleData.role === "customer") {
        setRole("customer");

        if (!roleData.customer) {
          alert("Customer account nahi mila ❌");
          router.replace("/login");
          return;
        }

        if (roleData.customer.is_active === false) {
          alert("Customer account inactive hai ❌");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setCustomerName(
          roleData.customer.customer_name || ""
        );

        const {
          data: customerSubLabels,
          error: subLabelError,
        } = await supabase
          .from("sub_labels")
          .select(
            "id, customer_id, sub_label_name, email, auth_user_id, is_active, created_at"
          )
          .eq(
            "customer_id",
            roleData.customer.id
          )
          .order("id", {
            ascending: false,
          });

        if (subLabelError) {
          alert(
            "Sub Labels load nahi ho paye ❌\n\n" +
              subLabelError.message
          );
          return;
        }

        setSubLabels(customerSubLabels || []);

        if (
          customerSubLabels &&
          customerSubLabels.length > 0
        ) {
          setSelectedSubLabel(
            customerSubLabels[0]
          );
        }

        return;
      }

      // ==============================
      // SUB LABEL
      // ==============================

      if (roleData.role === "sub_label") {
        setRole("sub_label");

        if (!roleData.subLabel) {
          alert("Sub Label account nahi mila ❌");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (roleData.subLabel.is_active === false) {
          alert(
            "Aapka Sub Label account inactive hai ❌"
          );
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const currentSubLabel: SubLabel =
          roleData.subLabel;

        setSubLabels([currentSubLabel]);
        setSelectedSubLabel(currentSubLabel);

        // ==============================
        // LOAD SUB LABEL SONGS
        // ==============================

        await loadSongs(currentSubLabel.id);

        return;
      }

      // ==============================
      // ADMIN
      // ==============================

      if (roleData.role === "admin") {
        router.replace("/dashboard");
        return;
      }

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error(
        "Artists Load Error:",
        error
      );

      alert(
        "Artists load karne me problem aa gayi ❌"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // LOAD SONGS
  // ==============================

  async function loadSongs(subLabelId: number) {
    try {
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

      const {
        data: songData,
        error: songError,
      } = await supabase
        .from("songs")
        .select(`
          id,
          song_title,
          artist_name,
          singer_name,
          album_name,
          status,
          cover_url
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

      // ==============================
      // SIGNED COVER URL
      // ==============================

      const songsWithCovers =
        await Promise.all(
          orderedSongs.map(
            async (song) => {
              if (!song.cover_url) {
                return song;
              }

              if (
                song.cover_url.startsWith(
                  "http://"
                ) ||
                song.cover_url.startsWith(
                  "https://"
                )
              ) {
                return {
                  ...song,
                  cover_signed_url:
                    song.cover_url,
                };
              }

              const {
                data: signedData,
              } = await supabase.storage
                .from("covers")
                .createSignedUrl(
                  song.cover_url,
                  3600
                );

              return {
                ...song,
                cover_signed_url:
                  signedData?.signedUrl ||
                  null,
              };
            }
          )
        );

      setSongs(songsWithCovers);
    } catch (error) {
      console.error(
        "Load Songs Error:",
        error
      );

      alert(
        "Songs load nahi ho paye ❌"
      );
    }
  }

  // ==============================
  // CHANGE SUB LABEL
  // ==============================

  async function handleSubLabelChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedId = Number(
      event.target.value
    );

    const found = subLabels.find(
      (item) => item.id === selectedId
    );

    if (!found) return;

    setSelectedSubLabel(found);
    setSongs([]);
    setOpenArtist(null);

    await loadSongs(found.id);
  }

  // ==============================
  // LOGOUT
  // ==============================

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ==============================
  // GROUP ARTISTS
  // ==============================

  const artists = useMemo(() => {
    const map = new Map<
      string,
      Song[]
    >();

    songs.forEach((song) => {
      const artistName =
        song.artist_name?.trim() ||
        song.singer_name?.trim() ||
        "Unknown Artist";

      if (!map.has(artistName)) {
        map.set(artistName, []);
      }

      map
        .get(artistName)!
        .push(song);
    });

    const result: Artist[] = [];

    map.forEach(
      (artistSongs, name) => {
        const albums = new Set(
          artistSongs
            .map(
              (song) =>
                song.album_name
            )
            .filter(Boolean)
        );

        result.push({
          name,
          songs: artistSongs,
          totalSongs:
            artistSongs.length,
          approved:
            artistSongs.filter(
              (song) =>
                song.status ===
                "Approved"
            ).length,
          pending:
            artistSongs.filter(
              (song) =>
                song.status ===
                "Pending"
            ).length,
          rejected:
            artistSongs.filter(
              (song) =>
                song.status ===
                "Rejected"
            ).length,
          albums: albums.size,
        });
      }
    );

    return result.sort(
      (a, b) =>
        a.name.localeCompare(
          b.name
        )
    );
  }, [songs]);

  // ==============================
  // SEARCH
  // ==============================

  const filteredArtists =
    artists.filter((artist) =>
      artist.name
        .toLowerCase()
        .includes(
          search
            .trim()
            .toLowerCase()
        )
    );

  // ==============================
  // STATS
  // ==============================

  const totalArtists =
    artists.length;

  const totalSongs =
    songs.length;

  const approvedSongs =
    songs.filter(
      (song) =>
        song.status === "Approved"
    ).length;

  const pendingSongs =
    songs.filter(
      (song) =>
        song.status === "Pending"
    ).length;

  const rejectedSongs =
    songs.filter(
      (song) =>
        song.status === "Rejected"
    ).length;

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontSize: "18px",
        }}
      >
        Loading Artists... 🔐
      </main>
    );
  }

  // ==============================
  // NO SUB LABEL
  // ==============================

  if (!selectedSubLabel) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#111827",
            border:
              "1px solid #1f2937",
            borderRadius: "15px",
            padding: "35px",
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: "50px",
              marginBottom: "15px",
            }}
          >
            👤
          </div>

          <h2
            style={{
              margin: "0 0 10px",
            }}
          >
            No Sub Label Found
          </h2>

          <p
            style={{
              color: "#9ca3af",
              lineHeight: "1.6",
            }}
          >
            Is account ke liye koi
            Sub Label available nahi hai.
          </p>

          {role === "customer" && (
            <button
              onClick={() =>
                router.push(
                  "/customer-dashboard"
                )
              }
              style={{
                marginTop: "15px",
                padding: "12px 20px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              ← Customer Dashboard
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        display: "flex",
      }}
    >
      {/* ==============================
          SIDEBAR
      ============================== */}

      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          background: "#111827",
          borderRight:
            "1px solid #1f2937",
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
            marginBottom: "28px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "110px",
              height: "110px",
              objectFit: "contain",
              display: "block",
              margin:
                "0 auto 10px",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            Sub Label Dashboard
          </p>
        </div>

        {/* SUB LABEL SELECTOR */}

        {role === "customer" &&
          subLabels.length > 0 && (
            <div
              style={{
                marginBottom: "25px",
              }}
            >
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: "12px",
                  marginBottom: "7px",
                }}
              >
                Select Sub Label
              </label>

              <select
                value={
                  selectedSubLabel.id
                }
                onChange={
                  handleSubLabelChange
                }
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border:
                    "1px solid #374151",
                  background:
                    "#1f2937",
                  color: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                  boxSizing:
                    "border-box",
                }}
              >
                {subLabels.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {
                        item.sub_label_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          )}

        {/* MENU */}

        <div
          style={{
            display: "flex",
            flexDirection:
              "column",
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
            text="🎵 Upload Song"
            onClick={() =>
              router.push(
                "/sub-label-dashboard/upload"
              )
            }
          />

          <NavButton
            text="🎶 My Songs"
            onClick={() =>
              router.push(
                "/sub-label-dashboard/my-songs"
              )
            }
          />

          <NavButton
            text="👤 Artists"
            active
            onClick={() =>
              router.push(
                "/sub-label-dashboard/artists"
              )
            }
          />

          <NavButton
            text="⚙️ Profile"
            onClick={() =>
              alert(
                "Profile section abhi next step me banega."
              )
            }
          />
        </div>

        {/* CUSTOMER DASHBOARD */}

        {role === "customer" && (
          <button
            onClick={() =>
              router.push(
                "/customer-dashboard"
              )
            }
            style={{
              position: "absolute",
              left: "18px",
              right: "18px",
              bottom: "75px",
              width:
                "calc(100% - 36px)",
              padding: "11px",
              border: "none",
              borderRadius: "8px",
              background: "#374151",
              color: "#ffffff",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            ← Customer Dashboard
          </button>
        )}

        {/* LOGOUT */}

        <div
          style={{
            position: "absolute",
            left: "18px",
            right: "18px",
            bottom: "20px",
          }}
        >
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "8px",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ==============================
          MAIN CONTENT
      ============================== */}

      <section
        style={{
          marginLeft: "250px",
          width:
            "calc(100% - 250px)",
          minHeight: "100vh",
          padding: "35px",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <p
            style={{
              margin:
                "0 0 7px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            {role === "customer"
              ? `Customer: ${customerName}`
              : "Sub Label Account"}
          </p>

          <h1
            style={{
              margin:
                "0 0 8px",
              fontSize: "30px",
              fontWeight: "700",
            }}
          >
            Artists 🎤
          </h1>

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "15px",
            }}
          >
            {selectedSubLabel.sub_label_name}
            {" "}के सभी artists
          </p>
        </div>

        {/* STATS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "18px",
            marginBottom: "25px",
          }}
        >
          <StatCard
            title="Total Artists"
            value={totalArtists}
            icon="👤"
          />

          <StatCard
            title="Total Songs"
            value={totalSongs}
            icon="🎵"
          />

          <StatCard
            title="Approved"
            value={approvedSongs}
            icon="✅"
          />

          <StatCard
            title="Pending"
            value={pendingSongs}
            icon="⏳"
          />
        </div>

        {/* SEARCH */}

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "25px",
          }}
        >
          <input
            type="text"
            placeholder="Search artist..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding:
                "13px 15px",
              borderRadius:
                "8px",
              border:
                "1px solid #334155",
              background:
                "#111827",
              color: "#ffffff",
              outline: "none",
              boxSizing:
                "border-box",
            }}
          />
        </div>

        {/* ARTISTS */}

        {filteredArtists.length ===
          0 ? (
          <div
            style={{
              background:
                "#111827",
              border:
                "1px solid #1f2937",
              borderRadius:
                "14px",
              padding: "50px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "50px",
                marginBottom:
                  "15px",
              }}
            >
              👤
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "20px",
              }}
            >
              {songs.length === 0
                ? "अभी कोई Artist नहीं है"
                : "कोई Artist नहीं मिला"}
            </h2>

            <p
              style={{
                color: "#9ca3af",
                marginTop: "8px",
              }}
            >
              {songs.length === 0
                ? "पहले कोई song upload करें।"
                : "Search बदलकर देखें।"}
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
                  padding:
                    "12px 18px",
                  border: "none",
                  borderRadius:
                    "8px",
                  background:
                    "#2563eb",
                  color:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontWeight:
                    "600",
                }}
              >
                + Upload Song
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection:
                "column",
              gap: "15px",
            }}
          >
            {filteredArtists.map(
              (artist) => {
                const isOpen =
                  openArtist ===
                  artist.name;

                return (
                  <div
                    key={
                      artist.name
                    }
                    style={{
                      background:
                        "#111827",
                      border:
                        "1px solid #1f2937",
                      borderRadius:
                        "14px",
                      overflow:
                        "hidden",
                    }}
                  >
                    {/* ARTIST HEADER */}

                    <button
                      onClick={() =>
                        setOpenArtist(
                          isOpen
                            ? null
                            : artist.name
                        )
                      }
                      style={{
                        width:
                          "100%",
                        border:
                          "none",
                        background:
                          "transparent",
                        color:
                          "#ffffff",
                        cursor:
                          "pointer",
                        padding:
                          "20px",
                        textAlign:
                          "left",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: "15px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "15px",
                          }}
                        >
                          <div
                            style={{
                              width:
                                "55px",
                              height:
                                "55px",
                              borderRadius:
                                "50%",
                              background:
                                "#1d4ed8",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontSize:
                                "24px",
                              flexShrink: 0,
                            }}
                          >
                            🎤
                          </div>

                          <div>
                            <h2
                              style={{
                                margin: 0,
                                fontSize:
                                  "19px",
                              }}
                            >
                              {
                                artist.name
                              }
                            </h2>

                            <p
                              style={{
                                margin:
                                  "5px 0 0",
                                color:
                                  "#9ca3af",
                                fontSize:
                                  "13px",
                              }}
                            >
                              {
                                artist.totalSongs
                              }{" "}
                              Songs •{" "}
                              {
                                artist.albums
                              }{" "}
                              Albums
                            </p>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              padding:
                                "6px 10px",
                              borderRadius:
                                "999px",
                              background:
                                "rgba(34,197,94,0.12)",
                              color:
                                "#86efac",
                              fontSize:
                                "12px",
                              fontWeight:
                                "700",
                            }}
                          >
                            {
                              artist.approved
                            }{" "}
                            Approved
                          </span>

                          <span
                            style={{
                              fontSize:
                                "20px",
                              color:
                                "#94a3b8",
                            }}
                          >
                            {isOpen
                              ? "▲"
                              : "▼"}
                          </span>
                        </div>
                      </div>

                      {/* MINI STATUS */}

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "10px",
                          flexWrap:
                            "wrap",
                          marginTop:
                            "15px",
                        }}
                      >
                        <span
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              "6px",
                            background:
                              "#172033",
                            color:
                              "#cbd5e1",
                            fontSize:
                              "12px",
                          }}
                        >
                          Total:{" "}
                          {
                            artist.totalSongs
                          }
                        </span>

                        <span
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              "6px",
                            background:
                              "rgba(250,204,21,0.1)",
                            color:
                              "#fde047",
                            fontSize:
                              "12px",
                          }}
                        >
                          Pending:{" "}
                          {
                            artist.pending
                          }
                        </span>

                        <span
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              "6px",
                            background:
                              "rgba(239,68,68,0.1)",
                            color:
                              "#fca5a5",
                            fontSize:
                              "12px",
                          }}
                        >
                          Rejected:{" "}
                          {
                            artist.rejected
                          }
                        </span>
                      </div>
                    </button>

                    {/* SONGS */}

                    {isOpen && (
                      <div
                        style={{
                          borderTop:
                            "1px solid #1f2937",
                          padding:
                            "20px",
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          gap: "12px",
                        }}
                      >
                        {artist.songs.map(
                          (song) => (
                            <div
                              key={
                                song.id
                              }
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "15px",
                                padding:
                                  "14px",
                                background:
                                  "#0f172a",
                                border:
                                  "1px solid #1e293b",
                                borderRadius:
                                  "10px",
                              }}
                            >
                              {/* COVER */}

                              {song.cover_signed_url ? (
                                <img
                                  src={
                                    song.cover_signed_url
                                  }
                                  alt={
                                    song.song_title
                                  }
                                  style={{
                                    width:
                                      "58px",
                                    height:
                                      "58px",
                                    borderRadius:
                                      "8px",
                                    objectFit:
                                      "cover",
                                    flexShrink:
                                      0,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width:
                                      "58px",
                                    height:
                                      "58px",
                                    borderRadius:
                                      "8px",
                                    background:
                                      "#020617",
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    fontSize:
                                      "22px",
                                    flexShrink:
                                      0,
                                  }}
                                >
                                  🎵
                                </div>
                              )}

                              <div
                                style={{
                                  flex: 1,
                                  minWidth:
                                    0,
                                }}
                              >
                                <h3
                                  style={{
                                    margin:
                                      0,
                                    fontSize:
                                      "15px",
                                  }}
                                >
                                  {
                                    song.song_title
                                  }
                                </h3>

                                <p
                                  style={{
                                    margin:
                                      "5px 0 0",
                                    color:
                                      "#94a3b8",
                                    fontSize:
                                      "12px",
                                  }}
                                >
                                  Singer:{" "}
                                  {
                                    song.singer_name ||
                                    "-"
                                  }
                                  {" • "}
                                  Album:{" "}
                                  {
                                    song.album_name ||
                                    "-"
                                  }
                                </p>
                              </div>

                              <StatusBadge
                                status={
                                  song.status
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* REJECTED NOTICE */}

        {rejectedSongs > 0 && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px 18px",
              borderRadius: "10px",
              background:
                "rgba(127,29,29,0.25)",
              border:
                "1px solid rgba(248,113,113,0.3)",
              color: "#fecaca",
              fontSize: "13px",
            }}
          >
            ⚠️ Is Sub Label ke{" "}
            {rejectedSongs} rejected song
            {rejectedSongs > 1
              ? "s"
              : ""}{" "}
            hain. Rejected songs ko My Songs
            page se edit kiya ja sakta hai.
          </div>
        )}
      </section>
    </main>
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
        padding: "13px 15px",
        border: active
          ? "1px solid #2563eb"
          : "none",
        borderRadius: "8px",
        background: active
          ? "#2563eb"
          : "#1f2937",
        color: "#ffffff",
        textAlign: "left",
        fontSize: "14px",
        cursor: "pointer",
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
        background: "#111827",
        border:
          "1px solid #1f2937",
        borderRadius: "14px",
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
          <p
            style={{
              margin:
                "0 0 7px",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            {title}
          </p>

          <h2
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            {value}
          </h2>
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