"use client";

import { useEffect, useState } from "react";
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

type UserRole = "customer" | "sub_label" | "admin" | null;

type DashboardSong = {
  id: number;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  status: string | null;
  created_at: string | null;
};

export default function SubLabelDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);

  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [selectedSubLabel, setSelectedSubLabel] =
    useState<SubLabel | null>(null);

  const [dashboardSongs, setDashboardSongs] = useState<DashboardSong[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  /* =========================================================
     LOAD SONGS FOR SELECTED SUB LABEL
  ========================================================= */

  async function loadSongsForSubLabel(subLabelId: number) {
    try {
      setDashboardSongs([]);

      const { data: songLinks, error: songLinksError } =
        await supabase
          .from("sub_label_songs")
          .select("song_id")
          .eq("sub_label_id", subLabelId);

      if (songLinksError) {
        console.error(
          "Sub Label Song Links Error:",
          songLinksError
        );
        return;
      }

      const songIds = (songLinks || []).map(
        (item) => item.song_id
      );

      if (songIds.length === 0) {
        setDashboardSongs([]);
        return;
      }

      const { data: songData, error: songError } =
        await supabase
          .from("songs")
          .select(`
            id,
            song_title,
            artist_name,
            album_name,
            status,
            created_at
          `)
          .in("id", songIds)
          .order("created_at", {
            ascending: true,
          });

      if (songError) {
        console.error(
          "Sub Label Songs Error:",
          songError
        );
        setDashboardSongs([]);
        return;
      }

      setDashboardSongs(
        (songData || []) as DashboardSong[]
      );
    } catch (error) {
      console.error(
        "Load Sub Label Songs Error:",
        error
      );
      setDashboardSongs([]);
    }
  }

  /* =========================================================
     LOAD DASHBOARD
  ========================================================= */

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const roleRes = await fetch("/api/auth/role", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roleData = await roleRes.json();

      if (!roleRes.ok) {
        alert(roleData?.error || "Role check failed");
        router.push("/login");
        return;
      }

      setRole(roleData.role);

      /* =========================
         ADMIN
      ========================= */

      if (roleData.role === "admin") {
        router.push("/dashboard");
        return;
      }

      /* =========================
         CUSTOMER
      ========================= */

      if (roleData.role === "customer") {
        const customer = roleData.customer;

        if (!customer || !customer.is_active) {
          alert(
            "Customer account inactive or not found."
          );
          router.push("/login");
          return;
        }

        setCustomerName(
          customer.customer_name || ""
        );

        setCustomerId(customer.id);

        const { data: labels, error: labelsError } =
          await supabase
            .from("sub_labels")
            .select("*")
            .eq("customer_id", customer.id)
            .order("created_at", {
              ascending: false,
            });

        if (labelsError) {
          console.error(labelsError);
          alert(
            "Sub Labels load nahi ho paaye."
          );
          return;
        }

        setSubLabels(labels || []);

        if (labels && labels.length > 0) {
          setSelectedSubLabel(labels[0]);

          await loadSongsForSubLabel(
            labels[0].id
          );
        }

        return;
      }

      /* =========================
         SUB LABEL
      ========================= */

      if (roleData.role === "sub_label") {
        const subLabel = roleData.subLabel;

        if (!subLabel || !subLabel.is_active) {
          alert(
            "Sub Label account inactive or not found."
          );
          router.push("/login");
          return;
        }

        setSelectedSubLabel(subLabel);

        await loadSongsForSubLabel(
          subLabel.id
        );

        return;
      }

      alert("Invalid account role.");
      router.push("/login");
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  /* =========================================================
     SELECT SUB LABEL
  ========================================================= */

  async function handleSubLabelChange(
    subLabelId: number
  ) {
    const selected = subLabels.find(
      (item) => item.id === subLabelId
    );

    if (!selected) return;

    setSelectedSubLabel(selected);

    await loadSongsForSubLabel(
      selected.id
    );
  }

  /* =========================================================
     ANALYTICS DATA
  ========================================================= */

  const totalSongs = dashboardSongs.length;

  const approvedSongs = dashboardSongs.filter(
    (song) =>
      (song.status || "").toLowerCase() ===
      "approved"
  ).length;

  const pendingSongs = dashboardSongs.filter(
    (song) =>
      (song.status || "").toLowerCase() ===
      "pending"
  ).length;

  const rejectedSongs = dashboardSongs.filter(
    (song) =>
      (song.status || "").toLowerCase() ===
      "rejected"
  ).length;

  const totalArtists = new Set(
    dashboardSongs
      .map((song) => song.artist_name)
      .filter(Boolean)
  ).size;

  const totalAlbums = new Set(
    dashboardSongs
      .map((song) => song.album_name)
      .filter(Boolean)
  ).size;

  /* =========================================================
     DATE HELPERS
  ========================================================= */

  function getDateOnly(date: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }

  function getSongDate(song: DashboardSong) {
    if (!song.created_at) return null;

    const date = new Date(song.created_at);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  const now = new Date();

  const today = getDateOnly(now);

  const yesterday = new Date(today);
  yesterday.setDate(
    yesterday.getDate() - 1
  );

  const weekStart = new Date(today);
  weekStart.setDate(
    weekStart.getDate() - 6
  );

  const yearStart = new Date(
    today.getFullYear(),
    0,
    1
  );

  const todaySongs = dashboardSongs.filter(
    (song) => {
      const date = getSongDate(song);
      if (!date) return false;

      return (
        getDateOnly(date).getTime() ===
        today.getTime()
      );
    }
  );

  const yesterdaySongs = dashboardSongs.filter(
    (song) => {
      const date = getSongDate(song);
      if (!date) return false;

      return (
        getDateOnly(date).getTime() ===
        yesterday.getTime()
      );
    }
  );

  const weeklySongs = dashboardSongs.filter(
    (song) => {
      const date = getSongDate(song);
      if (!date) return false;

      const dateOnly = getDateOnly(date);

      return (
        dateOnly >= weekStart &&
        dateOnly <= today
      );
    }
  );

  const yearlySongs = dashboardSongs.filter(
    (song) => {
      const date = getSongDate(song);
      if (!date) return false;

      const dateOnly = getDateOnly(date);

      return (
        dateOnly >= yearStart &&
        dateOnly <= today
      );
    }
  );

  /* =========================================================
     LAST 7 DAYS DATA
  ========================================================= */

  const dailyData = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(today);

      date.setDate(
        today.getDate() -
          (6 - index)
      );

      const count = dashboardSongs.filter(
        (song) => {
          const songDate =
            getSongDate(song);

          if (!songDate) return false;

          return (
            getDateOnly(
              songDate
            ).getTime() ===
            date.getTime()
          );
        }
      ).length;

      return {
        date,
        count,
      };
    }
  );

  const maxDailyCount = Math.max(
    ...dailyData.map(
      (item) => item.count
    ),
    1
  );

  /* =========================================================
     PERCENTAGE
  ========================================================= */

  function getPercent(
    value: number,
    total: number
  ) {
    if (total <= 0) return 0;

    return Math.round(
      (value / total) * 100
    );
  }

  const approvedPercent = getPercent(
    approvedSongs,
    totalSongs
  );

  const pendingPercent = getPercent(
    pendingSongs,
    totalSongs
  );

  const rejectedPercent = getPercent(
    rejectedSongs,
    totalSongs
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading Sub Label Dashboard...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
      }}
    >
      {/* =========================
          SIDEBAR
      ========================= */}

      <aside
        style={{
          width: "250px",
          background: "#071426",
          borderRight: "1px solid #17345a",
          minHeight: "100vh",
          padding: "20px 14px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* LOGO */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 10px 25px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media"
            style={{
              width: "42px",
              height: "42px",
              objectFit: "contain",
            }}
          />

          <div>
            <div
              style={{
                fontWeight: "700",
                fontSize: "16px",
              }}
            >
              SD Media
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: "11px",
              }}
            >
              Sub Label Dashboard
            </div>
          </div>
        </div>

        {/* DASHBOARD */}

        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🏠 Dashboard
        </button>

        {/* UPLOAD SONG */}

        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/upload"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🎵 Upload Song
        </button>

        {/* MY SONGS */}

        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/my-songs"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🎶 My Songs
        </button>

        {/* ARTISTS */}

        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/artists"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          👤 Artists
        </button>

        {/* PROFILE */}

        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/profile"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ⚙️ Profile
        </button>

        {/* CUSTOMER DASHBOARD */}

        {role === "customer" && (
          <button
            onClick={() =>
              router.push(
                "/customer-dashboard"
              )
            }
            style={{
              width: "100%",
              padding: "12px 14px",
              marginBottom: "6px",
              border: "none",
              borderRadius: "8px",
              background: "transparent",
              color: "#cbd5e1",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            👑 Customer Dashboard
          </button>
        )}

        {/* LOGOUT */}

        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: "12px 14px",
            marginTop: "25px",
            border: "1px solid #374151",
            borderRadius: "8px",
            background: "#111827",
            color: "#f87171",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🚪 Logout
        </button>
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main
        style={{
          marginLeft: "250px",
          width: "calc(100% - 250px)",
          padding: "30px",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Sub Label Dashboard
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "6px",
            }}
          >
            Manage your music and sub label account.
          </p>
        </div>

        {/* =========================
            SELECTED SUB LABEL
        ========================= */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #071b36 0%, #081a32 100%)",
            border: "1px solid #164b82",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "20px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              color: "#93c5fd",
              fontSize: "13px",
              marginBottom: "7px",
            }}
          >
            Selected Sub Label
          </div>

          {selectedSubLabel ? (
            <>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {selectedSubLabel.sub_label_name}
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  marginTop: "5px",
                }}
              >
                {selectedSubLabel.email}
              </div>
            </>
          ) : (
            <div
              style={{
                color: "#94a3b8",
              }}
            >
              No Sub Label found.
            </div>
          )}

          {role === "customer" &&
            subLabels.length > 0 && (
              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "13px",
                    marginBottom: "7px",
                  }}
                >
                  Select Sub Label
                </label>

                <select
                  value={
                    selectedSubLabel?.id || ""
                  }
                  onChange={(e) =>
                    handleSubLabelChange(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    maxWidth: "450px",
                    padding: "12px",
                    borderRadius: "8px",
                    border:
                      "1px solid #374151",
                    background: "#020617",
                    color: "white",
                    outline: "none",
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
        </div>

        {/* =========================
            TOP STATS
        ========================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              title: "Total Songs",
              value: String(totalSongs),
              icon: "🎵",
              color: "#60a5fa",
            },
            {
              title: "Approved",
              value: String(
                approvedSongs
              ),
              icon: "✓",
              color: "#22c55e",
            },
            {
              title: "Pending",
              value: String(
                pendingSongs
              ),
              icon: "◷",
              color: "#facc15",
            },
            {
              title: "Rejected",
              value: String(
                rejectedSongs
              ),
              icon: "×",
              color: "#ef4444",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background:
                  "linear-gradient(135deg, #071b36 0%, #081a32 100%)",
                border:
                  "1px solid #164b82",
                borderRadius: "12px",
                padding: "18px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: `${item.color}22`,
                  border: `1px solid ${item.color}55`,
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color: item.color,
                  fontSize: "20px",
                  fontWeight: "700",
                }}
              >
                {item.icon}
              </div>

              <div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "13px",
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    fontSize: "27px",
                    fontWeight: "700",
                    marginTop: "3px",
                  }}
                >
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* =====================================================
            CONTENT ANALYTICS
        ===================================================== */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #071a34 0%, #06162c 100%)",
            border: "1px solid #164b82",
            borderRadius: "15px",
            padding: "18px",
            marginBottom: "20px",
          }}
        >
          {/* ANALYTICS HEADER */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background:
                      "#2563eb22",
                    border:
                      "1px solid #2563eb55",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize: "18px",
                  }}
                >
                  📊
                </div>

                <h2
                  style={{
                    fontSize: "20px",
                    margin: 0,
                  }}
                >
                  Content Analytics
                </h2>
              </div>

              <p
                style={{
                  color: "#94a3b8",
                  margin:
                    "5px 0 0 48px",
                  fontSize: "13px",
                }}
              >
                Overview of your music distribution
              </p>
            </div>

            <div
              style={{
                border:
                  "1px solid #244a76",
                borderRadius: "8px",
                padding: "9px 13px",
                color: "#cbd5e1",
                fontSize: "13px",
                background: "#081a31",
              }}
            >
              📅 Last 7 Days
            </div>
          </div>

          {/* =========================
              CHART ROW
          ========================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(330px, 1.7fr) minmax(240px, 1fr) minmax(240px, 1fr)",
              gap: "14px",
            }}
          >
            {/* DAILY UPLOADS */}

            <div
              style={{
                background: "#06172d",
                border:
                  "1px solid #173b65",
                borderRadius: "12px",
                padding: "16px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  marginBottom: "5px",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                  }}
                >
                  📈
                </span>

                <div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "15px",
                    }}
                  >
                    Daily Uploads
                  </div>

                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "12px",
                    }}
                  >
                    Last 7 days uploads
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                <svg
                  viewBox="0 0 700 250"
                  width="100%"
                  height="230"
                  preserveAspectRatio="none"
                >
                  {/* GRID */}

                  {[35, 80, 125, 170, 215].map(
                    (y) => (
                      <line
                        key={y}
                        x1="45"
                        y1={y}
                        x2="680"
                        y2={y}
                        stroke="#183657"
                        strokeWidth="1"
                        strokeDasharray="5 5"
                      />
                    )
                  )}

                  {/* LINE */}

                  <polyline
                    points={dailyData
                      .map(
                        (item, index) => {
                          const x =
                            45 +
                            index *
                              (635 / 6);

                          const y =
                            215 -
                            (item.count /
                              maxDailyCount) *
                              170;

                          return `${x},${y}`;
                        }
                      )
                      .join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* POINTS */}

                  {dailyData.map(
                    (item, index) => {
                      const x =
                        45 +
                        index *
                          (635 / 6);

                      const y =
                        215 -
                        (item.count /
                          maxDailyCount) *
                          170;

                      return (
                        <circle
                          key={index}
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#3b82f6"
                        />
                      );
                    }
                  )}

                  <text
                    x="15"
                    y="220"
                    fill="#64748b"
                    fontSize="12"
                  >
                    0
                  </text>

                  {/* DATE LABELS */}

                  {dailyData.map(
                    (item, index) => {
                      const x =
                        45 +
                        index *
                          (635 / 6);

                      return (
                        <text
                          key={index}
                          x={x}
                          y="242"
                          fill="#64748b"
                          fontSize="10"
                          textAnchor="middle"
                        >
                          {item.date.toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                            }
                          )}
                        </text>
                      );
                    }
                  )}
                </svg>
              </div>

              <div
                style={{
                  textAlign: "center",
                  color:
                    totalSongs === 0
                      ? "#64748b"
                      : "#93c5fd",
                  fontSize: "11px",
                  marginTop: "-8px",
                }}
              >
                {weeklySongs.length === 0
                  ? "No upload data available yet"
                  : `${weeklySongs.length} upload(s) in last 7 days`}
              </div>
            </div>

            {/* TODAY */}

            <AnalyticsPieCard
              title="Today's Uploads"
              subtitle={`Approved ${getPercent(
                todaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "approved"
                ).length,
                todaySongs.length
              )}%`}
              total={todaySongs.length}
              approved={
                todaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "approved"
                ).length
              }
              pending={
                todaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "pending"
                ).length
              }
              rejected={
                todaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "rejected"
                ).length
              }
            />

            {/* YESTERDAY */}

            <AnalyticsPieCard
              title="Yesterday's Uploads"
              subtitle={`Approved ${getPercent(
                yesterdaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "approved"
                ).length,
                yesterdaySongs.length
              )}%`}
              total={
                yesterdaySongs.length
              }
              approved={
                yesterdaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "approved"
                ).length
              }
              pending={
                yesterdaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "pending"
                ).length
              }
              rejected={
                yesterdaySongs.filter(
                  (song) =>
                    (
                      song.status ||
                      ""
                    ).toLowerCase() ===
                    "rejected"
                ).length
              }
            />
          </div>

          {/* =========================
              SUMMARY CARDS
          ========================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginTop: "14px",
            }}
          >
            <SummaryCard
              icon="📅"
              title="Weekly Uploads"
              value={String(
                weeklySongs.length
              )}
              note="Last 7 days"
            />

            <SummaryCard
              icon="🗓️"
              title="Yearly Uploads"
              value={String(
                yearlySongs.length
              )}
              note="Current year"
            />

            <SummaryCard
              icon="🗄️"
              title="All-Time Uploads"
              value={String(
                totalSongs
              )}
              note="All uploaded songs"
            />
          </div>

          {/* =========================
              CONTENT SUMMARY
          ========================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginTop: "14px",
            }}
          >
            <InfoAnalyticsCard
              icon="🎵"
              title="Total Content"
              value={String(
                totalSongs
              )}
            />

            <InfoAnalyticsCard
              icon="💿"
              title="Music Releases"
              value={String(
                totalAlbums
              )}
            />

            <InfoAnalyticsCard
              icon="👤"
              title="Artists"
              value={String(
                totalArtists
              )}
            />
          </div>
        </div>

        {/* =====================================================
            DAILY REPORT + STATUS DISTRIBUTION
        ===================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(420px, 1.7fr) minmax(300px, 1fr)",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          {/* DAILY REPORT */}

          <div
            style={{
              background:
                "linear-gradient(135deg, #071a34 0%, #06162c 100%)",
              border:
                "1px solid #164b82",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "16px",
                    margin: 0,
                  }}
                >
                  DAILY REPORT - TOTAL UPLOADS
                </h2>

                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "12px",
                    margin:
                      "5px 0 0",
                  }}
                >
                  Music analytics trend with dynamic period grouping
                </p>
              </div>

              <div
                style={{
                  border:
                    "1px solid #214a7a",
                  borderRadius: "7px",
                  padding:
                    "8px 10px",
                  fontSize: "11px",
                  color: "#93c5fd",
                  background:
                    "#0a2342",
                }}
              >
                📅{" "}
                {dailyData[0]?.date.toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                  }
                )}{" "}
                -{" "}
                {dailyData[
                  dailyData.length - 1
                ]?.date.toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                  }
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "18px",
                width: "100%",
                overflow: "hidden",
              }}
            >
              <svg
                viewBox="0 0 800 260"
                width="100%"
                height="250"
                preserveAspectRatio="none"
              >
                {/* GRID */}

                {[35, 80, 125, 170, 215].map(
                  (y) => (
                    <line
                      key={y}
                      x1="40"
                      y1={y}
                      x2="775"
                      y2={y}
                      stroke="#183657"
                      strokeWidth="1"
                      strokeDasharray="5 5"
                    />
                  )
                )}

                {/* LINE */}

                <polyline
                  points={dailyData
                    .map(
                      (item, index) => {
                        const x =
                          40 +
                          index *
                            (735 / 6);

                        const y =
                          215 -
                          (item.count /
                            maxDailyCount) *
                            170;

                        return `${x},${y}`;
                      }
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* POINTS */}

                {dailyData.map(
                  (item, index) => {
                    const x =
                      40 +
                      index *
                        (735 / 6);

                    const y =
                      215 -
                      (item.count /
                        maxDailyCount) *
                        170;

                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#3b82f6"
                      />
                    );
                  }
                )}

                <text
                  x="10"
                  y="220"
                  fill="#64748b"
                  fontSize="11"
                >
                  0
                </text>

                {dailyData.map(
                  (item, index) => {
                    const x =
                      40 +
                      index *
                        (735 / 6);

                    return (
                      <text
                        key={index}
                        x={x}
                        y="245"
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {item.date.toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                          }
                        )}
                      </text>
                    );
                  }
                )}
              </svg>
            </div>
          </div>

          {/* STATUS DISTRIBUTION */}

          <div
            style={{
              background:
                "linear-gradient(135deg, #071a34 0%, #06162c 100%)",
              border:
                "1px solid #164b82",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                margin: 0,
              }}
            >
              STATUS DISTRIBUTION
            </h2>

            <p
              style={{
                color: "#94a3b8",
                fontSize: "12px",
                margin:
                  "5px 0 20px",
              }}
            >
              Approval vs pending vs rejected balance
            </p>

            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                gap: "25px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: "155px",
                  height: "155px",
                  borderRadius: "50%",
                  background:
                    totalSongs > 0
                      ? `conic-gradient(
                          #22c55e 0% ${approvedPercent}%,
                          #facc15 ${approvedPercent}% ${
                          approvedPercent +
                          pendingPercent
                        }%,
                          #ef4444 ${
                            approvedPercent +
                            pendingPercent
                          }% 100%
                        )`
                      : "conic-gradient(#173657 0deg 360deg)",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  position:
                    "relative",
                }}
              >
                <div
                  style={{
                    width: "105px",
                    height: "105px",
                    borderRadius: "50%",
                    background:
                      "#06162c",
                    display: "flex",
                    flexDirection:
                      "column",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "27px",
                      fontWeight: "700",
                    }}
                  >
                    {totalSongs}
                  </div>

                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "11px",
                    }}
                  >
                    Total
                  </div>
                </div>
              </div>

              <div
                style={{
                  minWidth: "150px",
                }}
              >
                <StatusRow
                  color="#22c55e"
                  label="Approved"
                  value={String(
                    approvedSongs
                  )}
                  percent={`${approvedPercent}%`}
                />

                <StatusRow
                  color="#facc15"
                  label="Pending"
                  value={String(
                    pendingSongs
                  )}
                  percent={`${pendingPercent}%`}
                />

                <StatusRow
                  color="#ef4444"
                  label="Rejected"
                  value={String(
                    rejectedSongs
                  )}
                  percent={`${rejectedPercent}%`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            ACCOUNT CARD
        ========================= */}

        <div
          style={{
            background: "#111827",
            border:
              "1px solid #1f2937",
            borderRadius: "12px",
            padding: "22px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "19px",
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Account Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Sub Label
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {selectedSubLabel?.sub_label_name ||
                  "N/A"}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Email
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {selectedSubLabel?.email ||
                  "N/A"}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Account Status
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                  color:
                    selectedSubLabel?.is_active
                      ? "#22c55e"
                      : "#ef4444",
                }}
              >
                {selectedSubLabel?.is_active
                  ? "Active"
                  : "Inactive"}
              </div>
            </div>

            {role === "customer" && (
              <div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "12px",
                  }}
                >
                  Customer
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontWeight: "600",
                  }}
                >
                  {customerName ||
                    "N/A"}
                </div>
              </div>
            )}

            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Total Artists
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {totalArtists}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Total Albums
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {totalAlbums}
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            MUSIC MANAGEMENT
        ========================= */}

        <div
          style={{
            background: "#111827",
            border:
              "1px solid #1f2937",
            borderRadius: "12px",
            padding: "22px",
          }}
        >
          <h2
            style={{
              fontSize: "19px",
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Music Management
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >
            {/* UPLOAD */}

            <div
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/upload"
                )
              }
              style={{
                border:
                  "1px solid #1f2937",
                borderRadius: "10px",
                padding: "20px",
                cursor: "pointer",
                background: "#0f172a",
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                  marginBottom: "10px",
                }}
              >
                🎵
              </div>

              <div
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                }}
              >
                Upload Song
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                Upload your new songs.
              </div>
            </div>

            {/* MY SONGS */}

            <div
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/my-songs"
                )
              }
              style={{
                border:
                  "1px solid #1f2937",
                borderRadius: "10px",
                padding: "20px",
                cursor: "pointer",
                background: "#0f172a",
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                  marginBottom: "10px",
                }}
              >
                🎶
              </div>

              <div
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                }}
              >
                My Songs
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                View and manage your songs.
              </div>
            </div>

            {/* SONG STATUS */}

            <div
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/my-songs"
                )
              }
              style={{
                border:
                  "1px solid #1f2937",
                borderRadius: "10px",
                padding: "20px",
                cursor: "pointer",
                background: "#0f172a",
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                  marginBottom: "10px",
                }}
              >
                📊
              </div>

              <div
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                }}
              >
                Song Status
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                Check approved, pending and rejected
                songs.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   PIE CHART CARD
========================================================= */

function AnalyticsPieCard({
  title,
  subtitle,
  total,
  approved,
  pending,
  rejected,
}: {
  title: string;
  subtitle: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}) {
  const safeTotal = Math.max(
    total,
    0
  );

  const approvedPercent =
    safeTotal > 0
      ? (approved / safeTotal) * 100
      : 0;

  const pendingPercent =
    safeTotal > 0
      ? (pending / safeTotal) * 100
      : 0;

  const firstEnd =
    approvedPercent;

  const secondEnd =
    approvedPercent +
    pendingPercent;

  const chart =
    safeTotal > 0
      ? `conic-gradient(
          #14b8a6 0% ${firstEnd}%,
          #facc15 ${firstEnd}% ${secondEnd}%,
          #ef4444 ${secondEnd}% 100%
        )`
      : "conic-gradient(#173657 0deg 360deg)";

  return (
    <div
      style={{
        background: "#06172d",
        border:
          "1px solid #173b65",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: "10px",
          marginBottom: "3px",
        }}
      >
        <span
          style={{
            fontSize: "18px",
          }}
        >
          ◷
        </span>

        <div>
          <div
            style={{
              fontWeight: "700",
              fontSize: "15px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          margin: "12px 0",
        }}
      >
        <div
          style={{
            width: "145px",
            height: "145px",
            borderRadius: "50%",
            background: chart,
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          <div
            style={{
              width: "93px",
              height: "93px",
              borderRadius: "50%",
              background:
                "#06172d",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              flexDirection:
                "column",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                fontWeight: "700",
              }}
            >
              {safeTotal}
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: "11px",
              }}
            >
              Total
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        <MiniStatus
          color="#14b8a6"
          label={`A: ${approved}`}
        />

        <MiniStatus
          color="#facc15"
          label={`P: ${pending}`}
        />

        <MiniStatus
          color="#ef4444"
          label={`R: ${rejected}`}
        />
      </div>
    </div>
  );
}

/* =========================================================
   MINI STATUS
========================================================= */

function MiniStatus({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div
      style={{
        borderRadius: "999px",
        padding: "5px 9px",
        fontSize: "11px",
        background: `${color}18`,
        border: `1px solid ${color}44`,
        color,
      }}
    >
      {label}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon,
  title,
  value,
  note,
}: {
  icon: string;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div
      style={{
        background: "#06172d",
        border:
          "1px solid #173b65",
        borderRadius: "12px",
        padding: "15px",
        display: "flex",
        alignItems:
          "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "43px",
          height: "43px",
          borderRadius: "10px",
          background:
            "#2563eb22",
          border:
            "1px solid #2563eb44",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontSize: "20px",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "12px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "25px",
            fontWeight: "700",
            marginTop: "2px",
          }}
        >
          {value}
        </div>

        <div
          style={{
            color: "#64748b",
            fontSize: "10px",
            marginTop: "2px",
          }}
        >
          {note}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INFO ANALYTICS CARD
========================================================= */

function InfoAnalyticsCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#06172d",
        border:
          "1px solid #173b65",
        borderRadius: "12px",
        padding: "15px",
        display: "flex",
        alignItems:
          "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "43px",
          height: "43px",
          borderRadius: "10px",
          background:
            "#2563eb22",
          border:
            "1px solid #2563eb44",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontSize: "20px",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "12px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "25px",
            fontWeight: "700",
            marginTop: "2px",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS ROW
========================================================= */

function StatusRow({
  color,
  label,
  value,
  percent,
}: {
  color: string;
  label: string;
  value: string;
  percent: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "12px 1fr auto auto",
        alignItems:
          "center",
        gap: "8px",
        marginBottom:
          "14px",
        fontSize: "12px",
      }}
    >
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: color,
          display: "block",
        }}
      />

      <span
        style={{
          color: "#cbd5e1",
        }}
      >
        {label}
      </span>

      <strong>{value}</strong>

      <span
        style={{
          color: "#64748b",
        }}
      >
        {percent}
      </span>
    </div>
  );
}