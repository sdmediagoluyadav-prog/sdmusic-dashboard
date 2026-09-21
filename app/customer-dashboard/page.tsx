"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

export default function CustomerDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showSubLabelForm, setShowSubLabelForm] = useState(false);
  const [subLabelName, setSubLabelName] = useState("");
  const [subLabelEmail, setSubLabelEmail] = useState("");
  const [creatingSubLabel, setCreatingSubLabel] = useState(false);

  const [loginDetails, setLoginDetails] =
    useState<LoginDetails | null>(null);

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

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select("id, customer_name, label_name")
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
        alert("Customer account नहीं मिला ❌");
        return;
      }

      setCustomer(customerData);

      /* =========================
         CUSTOMER SONG RELATION
      ========================= */

      const { data: relationData, error: relationError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customerData.id);

      if (relationError) {
        console.error(relationError);
        alert(
          "Customer songs load error ❌\n\n" +
            relationError.message
        );
        return;
      }

      const songIds =
        relationData?.map((item: any) => item.song_id) || [];

      if (songIds.length > 0) {
        const { data: songData, error: songError } =
          await supabase
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
            .in("id", songIds)
            .order("id", { ascending: false });

        if (songError) {
          console.error(songError);
          alert(
            "Songs load error ❌\n\n" +
              songError.message
          );
          return;
        }

        const songsWithUrls: Song[] = [];

        for (const song of (songData || []) as Song[]) {
          let coverSignedUrl: string | null = null;
          let audioSignedUrl: string | null = null;

          /* COVER */

          if (song.cover_url) {
            if (song.cover_url.startsWith("http")) {
              coverSignedUrl = song.cover_url;
            } else {
              const { data } = await supabase.storage
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
            if (song.audio_url.startsWith("http")) {
              audioSignedUrl = song.audio_url;
            } else {
              const { data } = await supabase.storage
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
            cover_signed_url: coverSignedUrl,
            audio_signed_url: audioSignedUrl,
          });
        }

        setSongs(songsWithUrls);
      } else {
        setSongs([]);
      }

      /* =========================
         SUB LABELS
      ========================= */

      const { data: subLabelData, error: subLabelError } =
        await supabase
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
          .eq("customer_id", customerData.id)
          .order("id", { ascending: false });

      if (subLabelError) {
        console.error(
          "Sub Label Error:",
          subLabelError
        );
      } else {
        setSubLabels(
          (subLabelData || []) as SubLabel[]
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

  /* =========================
     ADD SUB LABEL
  ========================= */

  async function addSubLabel() {
    if (!subLabelName.trim()) {
      alert("Sub Label Name bharo ❌");
      return;
    }

    if (!subLabelEmail.trim()) {
      alert("Sub Label Email bharo ❌");
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
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subLabelName:
              subLabelName.trim(),
            email: subLabelEmail.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.message ||
            "Sub Label create nahi hua ❌"
        );
        return;
      }

      if (result.subLabel) {
        setSubLabels((previous) => [
          result.subLabel,
          ...previous,
        ]);
      }

      if (result.login) {
        setLoginDetails({
          email: result.login.email,
          password: result.login.password,
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

  /* =========================
     DELETE SUB LABEL
  ========================= */

  async function deleteSubLabel(id: number) {
    const confirmDelete = confirm(
      "Kya aap is Sub Label ko delete karna chahte hain?"
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
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

      setSubLabels((previous) =>
        previous.filter(
          (item) => item.id !== id
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

  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  /* =========================
     FILTER SONGS
  ========================= */

  const filteredSongs = songs.filter((song) => {
    const searchText =
      search.toLowerCase();

    const matchesSearch =
      song.song_title
        ?.toLowerCase()
        .includes(searchText) ||
      song.artist_name
        ?.toLowerCase()
        .includes(searchText) ||
      song.album_name
        ?.toLowerCase()
        .includes(searchText);

    const matchesStatus =
      statusFilter === "All" ||
      (song.status || "")
        .toLowerCase() ===
        statusFilter.toLowerCase();

    return (
      matchesSearch &&
      matchesStatus
    );
  });

  /* =========================
     STATS
  ========================= */

  const totalSongs = songs.length;

  const approvedSongs =
    songs.filter(
      (song) =>
        (song.status || "").toLowerCase() ===
        "approved"
    ).length;

  const pendingSongs =
    songs.filter(
      (song) =>
        (song.status || "").toLowerCase() ===
        "pending"
    ).length;

  const rejectedSongs =
    songs.filter(
      (song) =>
        (song.status || "").toLowerCase() ===
        "rejected"
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

  const uniqueArtists = Array.from(
    new Set(
      songs
        .map((song) => song.artist_name)
        .filter(Boolean)
    )
  );

  const statusTotal =
    approvedSongs +
    pendingSongs +
    rejectedSongs;

  const approvedPercent =
    statusTotal > 0
      ? Math.round(
          (approvedSongs / statusTotal) *
            100
        )
      : 0;

  const pendingPercent =
    statusTotal > 0
      ? Math.round(
          (pendingSongs / statusTotal) *
            100
        )
      : 0;

  const rejectedPercent =
    statusTotal > 0
      ? Math.round(
          (rejectedSongs / statusTotal) *
            100
        )
      : 0;

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-box">
          <div className="spinner"></div>
          <h2>Loading Dashboard...</h2>
          <p>Please wait...</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f8fc;
            font-family: Arial, sans-serif;
          }

          .loading-box {
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 15px 45px rgba(15, 23, 42, 0.08);
          }

          .spinner {
            width: 42px;
            height: 42px;
            border: 4px solid #e5e7eb;
            border-top-color: #2563eb;
            border-radius: 50%;
            margin: auto auto 18px;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          h2 {
            margin: 0;
            color: #172033;
          }

          p {
            color: #64748b;
          }
        `}</style>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="empty-page">
        <div className="empty-box">
          <h2>Customer account नहीं मिला ❌</h2>
          <button
            onClick={() =>
              router.replace("/login")
            }
          >
            Go To Login
          </button>
        </div>

        <style jsx>{`
          .empty-page {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f5f8fc;
          }

          .empty-box {
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
          }

          button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 10px;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-layout">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <img src="/sd-logo.png" alt="SD Media" />
            <div>
              <strong>SD Media</strong>
              <span>Customer Dashboard</span>
            </div>
          </div>

          <div className="menu-title">MAIN MENU</div>

          <nav className="sidebar-menu">

            {/* DASHBOARD */}
            <button
              className="menu-item active"
              onClick={() =>
                router.push("/customer-dashboard")
              }
            >
              <span className="menu-icon">🏠</span>
              <span>Dashboard</span>
            </button>

            {/* UPLOAD SONG */}
            <button
              className="menu-item"
              onClick={() =>
                router.push("/upload")
              }
            >
              <span className="menu-icon">⬆️</span>
              <span>Upload Song</span>
            </button>

            {/* MY SONGS */}
            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/my-songs"
                )
              }
            >
              <span className="menu-icon">🎵</span>
              <span>My Songs</span>
            </button>

            {/* ARTISTS */}
            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/artists"
                )
              }
            >
              <span className="menu-icon">👥</span>
              <span>Artists</span>
            </button>

            {/* ROYALTY */}
            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/royalty"
                )
              }
            >
              <span className="menu-icon">₹</span>
              <span>Royalty</span>
            </button>

            {/* SUB LABELS */}
            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/sub-labels"
                )
              }
            >
              <span className="menu-icon">🏷️</span>
              <span>Sub Labels</span>
            </button>

            {/* PROFILE */}
            <button
              className="menu-item"
              onClick={() =>
                router.push(
                  "/customer-dashboard/profile"
                )
              }
            >
              <span className="menu-icon">👤</span>
              <span>Profile</span>
            </button>

          </nav>

          <div className="sidebar-bottom">
            <button
              className="logout-menu"
              onClick={logout}
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </aside>

        <section className="main-area">

          {/* HEADER */}
          <header className="top-header">
            <div>
              <div className="mobile-brand">
                SD Media Entertainment
              </div>

              <span className="header-small">
                Customer Panel
              </span>
            </div>

            <div className="header-right">
              <button className="header-icon">
                🔔
              </button>

              <div className="user-info">
                <div className="user-avatar">
                  {customer.customer_name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div>
                  <strong>
                    {customer.customer_name}
                  </strong>

                  <small>
                    {customer.label_name ||
                      "Customer"}
                  </small>
                </div>
              </div>
            </div>
          </header>

          <div className="content">

            {/* WELCOME */}
            <section
              id="dashboard-section"
              className="welcome-section"
            >
              <div>
                <h1>
                  Welcome back,{" "}
                  {customer.customer_name} 👋
                </h1>

                <p>
                  Manage your music, releases and
                  distribution from one place.
                </p>
              </div>

              <button
                className="upload-button"
                onClick={() =>
                  router.push("/upload")
                }
              >
                ＋ Upload Song
              </button>
            </section>

            {/* STATS */}
            <section className="stats-grid">
              <StatCard
                icon="🎵"
                title="Total Songs"
                value={totalSongs}
                type="blue"
              />

              <StatCard
                icon="✓"
                title="Approved"
                value={approvedSongs}
                type="green"
              />

              <StatCard
                icon="◷"
                title="Pending"
                value={pendingSongs}
                type="orange"
              />

              <StatCard
                icon="✕"
                title="Rejected"
                value={rejectedSongs}
                type="red"
              />

              <StatCard
                icon="👥"
                title="Artists"
                value={artists}
                type="purple"
              />

              <StatCard
                icon="💿"
                title="Albums"
                value={albums}
                type="pink"
              />

              <StatCard
                icon="₹"
                title="Royalty"
                value="—"
                type="cyan"
              />

              <StatCard
                icon="🏷️"
                title="Sub Labels"
                value={subLabels.length}
                type="yellow"
              />
            </section>

            {/* ANALYTICS */}
            <section className="analytics-card">

              <div className="section-heading">
                <div>
                  <h2>Content Analytics</h2>
                  <p>
                    Overview of your music
                    distribution
                  </p>
                </div>
              </div>

              <div className="analytics-grid">

                {/* SONG ACTIVITY */}
                <div className="chart-card large">

                  <div className="chart-title">
                    <div>
                      <h3>Song Activity</h3>
                      <p>
                        Your current music
                        collection
                      </p>
                    </div>

                    <span className="chart-number">
                      {totalSongs}
                    </span>
                  </div>

                  <div className="fake-line-chart">

                    <div className="chart-lines">
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>

                    <svg
                      viewBox="0 0 700 220"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="areaGradient"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity="0.25"
                          />

                          <stop
                            offset="100%"
                            stopColor="#3b82f6"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>

                      <path
                        d="M0 190 C70 160 80 125 145 145 C210 165 225 80 290 105 C350 125 370 55 425 80 C490 110 500 145 555 105 C610 70 630 120 700 55 L700 220 L0 220 Z"
                        fill="url(#areaGradient)"
                      />

                      <path
                        d="M0 190 C70 160 80 125 145 145 C210 165 225 80 290 105 C350 125 370 55 425 80 C490 110 500 145 555 105 C610 70 630 120 700 55"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="chart-labels">
                      <span>Jan</span>
                      <span>Mar</span>
                      <span>May</span>
                      <span>Jul</span>
                      <span>Sep</span>
                    </div>
                  </div>
                </div>

                {/* STATUS */}
                <div className="chart-card">

                  <div className="chart-title">
                    <div>
                      <h3>
                        Status Distribution
                      </h3>

                      <p>
                        Song approval status
                      </p>
                    </div>
                  </div>

                  <div className="donut-wrapper">

                    <div
                      className="donut"
                      style={{
                        background: `conic-gradient(
                          #16a34a 0% ${approvedPercent}%,
                          #f59e0b ${approvedPercent}% ${approvedPercent + pendingPercent}%,
                          #ef4444 ${approvedPercent + pendingPercent}% 100%
                        )`,
                      } as CSSProperties}
                    >
                      <div className="donut-inner">
                        <strong>
                          {totalSongs}
                        </strong>

                        <span>Songs</span>
                      </div>
                    </div>
                  </div>

                  <div className="legend">

                    <span>
                      <i className="green-dot"></i>
                      Approved {approvedSongs}
                    </span>

                    <span>
                      <i className="orange-dot"></i>
                      Pending {pendingSongs}
                    </span>

                    <span>
                      <i className="red-dot"></i>
                      Rejected {rejectedSongs}
                    </span>

                  </div>
                </div>
              </div>

              {/* MINI STATS */}
              <div className="mini-stats">

                <div className="mini-card">
                  <span>🎵</span>

                  <div>
                    <small>Total Songs</small>
                    <strong>
                      {totalSongs}
                    </strong>
                  </div>
                </div>

                <div className="mini-card">
                  <span>✓</span>

                  <div>
                    <small>
                      Approved Songs
                    </small>

                    <strong>
                      {approvedSongs}
                    </strong>
                  </div>
                </div>

                <div className="mini-card">
                  <span>⏳</span>

                  <div>
                    <small>
                      Pending Songs
                    </small>

                    <strong>
                      {pendingSongs}
                    </strong>
                  </div>
                </div>

              </div>
            </section>

            {/* ARTISTS */}
            <section
              id="artists-section"
              className="content-card"
            >
              <div className="section-heading">

                <div>
                  <h2>Artists</h2>

                  <p>
                    Artists connected with your
                    songs
                  </p>
                </div>

                <span className="section-count">
                  {artists} Artists
                </span>
              </div>

              {uniqueArtists.length === 0 ? (
                <div className="empty-content">
                  No artists available.
                </div>
              ) : (
                <div className="artist-grid">

                  {uniqueArtists.map(
                    (artist, index) => (
                      <div
                        className="artist-card"
                        key={artist}
                      >
                        <div className="artist-avatar">
                          {artist
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {artist}
                          </strong>

                          <small>
                            Artist {index + 1}
                          </small>
                        </div>
                      </div>
                    )
                  )}

                </div>
              )}
            </section>

            {/* ROYALTY */}
            <section
              id="royalty-section"
              className="royalty-card"
            >
              <div className="royalty-icon">
                ₹
              </div>

              <div>
                <h2>Royalty</h2>

                <p>
                  Your royalty information will
                  appear here once royalty data is
                  connected.
                </p>
              </div>

              <strong className="royalty-value">
                —
              </strong>
            </section>

            {/* SUB LABELS */}
            <section
              id="sub-label-section"
              className="content-card"
            >
              <div className="section-heading">

                <div>
                  <h2>Sub Labels</h2>

                  <p>
                    Manage your sub labels
                  </p>
                </div>

                <button
                  className="primary-small-button"
                  onClick={() =>
                    setShowSubLabelForm(
                      !showSubLabelForm
                    )
                  }
                >
                  ＋ Add Sub Label
                </button>
              </div>

              {showSubLabelForm && (
                <div className="sub-label-form">

                  <input
                    value={subLabelName}
                    onChange={(e) =>
                      setSubLabelName(
                        e.target.value
                      )
                    }
                    placeholder="Sub Label Name"
                  />

                  <input
                    value={subLabelEmail}
                    onChange={(e) =>
                      setSubLabelEmail(
                        e.target.value
                      )
                    }
                    placeholder="Sub Label Email"
                    type="email"
                  />

                  <button
                    className="primary-button"
                    onClick={addSubLabel}
                    disabled={creatingSubLabel}
                  >
                    {creatingSubLabel
                      ? "Creating..."
                      : "Create Sub Label"}
                  </button>

                </div>
              )}

              {loginDetails && (
                <div className="login-details">

                  <h3>
                    Sub Label Login Details
                  </h3>

                  <p>
                    Email:{" "}
                    <strong>
                      {loginDetails.email}
                    </strong>
                  </p>

                  <p>
                    Password:{" "}
                    <strong>
                      {loginDetails.password}
                    </strong>
                  </p>

                  <button
                    onClick={() =>
                      setLoginDetails(null)
                    }
                  >
                    Close
                  </button>

                </div>
              )}

              {subLabels.length === 0 ? (
                <div className="empty-content">
                  अभी कोई Sub Label नहीं है।
                </div>
              ) : (
                <div className="sub-label-list">

                  {subLabels.map((item) => (
                    <div
                      className="sub-label-row"
                      key={item.id}
                    >

                      <div className="sub-label-avatar">
                        {item.sub_label_name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>

                      <div className="sub-label-info">

                        <strong>
                          {item.sub_label_name}
                        </strong>

                        <span>
                          {item.email}
                        </span>

                      </div>

                      <span
                        className={
                          item.is_active
                            ? "status active"
                            : "status inactive"
                        }
                      >
                        {item.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deleteSubLabel(item.id)
                        }
                      >
                        Delete
                      </button>

                    </div>
                  ))}

                </div>
              )}
            </section>

            {/* PROFILE */}
            <section
              id="profile-section"
              className="content-card profile-card"
            >

              <div className="section-heading">

                <div>
                  <h2>Profile</h2>

                  <p>
                    Your account information
                  </p>
                </div>

              </div>

              <div className="profile-grid">

                <div>
                  <span>Customer Name</span>

                  <strong>
                    {customer.customer_name}
                  </strong>
                </div>

                <div>
                  <span>Label Name</span>

                  <strong>
                    {customer.label_name || "—"}
                  </strong>
                </div>

                <div>
                  <span>Total Songs</span>

                  <strong>
                    {totalSongs}
                  </strong>
                </div>

                <div>
                  <span>Sub Labels</span>

                  <strong>
                    {subLabels.length}
                  </strong>
                </div>

              </div>
            </section>

            {/* MY SONGS */}
            <section
              id="my-songs-section"
              className="content-card"
            >

              <div className="section-heading">

                <div>
                  <h2>My Songs</h2>

                  <p>
                    Manage your uploaded music
                  </p>
                </div>

                <button
                  className="primary-small-button"
                  onClick={() =>
                    router.push("/upload")
                  }
                >
                  ＋ Upload Song
                </button>

              </div>

              <div className="song-toolbar">

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search song, artist or album..."
                />

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
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

              {filteredSongs.length === 0 ? (
                <div className="empty-content">
                  No songs found.
                </div>
              ) : (
                <div className="songs-table">

                  <div className="table-header">
                    <span>Song</span>
                    <span>Artist</span>
                    <span>Album</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>

                  {filteredSongs.map((song) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      router={router}
                    />
                  ))}

                </div>
              )}

            </section>

            <footer className="footer">
              © {new Date().getFullYear()} SD Media
              Entertainment. All rights reserved.
            </footer>

          </div>
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .dashboard-page {
          min-height: 100vh;
          background: #f5f8fc;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
        }

        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 250px;
          min-width: 250px;
          background: #ffffff;
          border-right: 1px solid #e7edf5;
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .sidebar-logo {
          height: 88px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px;
          border-bottom: 1px solid #eef2f7;
        }

        .sidebar-logo img {
          width: 48px;
          height: 48px;
          object-fit: contain;
          border-radius: 12px;
        }

        .sidebar-logo strong {
          display: block;
          font-size: 15px;
          color: #16213a;
        }

        .sidebar-logo span {
          display: block;
          font-size: 11px;
          color: #8a96a8;
          margin-top: 4px;
        }

        .menu-title {
          padding: 25px 22px 10px;
          font-size: 10px;
          font-weight: 800;
          color: #a0aaba;
          letter-spacing: 1px;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 0 12px;
        }

        .menu-item {
          width: 100%;
          border: none;
          background: transparent;
          min-height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 0 15px;
          color: #61708a;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
        }

        .menu-item:hover {
          background: #f1f5ff;
          color: #2563eb;
        }

        .menu-item.active {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.22);
        }

        .menu-icon {
          width: 22px;
          text-align: center;
          font-size: 17px;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 15px 12px 20px;
          border-top: 1px solid #eef2f7;
        }

        .logout-menu {
          width: 100%;
          height: 45px;
          border: 1px solid #e5eaf1;
          background: #ffffff;
          border-radius: 11px;
          color: #667085;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .logout-menu:hover {
          background: #fff5f5;
          color: #dc2626;
        }

        .main-area {
          flex: 1;
          min-width: 0;
        }

        .top-header {
          height: 78px;
          background: #ffffff;
          border-bottom: 1px solid #e7edf5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .mobile-brand {
          font-size: 16px;
          font-weight: 800;
          color: #18243c;
        }

        .header-small {
          color: #96a0b1;
          font-size: 12px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          border: 1px solid #e6ebf2;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #172554;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: 800;
        }

        .user-info strong {
          display: block;
          font-size: 13px;
        }

        .user-info small {
          display: block;
          color: #8b95a7;
          font-size: 11px;
          margin-top: 3px;
        }

        .content {
          padding: 30px;
          max-width: 1600px;
          margin: auto;
        }

        .welcome-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 25px;
          scroll-margin-top: 100px;
        }

        .welcome-section h1 {
          margin: 0;
          font-size: 28px;
          color: #172033;
        }

        .welcome-section p {
          margin: 8px 0 0;
          color: #7d899d;
          font-size: 14px;
        }

        .upload-button,
        .primary-button,
        .primary-small-button {
          border: none;
          background: #2563eb;
          color: white;
          font-weight: 700;
          cursor: pointer;
          border-radius: 10px;
        }

        .upload-button {
          padding: 13px 20px;
        }

        .primary-small-button {
          padding: 10px 15px;
          font-size: 12px;
        }

        .upload-button:hover,
        .primary-button:hover,
        .primary-small-button:hover {
          background: #1d4ed8;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e7edf5;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 5px 20px rgba(15, 23, 42, 0.025);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          flex-shrink: 0;
        }

        .stat-icon.blue {
          background: #eaf2ff;
        }

        .stat-icon.green {
          background: #e9f9f0;
        }

        .stat-icon.orange {
          background: #fff4df;
        }

        .stat-icon.red {
          background: #ffeded;
        }

        .stat-icon.purple {
          background: #f0edff;
        }

        .stat-icon.pink {
          background: #ffedf6;
        }

        .stat-icon.cyan {
          background: #e9fbff;
        }

        .stat-icon.yellow {
          background: #fff8df;
        }

        .stat-info small {
          display: block;
          color: #8a95a7;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .stat-info strong {
          display: block;
          font-size: 22px;
          color: #172033;
        }

        .analytics-card,
        .content-card,
        .royalty-card {
          background: white;
          border: 1px solid #e4ebf4;
          border-radius: 17px;
          box-shadow: 0 7px 25px rgba(15, 23, 42, 0.035);
        }

        .analytics-card {
          padding: 20px;
          margin-bottom: 22px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 18px;
          color: #182238;
        }

        .section-heading p {
          margin: 5px 0 0;
          color: #8b96a8;
          font-size: 12px;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 18px;
        }

        .chart-card {
          border: 1px solid #e6edf5;
          border-radius: 14px;
          padding: 18px;
          min-height: 300px;
        }

        .chart-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .chart-title h3 {
          margin: 0;
          font-size: 14px;
        }

        .chart-title p {
          margin: 5px 0;
          color: #8c97a8;
          font-size: 11px;
        }

        .chart-number {
          font-size: 25px;
          font-weight: 800;
          color: #2563eb;
        }

        .fake-line-chart {
          height: 215px;
          position: relative;
          margin-top: 15px;
          padding: 10px 0 25px;
        }

        .fake-line-chart svg {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 175px;
        }

        .chart-lines {
          position: absolute;
          left: 0;
          right: 0;
          top: 5px;
          height: 160px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .chart-lines span {
          border-top: 1px dashed #e2e8f0;
        }

        .chart-labels {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: space-between;
          color: #9aa4b3;
          font-size: 10px;
        }

        .donut-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 20px;
        }

        .donut {
          width: 170px;
          height: 170px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .donut-inner {
          width: 105px;
          height: 105px;
          border-radius: 50%;
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-shadow: 0 5px 20px rgba(15, 23, 42, 0.05);
        }

        .donut-inner strong {
          font-size: 25px;
        }

        .donut-inner span {
          color: #8c97a8;
          font-size: 11px;
        }

        .legend {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .legend span {
          font-size: 10px;
          color: #68758a;
        }

        .legend i {
          width: 8px;
          height: 8px;
          display: inline-block;
          border-radius: 50%;
          margin-right: 4px;
        }

        .green-dot {
          background: #16a34a;
        }

        .orange-dot {
          background: #f59e0b;
        }

        .red-dot {
          background: #ef4444;
        }

        .mini-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 18px;
        }

        .mini-card {
          border: 1px solid #e6edf5;
          border-radius: 13px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mini-card > span {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          background: #edf4ff;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .mini-card small {
          display: block;
          color: #8b96a8;
          font-size: 10px;
        }

        .mini-card strong {
          display: block;
          font-size: 18px;
          margin-top: 3px;
        }

        .content-card {
          padding: 20px;
          margin-bottom: 22px;
          scroll-margin-top: 100px;
        }

        .section-count {
          background: #eef4ff;
          color: #2563eb;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .artist-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .artist-card {
          border: 1px solid #e8edf4;
          border-radius: 12px;
          padding: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .artist-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #eaf1ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .artist-card strong {
          display: block;
          font-size: 13px;
        }

        .artist-card small {
          display: block;
          margin-top: 4px;
          color: #9aa4b3;
          font-size: 10px;
        }

        .royalty-card {
          padding: 22px;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          scroll-margin-top: 100px;
        }

        .royalty-icon {
          width: 55px;
          height: 55px;
          border-radius: 15px;
          background: #eaf9f0;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          font-weight: 800;
        }

        .royalty-card h2 {
          margin: 0;
          font-size: 18px;
        }

        .royalty-card p {
          margin: 5px 0 0;
          color: #8994a6;
          font-size: 12px;
        }

        .royalty-value {
          margin-left: auto;
          font-size: 25px;
          color: #16a34a;
        }

        .sub-label-form {
          background: #f8fafc;
          border: 1px solid #e6edf5;
          padding: 15px;
          border-radius: 13px;
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 10px;
          margin-bottom: 18px;
        }

        .sub-label-form input,
        .song-toolbar input,
        .song-toolbar select {
          height: 42px;
          border: 1px solid #dfe6ef;
          border-radius: 9px;
          padding: 0 13px;
          outline: none;
          background: white;
        }

        .sub-label-form input:focus,
        .song-toolbar input:focus,
        .song-toolbar select:focus {
          border-color: #3b82f6;
        }

        .primary-button {
          padding: 0 17px;
        }

        .login-details {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 18px;
        }

        .login-details h3 {
          margin-top: 0;
          font-size: 14px;
        }

        .login-details p {
          font-size: 12px;
        }

        .login-details button {
          border: none;
          background: white;
          border-radius: 7px;
          padding: 7px 12px;
          cursor: pointer;
        }

        .sub-label-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sub-label-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border: 1px solid #e8edf4;
          border-radius: 12px;
        }

        .sub-label-avatar {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #fff7df;
          color: #c27a00;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .sub-label-info {
          flex: 1;
        }

        .sub-label-info strong {
          display: block;
          font-size: 13px;
        }

        .sub-label-info span {
          display: block;
          color: #8a96a8;
          font-size: 11px;
          margin-top: 3px;
        }

        .status {
          font-size: 10px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 20px;
        }

        .status.active {
          background: #e9f9ef;
          color: #15803d;
        }

        .status.inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .delete-button {
          border: none;
          background: #fff0f0;
          color: #dc2626;
          padding: 7px 10px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 11px;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .profile-grid > div {
          border: 1px solid #e7edf5;
          border-radius: 12px;
          padding: 15px;
        }

        .profile-grid span {
          display: block;
          color: #8c97a8;
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .profile-grid strong {
          font-size: 14px;
        }

        .song-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .song-toolbar input {
          flex: 1;
        }

        .song-toolbar select {
          width: 160px;
        }

        .songs-table {
          border: 1px solid #e6edf5;
          border-radius: 13px;
          overflow: hidden;
        }

        .table-header,
        .song-row {
          display: grid;
          grid-template-columns:
            2fr 1.2fr 1.2fr 1fr 2.3fr;
          align-items: center;
          gap: 10px;
          padding: 13px 15px;
        }

        .table-header {
          background: #f8fafc;
          color: #7c8799;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .song-row {
          border-top: 1px solid #edf1f5;
          min-height: 70px;
        }

        .song-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .song-cover {
          width: 43px;
          height: 43px;
          border-radius: 9px;
          object-fit: cover;
          background: #edf2f7;
          flex-shrink: 0;
        }

        .song-cover-placeholder {
          width: 43px;
          height: 43px;
          border-radius: 9px;
          background: #edf2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .song-title {
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-small {
          font-size: 10px;
          color: #929dad;
          margin-top: 3px;
        }

        .song-cell {
          color: #68758a;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-status {
          display: inline-flex;
          width: fit-content;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 800;
        }

        .song-status.approved {
          background: #e9f9ef;
          color: #15803d;
        }

        .song-status.pending {
          background: #fff5df;
          color: #b45309;
        }

        .song-status.rejected {
          background: #fff0f0;
          color: #dc2626;
        }

        .song-status.other {
          background: #f1f5f9;
          color: #64748b;
        }

        .empty-content {
          border: 1px dashed #d9e1eb;
          padding: 30px;
          text-align: center;
          color: #8b96a8;
          border-radius: 12px;
          font-size: 13px;
        }

        .footer {
          text-align: center;
          color: #98a2b3;
          font-size: 11px;
          padding: 10px 0 30px;
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .artist-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .profile-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 900px) {
          .dashboard-layout {
            display: block;
          }

          .sidebar {
            position: relative;
            width: 100%;
            min-width: 100%;
            height: auto;
          }

          .sidebar-menu {
            padding-bottom: 12px;
          }

          .sidebar-bottom {
            display: none;
          }

          .analytics-grid {
            grid-template-columns: 1fr;
          }

          .top-header {
            position: relative;
          }
        }

        @media (max-width: 650px) {
          .content {
            padding: 15px;
          }

          .top-header {
            padding: 0 15px;
          }

          .user-info > div:last-child {
            display: none;
          }

          .welcome-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .welcome-section h1 {
            font-size: 22px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .mini-stats {
            grid-template-columns: 1fr;
          }

          .artist-grid,
          .profile-grid {
            grid-template-columns: 1fr;
          }

          .sub-label-form {
            grid-template-columns: 1fr;
          }

          .song-toolbar {
            flex-direction: column;
          }

          .song-toolbar select {
            width: 100%;
          }

          .songs-table {
            overflow-x: auto;
          }

          .table-header,
          .song-row {
            min-width: 900px;
          }

          .royalty-card {
            flex-wrap: wrap;
          }

          .royalty-value {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  title,
  value,
  type,
}: {
  icon: string;
  title: string;
  value: string | number;
  type: string;
}) {
  return (
    <div className="stat-card">

      <div className={`stat-icon ${type}`}>
        {icon}
      </div>

      <div className="stat-info">
        <small>{title}</small>
        <strong>{value}</strong>
      </div>

      <style jsx>{`
        .stat-card {
          background: white;
          border: 1px solid #e7edf5;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 5px 20px rgba(15, 23, 42, 0.025);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          flex-shrink: 0;
        }

        .stat-icon.blue {
          background: #eaf2ff;
        }

        .stat-icon.green {
          background: #e9f9f0;
        }

        .stat-icon.orange {
          background: #fff4df;
        }

        .stat-icon.red {
          background: #ffeded;
        }

        .stat-icon.purple {
          background: #f0edff;
        }

        .stat-icon.pink {
          background: #ffedf6;
        }

        .stat-icon.cyan {
          background: #e9fbff;
        }

        .stat-icon.yellow {
          background: #fff8df;
        }

        .stat-info small {
          display: block;
          color: #8a95a7;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .stat-info strong {
          display: block;
          font-size: 22px;
          color: #172033;
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   SONG ROW
   PLAY + DETAILS
========================================================= */

function SongRow({
  song,
  router,
}: {
  song: Song;
  router: ReturnType<typeof useRouter>;
}) {
  const [showDetails, setShowDetails] =
    useState(false);

  const status =
    (song.status || "").toLowerCase();

  let statusClass = "other";

  if (status === "approved") {
    statusClass = "approved";
  }

  if (status === "pending") {
    statusClass = "pending";
  }

  if (status === "rejected") {
    statusClass = "rejected";
  }

  return (
    <div className="song-row-wrapper">

      {/* MAIN ROW */}
      <div className="song-row">

        {/* SONG */}
        <div className="song-main">

          {song.cover_signed_url ? (
            <img
              src={song.cover_signed_url}
              alt={song.song_title}
              className="song-cover"
            />
          ) : (
            <div className="song-cover-placeholder">
              🎵
            </div>
          )}

          <div>
            <div className="song-title">
              {song.song_title}
            </div>

            <div className="song-small">
              {song.singer_name ||
                song.artist_name ||
                "Unknown Artist"}
            </div>
          </div>

        </div>

        {/* ARTIST */}
        <div className="song-cell">
          {song.artist_name || "—"}
        </div>

        {/* ALBUM */}
        <div className="song-cell">
          {song.album_name || "—"}
        </div>

        {/* STATUS */}
        <div>
          <span
            className={`song-status ${statusClass}`}
          >
            {song.status || "Pending"}
          </span>
        </div>

        {/* ACTION */}
        <div className="action-buttons">

          {/* PLAY */}
          {song.audio_signed_url ? (
            <audio
              controls
              preload="none"
              src={song.audio_signed_url}
              className="audio-player"
            />
          ) : (
            <span className="no-audio">
              No Audio
            </span>
          )}

          {/* DETAILS */}
          <button
            className="action-button details-button"
            onClick={() =>
              setShowDetails(!showDetails)
            }
          >
            {showDetails
              ? "▲ Hide"
              : "👁 Details"}
          </button>

          {/* EDIT ONLY REJECTED */}
          {status === "rejected" && (
            <button
              className="action-button edit-button"
              onClick={() =>
                router.push(
                  `/customer-dashboard/edit/${song.id}`
                )
              }
            >
              ✏ Edit
            </button>
          )}

        </div>
      </div>

      {/* FULL DETAILS */}
      {showDetails && (
        <div className="song-details">

          <div className="details-header">
            <h3>🎵 Song Details</h3>
          </div>

          <div className="details-grid">

            <div className="detail-item">
              <span>Song Title</span>
              <strong>
                {song.song_title || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Artist Name</span>
              <strong>
                {song.artist_name || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Album Name</span>
              <strong>
                {song.album_name || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Singer Name</span>
              <strong>
                {song.singer_name || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Composer</span>
              <strong>
                {song.composer || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Lyricist</span>
              <strong>
                {song.lyricist || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Genre</span>
              <strong>
                {song.genre || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Language</span>
              <strong>
                {song.language || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Release Date</span>
              <strong>
                {song.release_date || "—"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Status</span>

              <strong
                className={`detail-status ${statusClass}`}
              >
                {song.status || "Pending"}
              </strong>
            </div>

            {status === "rejected" && (
              <div className="detail-item rejection-detail">

                <span>
                  Rejection Reason
                </span>

                <strong>
                  {song.rejection_reason || "—"}
                </strong>

              </div>
            )}

          </div>
        </div>
      )}

      <style jsx>{`
        .song-row-wrapper {
          border-top: 1px solid #edf1f5;
        }

        .song-row {
          display: grid;
          grid-template-columns:
            2fr 1.2fr 1.2fr 1fr 2.3fr;
          align-items: center;
          gap: 10px;
          padding: 13px 15px;
          min-height: 70px;
        }

        .song-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .song-cover {
          width: 43px;
          height: 43px;
          border-radius: 9px;
          object-fit: cover;
          background: #edf2f7;
          flex-shrink: 0;
        }

        .song-cover-placeholder {
          width: 43px;
          height: 43px;
          border-radius: 9px;
          background: #edf2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .song-title {
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-small {
          font-size: 10px;
          color: #929dad;
          margin-top: 3px;
        }

        .song-cell {
          color: #68758a;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-status {
          display: inline-flex;
          width: fit-content;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 800;
        }

        .song-status.approved {
          background: #e9f9ef;
          color: #15803d;
        }

        .song-status.pending {
          background: #fff5df;
          color: #b45309;
        }

        .song-status.rejected {
          background: #fff0f0;
          color: #dc2626;
        }

        .song-status.other {
          background: #f1f5f9;
          color: #64748b;
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .action-button {
          border: none;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 8px;
          padding: 7px 9px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .action-button:hover {
          background: #dbeafe;
        }

        .details-button {
          background: #f3f4f6;
          color: #475569;
        }

        .details-button:hover {
          background: #e2e8f0;
        }

        .edit-button {
          background: #fff0f0;
          color: #dc2626;
        }

        .edit-button:hover {
          background: #fee2e2;
        }

        .audio-player {
          width: 155px;
          height: 32px;
        }

        .no-audio {
          color: #98a2b3;
          font-size: 10px;
        }

        .song-details {
          background: #f8fafc;
          border-top: 1px solid #e6edf5;
          padding: 18px 20px 20px;
        }

        .details-header {
          margin-bottom: 15px;
        }

        .details-header h3 {
          margin: 0;
          font-size: 14px;
          color: #172033;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .detail-item {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 10px;
          padding: 12px;
          min-width: 0;
        }

        .detail-item span {
          display: block;
          color: #8b96a8;
          font-size: 9px;
          font-weight: 700;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .detail-item strong {
          display: block;
          color: #172033;
          font-size: 12px;
          word-break: break-word;
        }

        .detail-status.approved {
          color: #15803d;
        }

        .detail-status.pending {
          color: #b45309;
        }

        .detail-status.rejected {
          color: #dc2626;
        }

        .detail-status.other {
          color: #64748b;
        }

        .rejection-detail {
          grid-column: span 2;
        }

        @media (max-width: 1100px) {
          .song-row {
            grid-template-columns:
              2fr 1fr 1fr 1fr 2fr;
          }

          .details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 650px) {
          .song-row {
            min-width: 900px;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .rejection-detail {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}