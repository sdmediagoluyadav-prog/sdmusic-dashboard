"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  album_name: string | null;
  singer_name: string | null;
  composer: string | null;
  lyricist: string | null;
  genre: string | null;
  language: string | null;
  release_date: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
  created_at?: string | null;
  cover_signed_url?: string | null;
  audio_signed_url?: string | null;
};

type SubLabel = {
  id: number;
  customer_id: number;
  sub_label_name: string;
  email: string;
  auth_user_id: string | null;
  is_active: boolean;
  created_at?: string;
};

type LoginDetails = {
  email: string;
  password: string;
};

type CopyrightRequest = {
  videoUrl: string;
  reason: string;
  details: string;
};

function StatCard({
  icon,
  title,
  value,
  subtitle,
  type,
}: {
  icon: string;
  title: string;
  value: string | number;
  subtitle: string;
  type: string;
}) {
  return (
    <div className={`stat-card ${type}`}>
      <div className="stat-icon">{icon}</div>

      <div className="stat-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);

  const [subLabels, setSubLabels] =
    useState<SubLabel[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [showSubLabelForm, setShowSubLabelForm] =
    useState(false);

  const [subLabelName, setSubLabelName] =
    useState("");

  const [subLabelEmail, setSubLabelEmail] =
    useState("");

  const [creatingSubLabel, setCreatingSubLabel] =
    useState(false);

  const [loginDetails, setLoginDetails] =
    useState<LoginDetails | null>(null);

  const [showCopyrightForm, setShowCopyrightForm] =
    useState(false);

  const [copyrightRequest, setCopyrightRequest] =
    useState<CopyrightRequest>({
      videoUrl: "",
      reason: "",
      details: "",
    });

  const [copyrightSubmitted, setCopyrightSubmitted] =
    useState(false);

  /* =====================================================
     LOAD CUSTOMER DASHBOARD
  ===================================================== */

  async function loadDashboard() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      /* CUSTOMER */

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id, customer_name, label_name"
        )
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (customerError) {
        console.error(customerError);

        alert(
          "Customer load error ❌\n\n" +
            customerError.message
        );

        return;
      }

      if (!customerData) {
        alert(
          "Customer account नहीं मिला ❌"
        );

        return;
      }

      setCustomer(customerData);

      /* =====================================================
         CUSTOMER SONG RELATION
      ===================================================== */

      const {
        data: relationData,
        error: relationError,
      } = await supabase
        .from("customer_songs")
        .select("song_id")
        .eq(
          "customer_id",
          customerData.id
        );

      if (relationError) {
        console.error(relationError);

        alert(
          "Customer songs load error ❌\n\n" +
            relationError.message
        );

        return;
      }

      const songIds =
        relationData?.map(
          (item: any) => item.song_id
        ) || [];

      if (songIds.length > 0) {
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
          .order("id", {
            ascending: false,
          });

        if (songError) {
          console.error(songError);

          alert(
            "Songs load error ❌\n\n" +
              songError.message
          );

          return;
        }

        const songsWithUrls: Song[] = [];

        for (
          const song of (songData ||
            []) as Song[]
        ) {
          let coverSignedUrl:
            | string
            | null = null;

          let audioSignedUrl:
            | string
            | null = null;

          /* COVER */

          if (song.cover_url) {
            if (
              song.cover_url.startsWith(
                "http"
              )
            ) {
              coverSignedUrl =
                song.cover_url;
            } else {
              const { data } =
                await supabase.storage
                  .from("covers")
                  .createSignedUrl(
                    song.cover_url,
                    3600
                  );

              coverSignedUrl =
                data?.signedUrl || null;
            }
          }

          /* AUDIO */

          if (song.audio_url) {
            if (
              song.audio_url.startsWith(
                "http"
              )
            ) {
              audioSignedUrl =
                song.audio_url;
            } else {
              const { data } =
                await supabase.storage
                  .from("songs")
                  .createSignedUrl(
                    song.audio_url,
                    3600
                  );

              audioSignedUrl =
                data?.signedUrl || null;
            }
          }

          songsWithUrls.push({
            ...song,
            cover_signed_url:
              coverSignedUrl,
            audio_signed_url:
              audioSignedUrl,
          });
        }

        setSongs(songsWithUrls);
      } else {
        setSongs([]);
      }

      /* =====================================================
         SUB LABELS
      ===================================================== */

      const {
        data: subLabelData,
        error: subLabelError,
      } = await supabase
        .from("sub_labels")
        .select(`
          id,
          customer_id,
          sub_label_name,
          email,
          auth_user_id,
          is_active,
          created_at
        `)
        .eq(
          "customer_id",
          customerData.id
        )
        .order("id", {
          ascending: false,
        });

      if (subLabelError) {
        console.error(
          "Sub Label Error:",
          subLabelError
        );
      } else {
        setSubLabels(
          (subLabelData ||
            []) as SubLabel[]
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "Dashboard load nahi ho paya ❌"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  /* =====================================================
     ADD SUB LABEL
  ===================================================== */

  async function addSubLabel() {
    if (!subLabelName.trim()) {
      alert(
        "Sub Label Name bharo ❌"
      );
      return;
    }

    if (!subLabelEmail.trim()) {
      alert(
        "Sub Label Email bharo ❌"
      );
      return;
    }

    setCreatingSubLabel(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert(
          "Session expire ho gaya. Dobara login karo."
        );

        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/sub-labels/create",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            subLabelName:
              subLabelName.trim(),

            email:
              subLabelEmail.trim(),
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        alert(
          result.message ||
            "Sub Label create nahi hua ❌"
        );

        return;
      }

      if (result.subLabel) {
        setSubLabels(
          (previous) => [
            result.subLabel,
            ...previous,
          ]
        );
      }

      if (result.login) {
        setLoginDetails({
          email:
            result.login.email,

          password:
            result.login.password,
        });
      }

      setSubLabelName("");
      setSubLabelEmail("");

      setShowSubLabelForm(false);

      alert(
        "Sub Label successfully create ho gaya ✅"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Sub Label create karte time error aa gaya ❌"
      );
    } finally {
      setCreatingSubLabel(false);
    }
  }

  /* =====================================================
     DELETE SUB LABEL
  ===================================================== */

  async function deleteSubLabel(
    id: number
  ) {
    const confirmDelete =
      confirm(
        "Kya aap is Sub Label ko delete karna chahte hain?"
      );

    if (!confirmDelete) return;

    try {
      const { error } =
        await supabase
          .from("sub_labels")
          .delete()
          .eq("id", id);

      if (error) {
        alert(
          "Sub Label delete nahi hua ❌\n\n" +
            error.message
        );

        return;
      }

      setSubLabels(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== id
          )
      );

      alert(
        "Sub Label delete ho gaya ✅"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Delete karte time error aa gaya ❌"
      );
    }
  }

  /* =====================================================
     LOGOUT
  ===================================================== */

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  /* =====================================================
     STATS
  ===================================================== */

  const totalSongs =
    songs.length;

  const approvedSongs =
    songs.filter(
      (song) =>
        (song.status || "")
          .toLowerCase() ===
        "approved"
    ).length;

  const pendingSongs =
    songs.filter(
      (song) =>
        (song.status || "")
          .toLowerCase() ===
        "pending"
    ).length;

  const rejectedSongs =
    songs.filter(
      (song) =>
        (song.status || "")
          .toLowerCase() ===
        "rejected"
    ).length;

  const totalArtists =
    new Set(
      songs
        .map(
          (song) =>
            song.artist_name
        )
        .filter(Boolean)
    ).size;

  const totalAlbums =
    new Set(
      songs
        .map(
          (song) =>
            song.album_name
        )
        .filter(Boolean)
    ).size;

  /* =====================================================
     STATUS %
  ===================================================== */

  const statusTotal =
    approvedSongs +
    pendingSongs +
    rejectedSongs;

  const approvedPercent =
    statusTotal > 0
      ? Math.round(
          (approvedSongs /
            statusTotal) *
            100
        )
      : 0;

  const pendingPercent =
    statusTotal > 0
      ? Math.round(
          (pendingSongs /
            statusTotal) *
            100
        )
      : 0;

  const rejectedPercent =
    statusTotal > 0
      ? Math.round(
          (rejectedSongs /
            statusTotal) *
            100
        )
      : 0;

  /* =====================================================
     ARTISTS
  ===================================================== */

  const artistStats =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >();

      songs.forEach(
        (song) => {
          const name =
            song.artist_name ||
            "Unknown Artist";

          map.set(
            name,
            (map.get(name) ||
              0) + 1
          );
        }
      );

      return Array.from(
        map.entries()
      )
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        )
        .slice(0, 5);
    }, [songs]);

  /* =====================================================
     RECENT SONGS
  ===================================================== */

  const recentSongs =
    songs.slice(0, 5);

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredSongs =
    songs.filter(
      (song) => {
        const query =
          search
            .toLowerCase()
            .trim();

        const matchesSearch =
          !query ||
          song.song_title
            ?.toLowerCase()
            .includes(query) ||
          song.artist_name
            ?.toLowerCase()
            .includes(query) ||
          song.album_name
            ?.toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter ===
            "All" ||
          (song.status || "")
            .toLowerCase() ===
            statusFilter.toLowerCase();

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  /* =====================================================
     LAST 7 DAYS
  ===================================================== */

  const last7Days =
    useMemo(() => {
      const result: {
        label: string;
        count: number;
      }[] = [];

      const today =
        new Date();

      for (
        let i = 6;
        i >= 0;
        i--
      ) {
        const date =
          new Date(
            today
          );

        date.setDate(
          today.getDate() -
            i
        );

        const start =
          new Date(
            date
          );

        start.setHours(
          0,
          0,
          0,
          0
        );

        const end =
          new Date(
            date
          );

        end.setHours(
          23,
          59,
          59,
          999
        );

        const count =
          songs.filter(
            (song) => {
              if (
                !song.created_at
              )
                return false;

              const created =
                new Date(
                  song.created_at
                );

              return (
                created >=
                  start &&
                created <=
                  end
              );
            }
          ).length;

        result.push({
          label:
            date.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
              }
            ),
          count,
        });
      }

      return result;
    }, [songs]);

  const maxDailyUploads =
    Math.max(
      1,
      ...last7Days.map(
        (item) =>
          item.count
      )
    );

  /* =====================================================
     TODAY / YESTERDAY
  ===================================================== */

  const todayUploads =
    last7Days[6]?.count ||
    0;

  const yesterdayUploads =
    last7Days[5]?.count ||
    0;

  /* =====================================================
     COPYRIGHT FORM
  ===================================================== */

  function submitCopyrightRequest(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      !copyrightRequest.videoUrl.trim()
    ) {
      alert(
        "YouTube Video URL डालें ❌"
      );

      return;
    }

    if (
      !copyrightRequest.reason.trim()
    ) {
      alert(
        "Copyright issue का reason डालें ❌"
      );

      return;
    }

    setCopyrightSubmitted(
      true
    );

    alert(
      "Copyright request details submit हो गए ✅\n\nBackend request system हम अगले step में connect करेंगे."
    );
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-box">
          <div className="spinner"></div>

          <h2>
            Loading Customer Dashboard...
          </h2>

          <p>
            Please wait...
          </p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background: #020b18;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial,
              Helvetica,
              sans-serif;
          }

          .loading-box {
            text-align: center;
            padding: 40px;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid
              #17355c;
            border-top-color:
              #2f80ff;
            border-radius: 50%;
            margin: 0 auto 20px;
            animation: spin
              0.8s linear infinite;
          }

          h2 {
            margin: 0 0 8px;
          }

          p {
            color: #7893b5;
          }

          @keyframes spin {
            to {
              transform: rotate(
                360deg
              );
            }
          }
        `}</style>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="empty-page">
        <div className="empty-box">
          <h2>
            Customer account नहीं मिला ❌
          </h2>

          <button
            onClick={() =>
              router.replace(
                "/login"
              )
            }
          >
            Go To Login
          </button>
        </div>

        <style jsx>{`
          .empty-page {
            min-height: 100vh;
            background: #020b18;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .empty-box {
            background: #071a31;
            border: 1px solid
              #174a80;
            padding: 40px;
            border-radius: 18px;
            color: white;
            text-align: center;
          }

          button {
            margin-top: 20px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            background: #216ff3;
            color: white;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="sidebar">

          <div className="brand">
            <img
              src="/sd-logo.png"
              alt="SD Media"
            />

            <div>
              <strong>
                SD Media
              </strong>

              <span>
                Customer Dashboard
              </span>
            </div>
          </div>

          <div className="welcome-user">
            <div className="big-avatar">
              {customer.customer_name
                ?.charAt(0)
                ?.toUpperCase()}
            </div>

            <div>
              <small>
                Welcome
              </small>

              <strong>
                {customer.customer_name}
              </strong>

              <span>
                Customer
              </span>
            </div>
          </div>

          <div className="menu-label">
            MAIN MENU
          </div>

          <nav className="menu">

            <button
              className="menu-item active"
              onClick={() =>
                router.push(
                  "/customer-dashboard"
                )
              }
            >
              <span>🏠</span>
              Dashboard
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/upload"
                )
              }
            >
              <span>⬆️</span>
              Upload Song
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/my-songs"
                )
              }
            >
              <span>🎵</span>
              My Songs
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/artists"
                )
              }
            >
              <span>👥</span>
              Artists
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/royalty"
                )
              }
            >
              <span>₹</span>
              Royalty
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/sub-labels"
                )
              }
            >
              <span>🏷️</span>
              Sub Labels
            </button>

            <button
              className="menu-item copyright-menu"
              onClick={() => {
                document
                  .getElementById(
                    "youtube-copyright"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  });
              }}
            >
              <span>©️</span>
              YouTube Copyright
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/profile"
                )
              }
            >
              <span>⚙️</span>
              Profile
            </button>

          </nav>

          <div className="sidebar-bottom">
            <button
              className="logout-button"
              onClick={logout}
            >
              <span>🚪</span>
              Logout
            </button>
          </div>

        </aside>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="main">

          {/* HEADER */}

          <header className="header">

            <div>
              <h1>
                Customer Dashboard
              </h1>

              <p>
                Overview of your music
                distribution & performance
              </p>
            </div>

            <div className="header-user">

              <div className="notification">
                🔔
              </div>

              <div className="avatar">
                {customer.customer_name
                  ?.charAt(0)
                  ?.toUpperCase()}
              </div>

              <div>
                <strong>
                  {customer.customer_name}
                </strong>

                <span>
                  {customer.label_name ||
                    "Customer"}
                </span>
              </div>

            </div>

          </header>

          <div className="content">

            {/* =================================================
                STATS
            ================================================= */}

            <section className="stats-grid">

              <StatCard
                icon="🎵"
                title="Total Songs"
                value={
                  totalSongs
                }
                subtitle={
                  `${todayUploads} uploaded today`
                }
                type="blue"
              />

              <StatCard
                icon="🏷️"
                title="Total Sub Labels"
                value={
                  subLabels.length
                }
                subtitle={
                  `${
                    subLabels.filter(
                      (item) =>
                        item.is_active
                    ).length
                  } active`
                }
                type="purple"
              />

              <StatCard
                icon="👥"
                title="Total Artists"
                value={
                  totalArtists
                }
                subtitle="Your music artists"
                type="cyan"
              />

              <StatCard
                icon="✓"
                title="Approved Songs"
                value={
                  approvedSongs
                }
                subtitle={
                  `${approvedPercent}% of songs`
                }
                type="green"
              />

              <StatCard
                icon="◷"
                title="Pending Songs"
                value={
                  pendingSongs
                }
                subtitle={
                  `${pendingPercent}% of songs`
                }
                type="yellow"
              />

              <StatCard
                icon="✕"
                title="Rejected Songs"
                value={
                  rejectedSongs
                }
                subtitle={
                  `${rejectedPercent}% of songs`
                }
                type="red"
              />

            </section>

            {/* =================================================
                CONTENT ANALYTICS
            ================================================= */}

            <section className="analytics-section">

              <div className="section-title">

                <div>
                  <h2>
                    Content Analytics
                  </h2>

                  <p>
                    Overview of your music
                    distribution
                  </p>
                </div>

                <button className="period-button">
                  📅 Last 7 Days
                </button>

              </div>

              <div className="analytics-grid">

                {/* DAILY UPLOADS */}

                <div className="panel daily-panel">

                  <div className="panel-heading">

                    <div>
                      <h3>
                        📈 Song Upload Trend
                      </h3>

                      <p>
                        Total songs uploaded
                        in last 7 days
                      </p>
                    </div>

                    <strong>
                      {todayUploads}
                    </strong>

                  </div>

                  <div className="line-chart">

                    <div className="chart-grid-lines">
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>

                    <svg
                      viewBox="0 0 700 250"
                      preserveAspectRatio="none"
                    >

                      <polyline
                        points={last7Days
                          .map(
                            (
                              item,
                              index
                            ) => {
                              const x =
                                index *
                                  116 +
                                5;

                              const y =
                                215 -
                                (item.count /
                                  maxDailyUploads) *
                                  175;

                              return `${x},${y}`;
                            }
                          )
                          .join(
                            " "
                          )}
                        fill="none"
                        stroke="#2581ff"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {last7Days.map(
                        (
                          item,
                          index
                        ) => {
                          const x =
                            index *
                              116 +
                            5;

                          const y =
                            215 -
                            (item.count /
                              maxDailyUploads) *
                              175;

                          return (
                            <circle
                              key={
                                index
                              }
                              cx={
                                x
                              }
                              cy={
                                y
                              }
                              r="6"
                              fill="#2581ff"
                            />
                          );
                        }
                      )}

                    </svg>

                    <div className="chart-labels">

                      {last7Days.map(
                        (
                          item
                        ) => (
                          <span
                            key={
                              item.label
                            }
                          >
                            {
                              item.label
                            }
                          </span>
                        )
                      )}

                    </div>

                  </div>

                  <div className="chart-footer">
                    <span>
                      {last7Days.reduce(
                        (
                          total,
                          item
                        ) =>
                          total +
                          item.count,
                        0
                      )}{" "}
                      upload(s) in
                      last 7 days
                    </span>
                  </div>

                </div>

                {/* STATUS */}

                <div className="panel">

                  <div className="panel-heading">

                    <div>
                      <h3>
                        📊 Song Status
                      </h3>

                      <p>
                        Overall song status
                      </p>
                    </div>

                  </div>

                  <div className="donut-area">

                    <div
                      className="donut"
                      style={
                        {
                          background:
                            `conic-gradient(
                              #12d6a0 0% ${approvedPercent}%,
                              #ffc928 ${approvedPercent}% ${
                                approvedPercent +
                                pendingPercent
                              }%,
                              #ff4d57 ${
                                approvedPercent +
                                pendingPercent
                              }% 100%
                            )`,
                        } as CSSProperties
                      }
                    >

                      <div className="donut-center">
                        <strong>
                          {
                            totalSongs
                          }
                        </strong>

                        <span>
                          Total Songs
                        </span>
                      </div>

                    </div>

                    <div className="donut-legend">

                      <div>
                        <i className="dot approved"></i>

                        <span>
                          Approved
                        </span>

                        <strong>
                          {
                            approvedSongs
                          }
                        </strong>

                        <small>
                          {
                            approvedPercent
                          }
                          %
                        </small>
                      </div>

                      <div>
                        <i className="dot pending"></i>

                        <span>
                          Pending
                        </span>

                        <strong>
                          {
                            pendingSongs
                          }
                        </strong>

                        <small>
                          {
                            pendingPercent
                          }
                          %
                        </small>
                      </div>

                      <div>
                        <i className="dot rejected"></i>

                        <span>
                          Rejected
                        </span>

                        <strong>
                          {
                            rejectedSongs
                          }
                        </strong>

                        <small>
                          {
                            rejectedPercent
                          }
                          %
                        </small>
                      </div>

                    </div>

                  </div>

                </div>

                {/* SUB LABEL DISTRIBUTION */}

                <div className="panel">

                  <div className="panel-heading">

                    <div>
                      <h3>
                        🏷️ Sub Label Distribution
                      </h3>

                      <p>
                        Your sub labels
                        and their status
                      </p>
                    </div>

                  </div>

                  <div className="sub-label-donut">

                    <div className="simple-donut">

                      <div>
                        <strong>
                          {
                            subLabels.length
                          }
                        </strong>

                        <span>
                          Total
                        </span>
                      </div>

                    </div>

                    <div className="sub-legend">

                      <div>
                        <i className="dot approved"></i>

                        <span>
                          Active
                        </span>

                        <strong>
                          {
                            subLabels.filter(
                              (
                                item
                              ) =>
                                item.is_active
                            ).length
                          }
                        </strong>
                      </div>

                      <div>
                        <i className="dot inactive"></i>

                        <span>
                          Inactive
                        </span>

                        <strong>
                          {
                            subLabels.filter(
                              (
                                item
                              ) =>
                                !item.is_active
                            ).length
                          }
                        </strong>
                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* MINI CARDS */}

              <div className="mini-grid">

                <div className="mini-card">
                  <span>📅</span>

                  <div>
                    <small>
                      Weekly Uploads
                    </small>

                    <strong>
                      {
                        last7Days.reduce(
                          (
                            total,
                            item
                          ) =>
                            total +
                            item.count,
                          0
                        )
                      }
                    </strong>

                    <em>
                      Last 7 days
                    </em>
                  </div>
                </div>

                <div className="mini-card">
                  <span>📆</span>

                  <div>
                    <small>
                      Today's Uploads
                    </small>

                    <strong>
                      {
                        todayUploads
                      }
                    </strong>

                    <em>
                      Today
                    </em>
                  </div>
                </div>

                <div className="mini-card">
                  <span>📅</span>

                  <div>
                    <small>
                      Yesterday
                    </small>

                    <strong>
                      {
                        yesterdayUploads
                      }
                    </strong>

                    <em>
                      Yesterday
                    </em>
                  </div>
                </div>

              </div>

            </section>

            {/* =================================================
                RECENT SONGS
            ================================================= */}

            <section className="three-column">

              <div className="panel recent-panel">

                <div className="panel-heading">

                  <div>
                    <h3>
                      🎵 Recent Songs
                    </h3>

                    <p>
                      Latest uploaded
                      songs
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/customer-dashboard/my-songs"
                      )
                    }
                  >
                    View All →
                  </button>

                </div>

                {recentSongs.length ===
                0 ? (
                  <div className="empty-data">
                    No songs found.
                  </div>
                ) : (
                  <div className="recent-list">

                    {recentSongs.map(
                      (song) => (
                        <div
                          className="recent-row"
                          key={
                            song.id
                          }
                        >

                          {song.cover_signed_url ? (
                            <img
                              src={
                                song.cover_signed_url
                              }
                              alt={
                                song.song_title
                              }
                            />
                          ) : (
                            <div className="cover-placeholder">
                              🎵
                            </div>
                          )}

                          <div className="recent-info">

                            <strong>
                              {
                                song.song_title
                              }
                            </strong>

                            <span>
                              {
                                song.artist_name
                              }
                            </span>

                          </div>

                          <span
                            className={`status-badge ${
                              (
                                song.status ||
                                "Pending"
                              )
                                .toLowerCase()
                            }`}
                          >
                            {
                              song.status ||
                              "Pending"
                            }
                          </span>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

              {/* =================================================
                  TOP ARTISTS
              ================================================= */}

              <div className="panel">

                <div className="panel-heading">

                  <div>
                    <h3>
                      👥 Top Artists
                    </h3>

                    <p>
                      Most active artists
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/customer-dashboard/artists"
                      )
                    }
                  >
                    View All →
                  </button>

                </div>

                <div className="artist-list">

                  {artistStats.length ===
                  0 ? (
                    <div className="empty-data">
                      No artists found.
                    </div>
                  ) : (
                    artistStats.map(
                      (
                        artist,
                        index
                      ) => (
                        <div
                          className="artist-row"
                          key={
                            artist.name
                          }
                        >

                          <div className="artist-rank">
                            {index +
                              1}
                          </div>

                          <div className="artist-avatar">
                            {artist.name
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <div className="artist-name">
                            <strong>
                              {
                                artist.name
                              }
                            </strong>

                            <span>
                              Artist
                            </span>
                          </div>

                          <strong className="artist-count">
                            {
                              artist.count
                            }
                          </strong>

                        </div>
                      )
                    )
                  )}

                </div>

              </div>

              {/* =================================================
                  SUB LABELS
              ================================================= */}

              <div className="panel">

                <div className="panel-heading">

                  <div>
                    <h3>
                      🏷️ Recent Sub Labels
                    </h3>

                    <p>
                      Your sub labels
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/customer-dashboard/sub-labels"
                      )
                    }
                  >
                    View All →
                  </button>

                </div>

                <div className="sub-label-list">

                  {subLabels.length ===
                  0 ? (
                    <div className="empty-data">
                      No sub labels found.
                    </div>
                  ) : (
                    subLabels
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          label
                        ) => (
                          <div
                            className="sub-label-row"
                            key={
                              label.id
                            }
                          >

                            <div>
                              <strong>
                                {
                                  label.sub_label_name
                                }
                              </strong>

                              <span>
                                {
                                  label.email
                                }
                              </span>
                            </div>

                            <span
                              className={
                                label.is_active
                                  ? "active-badge"
                                  : "inactive-badge"
                              }
                            >
                              {label.is_active
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </div>
                        )
                      )
                  )}

                </div>

              </div>

            </section>

            {/* =================================================
                MONTHLY PERFORMANCE
            ================================================= */}

            <section className="panel performance-panel">

              <div className="panel-heading">

                <div>
                  <h3>
                    📊 Monthly Performance
                  </h3>

                  <p>
                    Your upload and
                    approval status
                  </p>
                </div>

                <div className="chart-key">

                  <span>
                    <i className="blue-dot"></i>
                    Total Uploads
                  </span>

                  <span>
                    <i className="green-dot"></i>
                    Approved
                  </span>

                  <span>
                    <i className="yellow-dot"></i>
                    Pending
                  </span>

                  <span>
                    <i className="red-dot"></i>
                    Rejected
                  </span>

                </div>

              </div>

              <div className="performance-chart">

                <div className="performance-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div className="performance-bars">

                  {[
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                  ].map(
                    (
                      month,
                      index
                    ) => {
                      const total =
                        Math.max(
                          1,
                          Math.round(
                            totalSongs *
                              ((index +
                                2) /
                                7)
                          )
                        );

                      const height =
                        Math.min(
                          100,
                          total *
                            18
                        );

                      return (
                        <div
                          className="bar-group"
                          key={
                            month
                          }
                        >

                          <div className="bar-area">

                            <div
                              className="bar total"
                              style={{
                                height: `${height}%`,
                              }}
                            ></div>

                            <div
                              className="bar approved-bar"
                              style={{
                                height: `${
                                  Math.min(
                                    100,
                                    height *
                                      (approvedPercent /
                                        100)
                                  )
                                }%`,
                              }}
                            ></div>

                            <div
                              className="bar pending-bar"
                              style={{
                                height: `${
                                  Math.min(
                                    100,
                                    height *
                                      (pendingPercent /
                                        100)
                                  )
                                }%`,
                              }}
                            ></div>

                            <div
                              className="bar rejected-bar"
                              style={{
                                height: `${
                                  Math.min(
                                    100,
                                    height *
                                      (rejectedPercent /
                                        100)
                                  )
                                }%`,
                              }}
                            ></div>

                          </div>

                          <span>
                            {
                              month
                            }
                          </span>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

            </section>

            {/* =================================================
                YOUTUBE COPYRIGHT
            ================================================= */}

            <section
              id="youtube-copyright"
              className="copyright-section"
            >

              <div className="copyright-header">

                <div className="copyright-icon">
                  ©️
                </div>

                <div>
                  <h2>
                    YouTube Copyright
                  </h2>

                  <p>
                    Submit a legitimate
                    copyright / rights-management
                    request for your content.
                  </p>
                </div>

                <span className="copyright-status">
                  Copyright Support
                </span>

              </div>

              <div className="copyright-body">

                <div className="copyright-info">

                  <div className="info-box">
                    <strong>
                      📺 YouTube Video
                    </strong>

                    <span>
                      Submit the URL of the
                      video related to your
                      copyright issue.
                    </span>
                  </div>

                  <div className="info-box">
                    <strong>
                      📋 Issue Details
                    </strong>

                    <span>
                      Explain why you own or
                      control the relevant
                      rights.
                    </span>
                  </div>

                  <div className="info-box">
                    <strong>
                      🔎 Review
                    </strong>

                    <span>
                      Your request can be
                      reviewed before any
                      action is taken.
                    </span>
                  </div>

                </div>

                <button
                  className="copyright-button"
                  onClick={() =>
                    setShowCopyrightForm(
                      !showCopyrightForm
                    )
                  }
                >
                  {showCopyrightForm
                    ? "✕ Close Request"
                    : "＋ Submit Copyright Request"}
                </button>

              </div>

              {showCopyrightForm && (
                <form
                  className="copyright-form"
                  onSubmit={
                    submitCopyrightRequest
                  }
                >

                  <div className="form-title">
                    <h3>
                      Submit Copyright Request
                    </h3>

                    <p>
                      Provide accurate
                      information about your
                      rights and the affected
                      content.
                    </p>
                  </div>

                  <label>
                    YouTube Video URL

                    <input
                      type="url"
                      value={
                        copyrightRequest.videoUrl
                      }
                      onChange={(e) =>
                        setCopyrightRequest(
                          (
                            previous
                          ) => ({
                            ...previous,
                            videoUrl:
                              e.target
                                .value,
                          })
                        )
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </label>

                  <label>
                    Copyright Issue

                    <select
                      value={
                        copyrightRequest.reason
                      }
                      onChange={(e) =>
                        setCopyrightRequest(
                          (
                            previous
                          ) => ({
                            ...previous,
                            reason:
                              e.target
                                .value,
                          })
                        )
                      }
                      required
                    >
                      <option value="">
                        Select issue
                      </option>

                      <option value="My original content was uploaded without permission">
                        My original content was
                        uploaded without
                        permission
                      </option>

                      <option value="Unauthorized use of my music">
                        Unauthorized use of
                        my music
                      </option>

                      <option value="Unauthorized use of my video">
                        Unauthorized use of
                        my video
                      </option>

                      <option value="Other legitimate copyright issue">
                        Other legitimate
                        copyright issue
                      </option>
                    </select>
                  </label>

                  <label>
                    Details

                    <textarea
                      value={
                        copyrightRequest.details
                      }
                      onChange={(e) =>
                        setCopyrightRequest(
                          (
                            previous
                          ) => ({
                            ...previous,
                            details:
                              e.target
                                .value,
                          })
                        )
                      }
                      placeholder="Explain the copyright issue and your rights..."
                      rows={5}
                      required
                    />
                  </label>

                  <div className="copyright-note">
                    ⚠️ Only submit accurate
                    information for content
                    where you have the relevant
                    rights or authorization.
                  </div>

                  <button
                    type="submit"
                    className="submit-copyright"
                  >
                    Submit Request
                  </button>

                  {copyrightSubmitted && (
                    <div className="submitted-message">
                      ✅ Request details
                      submitted successfully.
                      Backend request tracking
                      will be connected separately.
                    </div>
                  )}

                </form>
              )}

            </section>

            {/* =================================================
                MY SONGS
            ================================================= */}

            <section className="panel songs-panel">

              <div className="panel-heading">

                <div>
                  <h3>
                    🎵 My Songs
                  </h3>

                  <p>
                    Manage your uploaded
                    music
                  </p>
                </div>

                <button
                  onClick={() =>
                    router.push(
                      "/customer-dashboard/my-songs"
                    )
                  }
                >
                  View Full List →
                </button>

              </div>

              <div className="song-toolbar">

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search song, artist or album..."
                />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
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

              </div>

              {filteredSongs.length ===
              0 ? (
                <div className="empty-data large-empty">
                  No songs found.
                </div>
              ) : (
                <div className="songs-table">

                  <div className="table-head">
                    <span>
                      Song
                    </span>

                    <span>
                      Artist
                    </span>

                    <span>
                      Album
                    </span>

                    <span>
                      Status
                    </span>

                    <span>
                      Action
                    </span>
                  </div>

                  {filteredSongs
                    .slice(
                      0,
                      8
                    )
                    .map(
                      (
                        song
                      ) => (
                        <div
                          className="table-row"
                          key={
                            song.id
                          }
                        >

                          <div className="song-cell">

                            {song.cover_signed_url ? (
                              <img
                                src={
                                  song.cover_signed_url
                                }
                                alt={
                                  song.song_title
                                }
                              />
                            ) : (
                              <div className="table-cover">
                                🎵
                              </div>
                            )}

                            <div>
                              <strong>
                                {
                                  song.song_title
                                }
                              </strong>

                              <small>
                                {
                                  song.singer_name ||
                                  song.artist_name
                                }
                              </small>
                            </div>

                          </div>

                          <span>
                            {
                              song.artist_name ||
                              "—"
                            }
                          </span>

                          <span>
                            {
                              song.album_name ||
                              "—"
                            }
                          </span>

                          <span
                            className={`status-badge ${
                              (
                                song.status ||
                                "Pending"
                              )
                                .toLowerCase()
                            }`}
                          >
                            {
                              song.status ||
                              "Pending"
                            }
                          </span>

                          <button
                            className="view-song"
                            onClick={() =>
                              router.push(
                                "/customer-dashboard/my-songs"
                              )
                            }
                          >
                            View
                          </button>

                        </div>
                      )
                    )}

                </div>
              )}

            </section>

            {/* =================================================
                SUB LABEL MANAGEMENT
            ================================================= */}

            <section className="panel sub-management">

              <div className="panel-heading">

                <div>
                  <h3>
                    🏷️ Sub Labels
                  </h3>

                  <p>
                    Manage your sub labels
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setShowSubLabelForm(
                      !showSubLabelForm
                    )
                  }
                >
                  {showSubLabelForm
                    ? "✕ Close"
                    : "＋ Add Sub Label"}
                </button>

              </div>

              {showSubLabelForm && (
                <div className="sub-form">

                  <input
                    value={
                      subLabelName
                    }
                    onChange={(e) =>
                      setSubLabelName(
                        e.target.value
                      )
                    }
                    placeholder="Sub Label Name"
                  />

                  <input
                    type="email"
                    value={
                      subLabelEmail
                    }
                    onChange={(e) =>
                      setSubLabelEmail(
                        e.target.value
                      )
                    }
                    placeholder="Sub Label Email"
                  />

                  <button
                    onClick={
                      addSubLabel
                    }
                    disabled={
                      creatingSubLabel
                    }
                  >
                    {creatingSubLabel
                      ? "Creating..."
                      : "Create Sub Label"}
                  </button>

                </div>
              )}

              {loginDetails && (
                <div className="login-details">

                  <h4>
                    Sub Label Login Details
                  </h4>

                  <p>
                    Email:
                    <strong>
                      {
                        loginDetails.email
                      }
                    </strong>
                  </p>

                  <p>
                    Password:
                    <strong>
                      {
                        loginDetails.password
                      }
                    </strong>
                  </p>

                  <button
                    onClick={() =>
                      setLoginDetails(
                        null
                      )
                    }
                  >
                    Close
                  </button>

                </div>
              )}

              {subLabels.length ===
              0 ? (
                <div className="empty-data">
                  No Sub Labels found.
                </div>
              ) : (
                <div className="management-list">

                  {subLabels.map(
                    (
                      label
                    ) => (
                      <div
                        className="management-row"
                        key={
                          label.id
                        }
                      >

                        <div className="management-icon">
                          🏷️
                        </div>

                        <div className="management-info">

                          <strong>
                            {
                              label.sub_label_name
                            }
                          </strong>

                          <span>
                            {
                              label.email
                            }
                          </span>

                        </div>

                        <span
                          className={
                            label.is_active
                              ? "active-badge"
                              : "inactive-badge"
                          }
                        >
                          {label.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>

                        <button
                          className="delete-button"
                          onClick={() =>
                            deleteSubLabel(
                              label.id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>
                    )
                  )}

                </div>
              )}

            </section>

            {/* =================================================
                PROFILE
            ================================================= */}

            <section className="profile-card">

              <div className="profile-avatar">
                {customer.customer_name
                  ?.charAt(0)
                  ?.toUpperCase()}
              </div>

              <div className="profile-content">

                <h2>
                  {customer.customer_name}
                </h2>

                <p>
                  {customer.label_name ||
                    "SD Media Customer"}
                </p>

              </div>

              <button
                onClick={() =>
                  router.push(
                    "/customer-dashboard/profile"
                  )
                }
              >
                ⚙️ View Profile
              </button>

            </section>

            <footer className="footer">
              ©{" "}
              {new Date().getFullYear()}{" "}
              SD Media Entertainment.
              All rights reserved.
            </footer>

          </div>

        </main>
      </div>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .dashboard-page {
          min-height: 100vh;
          background: #020b18;
          color: #dbeafe;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }

        /* =====================================================
           SIDEBAR
        ===================================================== */

        .sidebar {
          width: 214px;
          min-width: 214px;
          background: #031226;
          border-right: 1px solid #12365d;
          min-height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 14px;
          border-bottom: 1px solid #0d2949;
        }

        .brand img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          background: white;
          border-radius: 2px;
        }

        .brand strong {
          display: block;
          color: white;
          font-size: 16px;
        }

        .brand span {
          display: block;
          color: #7f9ab9;
          font-size: 10px;
          margin-top: 4px;
        }

        .welcome-user {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 14px;
          background: #061b34;
          border-bottom: 1px solid #0d2949;
        }

        .big-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1458b8;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
        }

        .welcome-user small {
          display: block;
          color: #7e9abb;
          font-size: 10px;
        }

        .welcome-user strong {
          display: block;
          color: white;
          font-size: 12px;
          margin-top: 2px;
        }

        .welcome-user span {
          display: block;
          color: #6e8baa;
          font-size: 10px;
          margin-top: 2px;
        }

        .menu-label {
          color: #5d7899;
          font-size: 9px;
          letter-spacing: 1px;
          padding: 18px 15px 8px;
        }

        .menu {
          padding: 0 8px;
        }

        .menu-item {
          width: 100%;
          border: none;
          background: transparent;
          color: #a9bfd8;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 11px;
          margin-bottom: 4px;
          border-radius: 7px;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
          transition: 0.2s;
        }

        .menu-item span:first-child {
          width: 22px;
          text-align: center;
          font-size: 15px;
        }

        .menu-item:hover {
          background: #092746;
          color: white;
        }

        .menu-item.active {
          background: linear-gradient(
            90deg,
            #1265ed,
            #2d74e9
          );
          color: white;
          box-shadow:
            0 8px 20px
              rgba(24, 105, 235, 0.2);
        }

        .copyright-menu {
          color: #ffc928;
        }

        .copyright-menu:hover {
          color: #ffe78a;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 10px;
          border-top: 1px solid #102b4a;
        }

        .logout-button {
          width: 100%;
          border: 1px solid #263a52;
          background: #101a2a;
          color: #ff636b;
          padding: 12px;
          border-radius: 7px;
          cursor: pointer;
          text-align: left;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        /* =====================================================
           MAIN
        ===================================================== */

        .main {
          margin-left: 214px;
          width: calc(100% - 214px);
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 70% 0%,
              rgba(
                14,
                70,
                135,
                0.16
              ),
              transparent 35%
            ),
            #020b18;
        }

        .header {
          height: 86px;
          border-bottom: 1px solid #12365d;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: #031226;
        }

        .header h1 {
          color: white;
          font-size: 20px;
          margin: 0;
        }

        .header p {
          color: #7290b2;
          font-size: 11px;
          margin: 6px 0 0;
        }

        .header-user {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .notification {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #17416d;
          background: #071b32;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 6px;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #1265ed;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .header-user strong {
          display: block;
          color: white;
          font-size: 12px;
        }

        .header-user span {
          display: block;
          color: #718cab;
          font-size: 10px;
          margin-top: 3px;
        }

        .content {
          padding: 22px 24px 40px;
        }

        /* =====================================================
           STATS
        ===================================================== */

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-card {
          min-height: 105px;
          background: #061a31;
          border: 1px solid #174674;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b2c55;
          border: 1px solid #1c5a96;
          font-size: 19px;
          flex-shrink: 0;
        }

        .stat-content span {
          display: block;
          color: #7f9bb9;
          font-size: 10px;
        }

        .stat-content strong {
          display: block;
          color: white;
          font-size: 23px;
          margin: 5px 0;
        }

        .stat-content small {
          display: block;
          color: #2bdca9;
          font-size: 9px;
        }

        .stat-card.yellow .stat-content small {
          color: #ffc928;
        }

        .stat-card.red .stat-content small {
          color: #ff6068;
        }

        .stat-card.green .stat-icon {
          border-color: #087b62;
          background: #073d35;
        }

        .stat-card.red .stat-icon {
          border-color: #7b2935;
          background: #401a27;
        }

        .stat-card.yellow .stat-icon {
          border-color: #78611d;
          background: #3d3514;
        }

        /* =====================================================
           PANELS
        ===================================================== */

        .analytics-section,
        .panel,
        .copyright-section {
          background: #04182e;
          border: 1px solid #174674;
          border-radius: 13px;
        }

        .analytics-section {
          padding: 16px;
          margin-bottom: 16px;
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .section-title h2 {
          color: white;
          font-size: 18px;
          margin: 0;
        }

        .section-title p {
          color: #7c98b7;
          font-size: 10px;
          margin: 5px 0 0;
        }

        .period-button {
          border: 1px solid #24547e;
          background: #061a30;
          color: #c7d8ec;
          padding: 9px 13px;
          border-radius: 7px;
          font-size: 10px;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns:
            2fr 1fr 1fr;
          gap: 12px;
        }

        .panel {
          padding: 14px;
        }

        .panel-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .panel-heading h3 {
          margin: 0;
          color: #eef7ff;
          font-size: 13px;
        }

        .panel-heading p {
          margin: 4px 0 0;
          color: #7894b2;
          font-size: 9px;
        }

        .panel-heading > strong {
          font-size: 23px;
          color: white;
        }

        .panel-heading button {
          border: none;
          background: transparent;
          color: #3890ff;
          font-size: 10px;
          cursor: pointer;
        }

        /* =====================================================
           LINE CHART
        ===================================================== */

        .line-chart {
          height: 235px;
          position: relative;
          padding: 12px 4px 0;
        }

        .chart-grid-lines {
          position: absolute;
          left: 0;
          right: 0;
          top: 15px;
          bottom: 34px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .chart-grid-lines span {
          border-top: 1px dashed
            #12385d;
        }

        .line-chart svg {
          width: 100%;
          height: 190px;
          position: relative;
          z-index: 2;
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          color: #63809e;
          font-size: 8px;
        }

        .chart-footer {
          border-top: 1px solid #0e3153;
          padding-top: 9px;
          margin-top: 4px;
          color: #6f8daa;
          font-size: 9px;
        }

        /* =====================================================
           DONUT
        ===================================================== */

        .donut-area {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          min-height: 220px;
        }

        .donut {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .donut-center {
          width: 92px;
          height: 92px;
          border-radius: 50%;
          background: #061a31;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-center strong {
          color: white;
          font-size: 21px;
        }

        .donut-center span {
          color: #6f8dab;
          font-size: 8px;
          margin-top: 3px;
        }

        .donut-legend {
          min-width: 115px;
        }

        .donut-legend div,
        .sub-legend div {
          display: grid;
          grid-template-columns:
            10px 1fr auto auto;
          gap: 5px;
          align-items: center;
          margin: 12px 0;
          font-size: 9px;
        }

        .donut-legend span,
        .sub-legend span {
          color: #b3c7dd;
        }

        .donut-legend strong,
        .sub-legend strong {
          color: white;
        }

        .donut-legend small {
          color: #6e8baa;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .approved {
          background: #12d6a0;
        }

        .pending {
          background: #ffc928;
        }

        .rejected {
          background: #ff4d57;
        }

        .inactive {
          background: #6e8baa;
        }

        /* =====================================================
           SUB LABEL DONUT
        ===================================================== */

        .sub-label-donut {
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .simple-donut {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background:
            conic-gradient(
              #12d6a0 0 80%,
              #34506e 80% 100%
            );
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .simple-donut > div {
          width: 92px;
          height: 92px;
          border-radius: 50%;
          background: #061a31;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .simple-donut strong {
          color: white;
          font-size: 21px;
        }

        .simple-donut span {
          color: #718da9;
          font-size: 8px;
        }

        /* =====================================================
           MINI
        ===================================================== */

        .mini-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .mini-card {
          border: 1px solid #174674;
          background: #061a31;
          border-radius: 10px;
          padding: 13px;
          display: flex;
          gap: 11px;
          align-items: center;
        }

        .mini-card > span {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #092b53;
          border: 1px solid #1b538c;
          border-radius: 8px;
        }

        .mini-card small,
        .mini-card strong,
        .mini-card em {
          display: block;
        }

        .mini-card small {
          color: #7592b0;
          font-size: 9px;
        }

        .mini-card strong {
          color: white;
          font-size: 18px;
          margin: 3px 0;
        }

        .mini-card em {
          color: #587695;
          font-size: 8px;
          font-style: normal;
        }

        /* =====================================================
           THREE COLUMNS
        ===================================================== */

        .three-column {
          display: grid;
          grid-template-columns:
            1.6fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .recent-panel {
          min-height: 300px;
        }

        .recent-list,
        .artist-list,
        .sub-label-list {
          display: flex;
          flex-direction: column;
        }

        .recent-row,
        .artist-row,
        .sub-label-row {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 0;
          border-top: 1px solid #0d3152;
        }

        .recent-row:first-child,
        .artist-row:first-child,
        .sub-label-row:first-child {
          border-top: none;
        }

        .recent-row img,
        .cover-placeholder {
          width: 37px;
          height: 37px;
          border-radius: 5px;
          object-fit: cover;
          background: #0a2a4d;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .recent-info {
          min-width: 0;
          flex: 1;
        }

        .recent-info strong {
          display: block;
          color: white;
          font-size: 10px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .recent-info span {
          display: block;
          color: #6f8baa;
          font-size: 8px;
          margin-top: 3px;
        }

        .status-badge,
        .active-badge,
        .inactive-badge {
          padding: 4px 7px;
          border-radius: 5px;
          font-size: 8px;
          white-space: nowrap;
        }

        .status-badge.approved,
        .active-badge {
          background: #063d34;
          border: 1px solid #087a63;
          color: #27e3ad;
        }

        .status-badge.pending {
          background: #413716;
          border: 1px solid #786116;
          color: #ffd13c;
        }

        .status-badge.rejected {
          background: #431b27;
          border: 1px solid #822e3b;
          color: #ff6670;
        }

        .inactive-badge {
          background: #16283b;
          border: 1px solid #36506b;
          color: #9bb0c7;
        }

        .artist-rank {
          color: #4e7398;
          width: 18px;
          font-size: 9px;
        }

        .artist-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #123d69;
          color: #cbe3ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
        }

        .artist-name {
          flex: 1;
        }

        .artist-name strong {
          display: block;
          color: white;
          font-size: 9px;
        }

        .artist-name span {
          display: block;
          color: #63809e;
          font-size: 8px;
          margin-top: 2px;
        }

        .artist-count {
          color: #d8e9ff;
          font-size: 10px;
        }

        .sub-label-row > div {
          flex: 1;
          min-width: 0;
        }

        .sub-label-row strong {
          display: block;
          color: white;
          font-size: 9px;
        }

        .sub-label-row span:not(.active-badge):not(.inactive-badge) {
          display: block;
          color: #6986a4;
          font-size: 8px;
          margin-top: 3px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        /* =====================================================
           PERFORMANCE
        ===================================================== */

        .performance-panel {
          margin-bottom: 16px;
        }

        .chart-key {
          display: flex;
          gap: 13px;
          flex-wrap: wrap;
        }

        .chart-key span {
          color: #7e9bb9;
          font-size: 8px;
        }

        .chart-key i {
          width: 7px;
          height: 7px;
          display: inline-block;
          border-radius: 50%;
          margin-right: 4px;
        }

        .blue-dot {
          background: #2581ff;
        }

        .green-dot {
          background: #12d6a0;
        }

        .yellow-dot {
          background: #ffc928;
        }

        .red-dot {
          background: #ff4d57;
        }

        .performance-chart {
          height: 240px;
          position: relative;
        }

        .performance-lines {
          position: absolute;
          left: 0;
          right: 0;
          top: 20px;
          bottom: 35px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .performance-lines span {
          border-top: 1px dashed #12385d;
        }

        .performance-bars {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          top: 20px;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          z-index: 2;
        }

        .bar-group {
          width: 60px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          gap: 7px;
        }

        .bar-area {
          height: 195px;
          display: flex;
          align-items: flex-end;
          gap: 3px;
        }

        .bar {
          width: 8px;
          min-height: 3px;
          border-radius: 4px 4px 0 0;
        }

        .bar.total {
          background: #2581ff;
        }

        .bar.approved-bar {
          background: #12d6a0;
        }

        .bar.pending-bar {
          background: #ffc928;
        }

        .bar.rejected-bar {
          background: #ff4d57;
        }

        .bar-group > span {
          color: #63809e;
          font-size: 8px;
        }

        /* =====================================================
           COPYRIGHT
        ===================================================== */

        .copyright-section {
          margin-bottom: 16px;
          overflow: hidden;
          border-color: #6d5916;
          background:
            linear-gradient(
              135deg,
              #071b31,
              #0a1e32
            );
        }

        .copyright-header {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 16px;
          border-bottom: 1px solid #3e381e;
        }

        .copyright-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #3a3215;
          border: 1px solid #80671c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .copyright-header h2 {
          color: white;
          margin: 0;
          font-size: 16px;
        }

        .copyright-header p {
          color: #8098b1;
          font-size: 9px;
          margin: 5px 0 0;
        }

        .copyright-status {
          margin-left: auto;
          padding: 7px 10px;
          border-radius: 6px;
          background: #3b3214;
          color: #ffd13c;
          border: 1px solid #725d18;
          font-size: 8px;
        }

        .copyright-body {
          padding: 15px;
        }

        .copyright-info {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 13px;
        }

        .info-box {
          background: #06182d;
          border: 1px solid #1a3b5e;
          border-radius: 8px;
          padding: 11px;
        }

        .info-box strong {
          display: block;
          color: #dcecff;
          font-size: 9px;
        }

        .info-box span {
          display: block;
          color: #718dab;
          font-size: 8px;
          line-height: 1.5;
          margin-top: 5px;
        }

        .copyright-button,
        .submit-copyright {
          background: #e5b800;
          color: #07111e;
          border: none;
          border-radius: 7px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
          font-size: 9px;
        }

        .copyright-button:hover,
        .submit-copyright:hover {
          background: #ffd21c;
        }

        .copyright-form {
          border-top: 1px solid #3e381e;
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .form-title h3 {
          color: white;
          margin: 0;
          font-size: 13px;
        }

        .form-title p {
          color: #7892ad;
          font-size: 9px;
          margin: 5px 0 0;
        }

        .copyright-form label {
          display: grid;
          gap: 6px;
          color: #b8cce1;
          font-size: 9px;
        }

        .copyright-form input,
        .copyright-form select,
        .copyright-form textarea {
          width: 100%;
          background: #06172b;
          color: white;
          border: 1px solid #214767;
          border-radius: 7px;
          padding: 10px;
          outline: none;
          font-family: inherit;
          font-size: 10px;
        }

        .copyright-form textarea {
          resize: vertical;
        }

        .copyright-form input:focus,
        .copyright-form select:focus,
        .copyright-form textarea:focus {
          border-color: #d6af16;
        }

        .copyright-note {
          padding: 10px;
          background: #251f0c;
          border: 1px solid #5c4d18;
          color: #c6b56a;
          border-radius: 7px;
          font-size: 8px;
          line-height: 1.5;
        }

        .submitted-message {
          padding: 10px;
          background: #073b31;
          border: 1px solid #0b7962;
          color: #41e4b6;
          border-radius: 7px;
          font-size: 9px;
        }

        /* =====================================================
           SONGS
        ===================================================== */

        .songs-panel {
          margin-bottom: 16px;
        }

        .song-toolbar {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .song-toolbar input,
        .song-toolbar select {
          background: #06182d;
          border: 1px solid #1c4366;
          color: #cde0f3;
          border-radius: 7px;
          padding: 9px 10px;
          font-size: 9px;
          outline: none;
        }

        .song-toolbar input {
          flex: 1;
        }

        .song-toolbar select {
          min-width: 130px;
        }

        .table-head,
        .table-row {
          display: grid;
          grid-template-columns:
            2fr 1.1fr 1.1fr
            0.8fr 0.7fr;
          gap: 10px;
          align-items: center;
        }

        .table-head {
          color: #65829f;
          font-size: 8px;
          padding: 9px;
          border-bottom: 1px solid #153957;
        }

        .table-row {
          padding: 8px;
          border-bottom: 1px solid #0e304f;
          color: #a8c0d8;
          font-size: 9px;
        }

        .song-cell {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 0;
        }

        .song-cell img,
        .table-cover {
          width: 32px;
          height: 32px;
          border-radius: 5px;
          object-fit: cover;
          background: #0b2949;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .song-cell strong,
        .song-cell small {
          display: block;
        }

        .song-cell strong {
          color: white;
          font-size: 9px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .song-cell small {
          color: #66839f;
          font-size: 7px;
          margin-top: 2px;
        }

        .view-song {
          border: 1px solid #20517d;
          background: #092340;
          color: #53a2ff;
          padding: 5px 8px;
          border-radius: 5px;
          font-size: 8px;
          cursor: pointer;
        }

        /* =====================================================
           SUB MANAGEMENT
        ===================================================== */

        .sub-management {
          margin-bottom: 16px;
        }

        .primary-button {
          background: #176df0;
          color: white;
          border: none;
          padding: 9px 12px;
          border-radius: 7px;
          font-size: 9px;
          cursor: pointer;
        }

        .sub-form {
          display: grid;
          grid-template-columns:
            1fr 1fr auto;
          gap: 8px;
          padding: 13px;
          margin-bottom: 13px;
          background: #06182d;
          border: 1px solid #173f62;
          border-radius: 8px;
        }

        .sub-form input {
          background: #041427;
          color: white;
          border: 1px solid #1d4568;
          border-radius: 6px;
          padding: 9px;
          font-size: 9px;
          outline: none;
        }

        .sub-form button {
          background: #12a981;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 9px;
        }

        .login-details {
          padding: 13px;
          background: #082a25;
          border: 1px solid #11745d;
          border-radius: 8px;
          margin-bottom: 13px;
          color: #a8e8d5;
        }

        .login-details h4 {
          margin: 0 0 7px;
          color: white;
          font-size: 11px;
        }

        .login-details p {
          font-size: 9px;
          margin: 5px 0;
        }

        .login-details strong {
          margin-left: 6px;
          color: #47e1b5;
        }

        .login-details button {
          margin-top: 7px;
          border: 1px solid #267a66;
          background: transparent;
          color: #8debd1;
          border-radius: 5px;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 8px;
        }

        .management-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-top: 1px solid #103452;
        }

        .management-row:first-child {
          border-top: none;
        }

        .management-icon {
          width: 35px;
          height: 35px;
          border-radius: 8px;
          background: #092c51;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .management-info {
          flex: 1;
        }

        .management-info strong,
        .management-info span {
          display: block;
        }

        .management-info strong {
          color: white;
          font-size: 10px;
        }

        .management-info span {
          color: #6c89a6;
          font-size: 8px;
          margin-top: 3px;
        }

        .delete-button {
          border: 1px solid #702c37;
          background: #321923;
          color: #ff6c75;
          padding: 6px 9px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 8px;
        }

        /* =====================================================
           PROFILE
        ===================================================== */

        .profile-card {
          background:
            linear-gradient(
              135deg,
              #08264a,
              #07172b
            );
          border: 1px solid #1b527f;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .profile-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #176df0;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
        }

        .profile-content {
          flex: 1;
        }

        .profile-content h2 {
          color: white;
          margin: 0;
          font-size: 14px;
        }

        .profile-content p {
          color: #7290ad;
          margin: 4px 0 0;
          font-size: 9px;
        }

        .profile-card button {
          background: #0b2d54;
          border: 1px solid #24608f;
          color: #8ec6ff;
          border-radius: 7px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 9px;
        }

        /* =====================================================
           EMPTY
        ===================================================== */

        .empty-data {
          color: #6683a0;
          font-size: 9px;
          padding: 30px 10px;
          text-align: center;
        }

        .large-empty {
          padding: 50px;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .footer {
          text-align: center;
          color: #49647f;
          font-size: 8px;
          padding: 24px 0 0;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (
          max-width: 1200px
        ) {
          .stats-grid {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .analytics-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .daily-panel {
            grid-column: 1 / -1;
          }

          .three-column {
            grid-template-columns:
              1fr 1fr;
          }

          .recent-panel {
            grid-column: 1 / -1;
          }
        }

        @media (
          max-width: 800px
        ) {
          .sidebar {
            width: 70px;
            min-width: 70px;
          }

          .brand {
            justify-content: center;
            padding: 12px 5px;
          }

          .brand img {
            width: 38px;
            height: 38px;
          }

          .brand div,
          .welcome-user > div:not(.big-avatar),
          .menu-label,
          .menu-item:not(.active) span:last-child,
          .menu-item span:last-child,
          .logout-button {
            display: none;
          }

          .menu-item {
            justify-content: center;
            padding: 12px 5px;
          }

          .menu-item span:first-child {
            font-size: 17px;
          }

          .sidebar-bottom {
            display: flex;
            justify-content: center;
          }

          .main {
            margin-left: 70px;
            width: calc(
              100% - 70px
            );
          }

          .content {
            padding: 15px;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .analytics-grid,
          .three-column {
            grid-template-columns:
              1fr;
          }

          .daily-panel {
            grid-column: auto;
          }

          .copyright-info {
            grid-template-columns:
              1fr;
          }

          .sub-form {
            grid-template-columns:
              1fr;
          }

          .header {
            padding: 0 15px;
          }
        }

        @media (
          max-width: 520px
        ) {
          .stats-grid {
            grid-template-columns:
              1fr;
          }

          .mini-grid {
            grid-template-columns:
              1fr;
          }

          .header-user
            > div:not(.avatar):not(.notification) {
            display: none;
          }

          .table-head {
            display: none;
          }

          .table-row {
            grid-template-columns:
              1fr auto;
            padding: 12px 5px;
          }

          .table-row > span:nth-child(2),
          .table-row > span:nth-child(3) {
            display: none;
          }

          .song-cell {
            grid-column: 1;
          }

          .status-badge {
            grid-column: 2;
            grid-row: 1;
          }

          .view-song {
            grid-column: 2;
            grid-row: 2;
          }

          .copyright-header {
            align-items: flex-start;
          }

          .copyright-status {
            display: none;
          }
        }

      `}</style>
    </div>
  );
}