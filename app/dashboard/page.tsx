"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  singer_name: string | null;
  composer: string | null;
  music_director: string | null;
  lyricist: string | null;
  genre: string | null;
  language: string | null;
  release_date: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
  created_at: string | null;

  customer_name: string | null;
  label_name: string | null;
  label_type: string | null;
  upload_label: string | null;
  sub_label_name: string | null;
};

type Customer = {
  id: number;
  customer_name: string | null;
  label_name: string | null;
};

type CustomerSong = {
  song_id: number;
  customer_id: number;
};

type SubLabel = {
  id: number;
  customer_id: number;
  sub_label_name: string | null;
};

type SubLabelSong = {
  song_id: number;
  sub_label_id: number;
};

type FilterOption = {
  key: string;
  type: "all" | "main" | "sub";
  name: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);
  const [customersCount, setCustomersCount] = useState(0);

  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const [playingSongId, setPlayingSongId] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<number | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    artists: 0,
    albums: 0,
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/auth/role", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roleData = await response.json();

      if (roleData?.role === "customer") {
        router.replace("/customer-dashboard");
        return;
      }

      if (
        roleData?.role === "sub_label" ||
        roleData?.role === "sub-label"
      ) {
        router.replace("/sub-label-dashboard");
        return;
      }

      if (roleData?.role !== "admin") {
        router.replace("/login");
        return;
      }

      await loadDashboard();
    } catch (error) {
      console.error("Admin auth error:", error);
      router.replace("/login");
    }
  }

  async function loadDashboard() {
    setLoading(true);

    try {
      const [
        songsResponse,
        customersResponse,
        customerSongsResponse,
        subLabelsResponse,
        subLabelSongsResponse,
      ] = await Promise.all([
        supabase
          .from("songs")
          .select(`
            id,
            song_title,
            artist_name,
            album_name,
            singer_name,
            composer,
            music_director,
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
          .order("created_at", { ascending: false }),

        supabase
          .from("customers")
          .select(`
            id,
            customer_name,
            label_name
          `),

        supabase
          .from("customer_songs")
          .select(`
            song_id,
            customer_id
          `),

        supabase
          .from("sub_labels")
          .select(`
            id,
            customer_id,
            sub_label_name
          `),

        supabase
          .from("sub_label_songs")
          .select(`
            song_id,
            sub_label_id
          `),
      ]);

      if (songsResponse.error) {
        console.error("Songs error:", songsResponse.error);
      }

      if (customersResponse.error) {
        console.error("Customers error:", customersResponse.error);
      }

      if (customerSongsResponse.error) {
        console.error(
          "Customer songs error:",
          customerSongsResponse.error
        );
      }

      if (subLabelsResponse.error) {
        console.error(
          "Sub labels error:",
          subLabelsResponse.error
        );
      }

      if (subLabelSongsResponse.error) {
        console.error(
          "Sub label songs error:",
          subLabelSongsResponse.error
        );
      }

      const songRows = (songsResponse.data || []) as Song[];
      const customerRows = (customersResponse.data || []) as Customer[];
      const customerSongRows =
        (customerSongsResponse.data || []) as CustomerSong[];
      const subLabelRows =
        (subLabelsResponse.data || []) as SubLabel[];
      const subLabelSongRows =
        (subLabelSongsResponse.data || []) as SubLabelSong[];

      const mappedSongs: Song[] = songRows.map((song) => {
        const customerSong = customerSongRows.find(
          (item) => item.song_id === song.id
        );

        const customer = customerRows.find(
          (item) => item.id === customerSong?.customer_id
        );

        const subLabelSong = subLabelSongRows.find(
          (item) => item.song_id === song.id
        );

        const subLabel = subLabelRows.find(
          (item) => item.id === subLabelSong?.sub_label_id
        );

        let labelType: string | null = null;
        let uploadLabel: string | null = null;
        let subLabelName: string | null = null;

        if (subLabel) {
          labelType = "Sub Label";
          uploadLabel = subLabel.sub_label_name || null;
          subLabelName = subLabel.sub_label_name || null;
        } else if (customer) {
          labelType = "Main Label";

          uploadLabel =
            customer.label_name ||
            customer.customer_name ||
            null;
        }

        return {
          ...song,
          customer_name: customer?.customer_name || null,
          label_name: customer?.label_name || null,
          label_type: labelType,
          upload_label: uploadLabel,
          sub_label_name: subLabelName,
        };
      });

      setSongs(mappedSongs);
      setCustomersCount(customerRows.length);

      const total = mappedSongs.length;

      const pending = mappedSongs.filter(
        (song) =>
          (song.status || "").toLowerCase() === "pending"
      ).length;

      const approved = mappedSongs.filter(
        (song) =>
          (song.status || "").toLowerCase() === "approved"
      ).length;

      const rejected = mappedSongs.filter(
        (song) =>
          (song.status || "").toLowerCase() === "rejected"
      ).length;

      const artistSet = new Set(
        mappedSongs
          .map((song) => song.artist_name?.trim())
          .filter(Boolean)
      );

      const albumSet = new Set(
        mappedSongs
          .map((song) => song.album_name?.trim())
          .filter(Boolean)
      );

      setStats({
        total,
        pending,
        approved,
        rejected,
        artists: artistSet.size,
        albums: albumSet.size,
      });
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function approveSong(songId: number) {
    try {
      setProcessingId(songId);

      const { error } = await supabase
        .from("songs")
        .update({
          status: "Approved",
          rejection_reason: null,
        })
        .eq("id", songId);

      if (error) {
        alert(error.message);
        return;
      }

      setSongs((current) =>
        current.map((song) =>
          song.id === songId
            ? {
                ...song,
                status: "Approved",
                rejection_reason: null,
              }
            : song
        )
      );

      setStats((current) => {
        const oldSong = songs.find((song) => song.id === songId);

        const oldStatus = (
          oldSong?.status || ""
        ).toLowerCase();

        return {
          ...current,
          pending:
            oldStatus === "pending"
              ? Math.max(0, current.pending - 1)
              : current.pending,
          approved:
            oldStatus !== "approved"
              ? current.approved + 1
              : current.approved,
          rejected:
            oldStatus === "rejected"
              ? Math.max(0, current.rejected - 1)
              : current.rejected,
        };
      });
    } catch (error) {
      console.error("Approve error:", error);
      alert("Song approve nahi ho paya.");
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectSong(songId: number) {
    const reason = window.prompt(
      "Reject karne ka reason likhiye:"
    );

    if (reason === null) {
      return;
    }

    const finalReason =
      reason.trim() || "Rejected by admin";

    try {
      setProcessingId(songId);

      const { error } = await supabase
        .from("songs")
        .update({
          status: "Rejected",
          rejection_reason: finalReason,
        })
        .eq("id", songId);

      if (error) {
        alert(error.message);
        return;
      }

      setSongs((current) =>
        current.map((song) =>
          song.id === songId
            ? {
                ...song,
                status: "Rejected",
                rejection_reason: finalReason,
              }
            : song
        )
      );

      setStats((current) => {
        const oldSong = songs.find((song) => song.id === songId);

        const oldStatus = (
          oldSong?.status || ""
        ).toLowerCase();

        return {
          ...current,
          pending:
            oldStatus === "pending"
              ? Math.max(0, current.pending - 1)
              : current.pending,
          rejected:
            oldStatus !== "rejected"
              ? current.rejected + 1
              : current.rejected,
          approved:
            oldStatus === "approved"
              ? Math.max(0, current.approved - 1)
              : current.approved,
        };
      });
    } catch (error) {
      console.error("Reject error:", error);
      alert("Song reject nahi ho paya.");
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteSong(songId: number) {
    const confirmDelete = window.confirm(
      "Kya aap sach me is song ko delete karna chahte hain?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setProcessingId(songId);

      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId);

      if (error) {
        alert(error.message);
        return;
      }

      const deletedSong = songs.find(
        (song) => song.id === songId
      );

      setSongs((current) =>
        current.filter((song) => song.id !== songId)
      );

      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }

      if (playingSongId === songId) {
        setPlayingSongId(null);
        setAudioUrl(null);
      }

      setStats((current) => {
        const deletedStatus = (
          deletedSong?.status || ""
        ).toLowerCase();

        return {
          ...current,
          total: Math.max(0, current.total - 1),
          pending:
            deletedStatus === "pending"
              ? Math.max(0, current.pending - 1)
              : current.pending,
          approved:
            deletedStatus === "approved"
              ? Math.max(0, current.approved - 1)
              : current.approved,
          rejected:
            deletedStatus === "rejected"
              ? Math.max(0, current.rejected - 1)
              : current.rejected,
        };
      });
    } catch (error) {
      console.error("Delete error:", error);
      alert("Song delete nahi ho paya.");
    } finally {
      setProcessingId(null);
    }
  }

  async function playSong(song: Song) {
    try {
      if (playingSongId === song.id) {
        setPlayingSongId(null);
        setAudioUrl(null);
        return;
      }

      if (!song.audio_url) {
        alert("Audio file available nahi hai.");
        return;
      }

      let path = song.audio_url;

      if (path.includes("/storage/v1/object/")) {
        const marker = "/songs/";

        const markerIndex = path.indexOf(marker);

        if (markerIndex !== -1) {
          path = path.substring(
            markerIndex + marker.length
          );
        }
      }

      path = path.replace(/^\/+/, "");

      const { data, error } = await supabase.storage
        .from("songs")
        .createSignedUrl(path, 3600);

      if (error || !data?.signedUrl) {
        console.error("Audio signed URL error:", error);
        alert("Audio play nahi ho pa raha hai.");
        return;
      }

      setAudioUrl(data.signedUrl);
      setPlayingSongId(song.id);
    } catch (error) {
      console.error("Play error:", error);
      alert("Audio play nahi ho pa raha hai.");
    }
  }

  async function getCoverUrl(
    coverUrl: string | null
  ): Promise<string | null> {
    if (!coverUrl) {
      return null;
    }

    try {
      let path = coverUrl;

      if (path.includes("/storage/v1/object/")) {
        const marker = "/covers/";

        const markerIndex = path.indexOf(marker);

        if (markerIndex !== -1) {
          path = path.substring(
            markerIndex + marker.length
          );
        }
      }

      path = path.replace(/^\/+/, "");

      if (path.startsWith("covers/")) {
        path = path.substring("covers/".length);
      }

      const { data, error } = await supabase.storage
        .from("covers")
        .createSignedUrl(path, 3600);

      if (error || !data?.signedUrl) {
        return null;
      }

      return data.signedUrl;
    } catch {
      return null;
    }
  }

  async function openSongDetails(song: Song) {
    setSelectedSong(song);

    if (song.cover_url) {
      const signedCover = await getCoverUrl(
        song.cover_url
      );

      if (signedCover) {
        setSelectedSong((current) =>
          current?.id === song.id
            ? {
                ...current,
                cover_url: signedCover,
              }
            : current
        );
      }
    }
  }

  async function downloadAudio(song: Song) {
    if (!song.audio_url) {
      alert("Audio file available nahi hai.");
      return;
    }

    try {
      let path = song.audio_url;

      if (path.includes("/storage/v1/object/")) {
        const marker = "/songs/";

        const markerIndex = path.indexOf(marker);

        if (markerIndex !== -1) {
          path = path.substring(
            markerIndex + marker.length
          );
        }
      }

      path = path.replace(/^\/+/, "");

      const { data, error } = await supabase.storage
        .from("songs")
        .createSignedUrl(path, 3600);

      if (error || !data?.signedUrl) {
        alert("Download link nahi ban paaya.");
        return;
      }

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download =
        song.song_title?.trim() || "song";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download error:", error);
      alert("Download nahi ho paaya.");
    }
  }

  const labelOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, FilterOption>();

    songs.forEach((song) => {
      if (
        song.label_type === "Main Label" &&
        song.upload_label
      ) {
        const key = `main:${song.upload_label}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            type: "main",
            name: song.upload_label,
          });
        }
      }

      if (
        song.label_type === "Sub Label" &&
        song.sub_label_name
      ) {
        const key = `sub:${song.sub_label_name}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            type: "sub",
            name: song.sub_label_name,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return songs.filter((song) => {
      const matchesLabel =
        labelFilter === "all" ||
        (labelFilter.startsWith("main:") &&
          song.label_type === "Main Label" &&
          song.upload_label ===
            labelFilter.substring(5)) ||
        (labelFilter.startsWith("sub:") &&
          song.label_type === "Sub Label" &&
          song.sub_label_name ===
            labelFilter.substring(4));

      if (!matchesLabel) {
        return false;
      }

      if (!searchText) {
        return true;
      }

      const searchableText = [
        song.song_title,
        song.artist_name,
        song.album_name,
        song.singer_name,
        song.composer,
        song.music_director,
        song.lyricist,
        song.genre,
        song.language,
        song.customer_name,
        song.label_name,
        song.upload_label,
        song.sub_label_name,
        song.label_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchText);
    });
  }, [songs, search, labelFilter]);

  function getStatusClass(status: string | null) {
    const value = (status || "").toLowerCase();

    if (value === "approved") {
      return "statusApproved";
    }

    if (value === "rejected") {
      return "statusRejected";
    }

    return "statusPending";
  }

  function getLabelClass(labelType: string | null) {
    if (labelType === "Sub Label") {
      return "subLabelBadge";
    }

    return "mainLabelBadge";
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const selectedLabelName =
    labelFilter === "all"
      ? "All Labels"
      : labelOptions.find(
          (item) => item.key === labelFilter
        )?.name || "Selected Label";

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <div style={styles.loadingText}>
            Admin Dashboard Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <img
            src="/sd-logo.png"
            alt="SD Media"
            style={styles.logo}
          />
        </div>

        <div style={styles.brandTitle}>
          SD Media
        </div>

        <div style={styles.brandSubTitle}>
          Music Content Management
        </div>

        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navButton,
              ...styles.navButtonActive,
            }}
            onClick={() => router.push("/dashboard")}
          >
            <span>📊</span>
            Dashboard
          </button>

          <button
            style={styles.navButton}
            onClick={() => router.push("/songs")}
          >
            <span>🎵</span>
            All Songs
          </button>

          <button
            style={styles.navButton}
            onClick={() => router.push("/upload")}
          >
            <span>⬆️</span>
            Upload Song
          </button>

          <button
            style={styles.navButton}
            onClick={() => router.push("/customers")}
          >
            <span>👥</span>
            Customers
          </button>

          <button
            style={styles.navButton}
            onClick={() =>
              router.push("/dashboard/copyright-requests")
            }
          >
            <span>©️</span>
            Copyright Requests
          </button>

          <button
            style={styles.navButton}
            onClick={() =>
              router.push("/customer-dashboard")
            }
          >
            <span>👤</span>
            Customer Dashboard
          </button>
        </nav>

        <div style={styles.sidebarBottom}>
          <button
            style={styles.logoutButton}
            onClick={logout}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>
              Admin Dashboard
            </h1>
            <p style={styles.pageSubtitle}>
              Manage your music distribution content
            </p>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.adminBadge}>
              🛡️ Admin
            </div>
          </div>
        </div>

        <section style={styles.statsGrid}>
          <StatCard
            title="Total Songs"
            value={stats.total}
            icon="🎵"
          />

          <StatCard
            title="Pending"
            value={stats.pending}
            icon="⏳"
          />

          <StatCard
            title="Approved"
            value={stats.approved}
            icon="✅"
          />

          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon="❌"
          />

          <StatCard
            title="Artists"
            value={stats.artists}
            icon="🎤"
          />

          <StatCard
            title="Albums"
            value={stats.albums}
            icon="💿"
          />

          <StatCard
            title="Customers"
            value={customersCount}
            icon="👥"
          />
        </section>

        <section style={styles.contentCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                All Songs
              </h2>

              <p style={styles.sectionSubtitle}>
                {labelFilter === "all"
                  ? `Showing ${filteredSongs.length} songs`
                  : `${selectedLabelName} — ${filteredSongs.length} songs`}
              </p>
            </div>

            <div style={styles.filters}>
              <div style={styles.searchBox}>
                <span style={styles.searchIcon}>
                  🔎
                </span>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search song, artist, customer..."
                  style={styles.searchInput}
                />
              </div>

              <select
                value={labelFilter}
                onChange={(e) =>
                  setLabelFilter(e.target.value)
                }
                style={styles.filterSelect}
              >
                <option value="all">
                  All Labels
                </option>

                {labelOptions
                  .filter((item) => item.type === "main")
                  .map((item) => (
                    <option
                      key={item.key}
                      value={item.key}
                    >
                      🏢 Main Label — {item.name}
                    </option>
                  ))}

                {labelOptions
                  .filter((item) => item.type === "sub")
                  .map((item) => (
                    <option
                      key={item.key}
                      value={item.key}
                    >
                      🏷️ Sub Label — {item.name}
                    </option>
                  ))}
              </select>

              {labelFilter !== "all" && (
                <button
                  style={styles.clearFilterButton}
                  onClick={() =>
                    setLabelFilter("all")
                  }
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {filteredSongs.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🎵</div>
              <div style={styles.emptyTitle}>
                No songs found
              </div>
              <div style={styles.emptyText}>
                {labelFilter !== "all"
                  ? "Is label ke under koi song nahi mila."
                  : "Abhi koi song available nahi hai."}
              </div>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Cover</th>
                    <th style={styles.th}>Song</th>
                    <th style={styles.th}>Artist</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>
                      Rejection Reason
                    </th>
                    <th style={styles.th}>
                      Customer / Label
                    </th>
                    <th style={styles.th}>Play</th>
                    <th style={styles.th}>
                      Approval
                    </th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSongs.map((song) => (
                    <tr key={song.id}>
                      <td style={styles.td}>
                        <CoverImage
                          coverUrl={song.cover_url}
                          title={song.song_title}
                        />
                      </td>

                      <td style={styles.td}>
                        <div style={styles.songTitle}>
                          {song.song_title ||
                            "Untitled Song"}
                        </div>

                        <div style={styles.songMeta}>
                          {song.album_name ||
                            "No Album"}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.artistName}>
                          {song.artist_name ||
                            "Unknown Artist"}
                        </div>

                        {song.singer_name && (
                          <div style={styles.smallText}>
                            Singer:{" "}
                            {song.singer_name}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        <span
                          className={getStatusClass(
                            song.status
                          )}
                          style={
                            styles.statusBadge
                          }
                        >
                          {song.status ||
                            "Pending"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {song.rejection_reason ? (
                          <div
                            style={
                              styles.rejectionText
                            }
                          >
                            {song.rejection_reason}
                          </div>
                        ) : (
                          <span
                            style={
                              styles.mutedText
                            }
                          >
                            —
                          </span>
                        )}
                      </td>

                      <td style={styles.td}>
                        <div
                          style={
                            styles.customerLabelBox
                          }
                        >
                          <div
                            style={
                              styles.customerName
                            }
                          >
                            👤{" "}
                            {song.customer_name ||
                              "Customer Not Found"}
                          </div>

                          {song.label_type ===
                            "Main Label" && (
                            <>
                              <div
                                style={
                                  styles.labelLine
                                }
                              >
                                <span
                                  style={{
                                    ...styles.labelBadge,
                                    ...styles.mainLabelBadge,
                                  }}
                                >
                                  🏢 Main Label
                                </span>
                              </div>

                              <div
                                style={
                                  styles.uploadLabel
                                }
                              >
                                {song.upload_label ||
                                  song.label_name ||
                                  "Label Not Found"}
                              </div>
                            </>
                          )}

                          {song.label_type ===
                            "Sub Label" && (
                            <>
                              <div
                                style={
                                  styles.labelLine
                                }
                              >
                                <span
                                  style={{
                                    ...styles.labelBadge,
                                    ...styles.subLabelBadge,
                                  }}
                                >
                                  🏷️ Sub Label
                                </span>
                              </div>

                              <div
                                style={
                                  styles.uploadLabel
                                }
                              >
                                {song.sub_label_name ||
                                  song.upload_label ||
                                  "Sub Label Not Found"}
                              </div>
                            </>
                          )}

                          {!song.label_type && (
                            <div
                              style={
                                styles.mutedText
                              }
                            >
                              Label information
                              not found
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <button
                          style={
                            styles.playButton
                          }
                          onClick={() =>
                            playSong(song)
                          }
                        >
                          {playingSongId ===
                          song.id
                            ? "⏹ Stop"
                            : "▶ Play"}
                        </button>
                      </td>

                      <td style={styles.td}>
                        <div
                          style={
                            styles.approvalButtons
                          }
                        >
                          <button
                            style={{
                              ...styles.approveButton,
                              opacity:
                                processingId ===
                                song.id
                                  ? 0.6
                                  : 1,
                            }}
                            disabled={
                              processingId ===
                              song.id
                            }
                            onClick={() =>
                              approveSong(
                                song.id
                              )
                            }
                          >
                            ✓
                          </button>

                          <button
                            style={{
                              ...styles.rejectButton,
                              opacity:
                                processingId ===
                                song.id
                                  ? 0.6
                                  : 1,
                            }}
                            disabled={
                              processingId ===
                              song.id
                            }
                            onClick={() =>
                              rejectSong(
                                song.id
                              )
                            }
                          >
                            ✕
                          </button>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div
                          style={
                            styles.actionButtons
                          }
                        >
                          <button
                            style={
                              styles.detailsButton
                            }
                            onClick={() =>
                              openSongDetails(
                                song
                              )
                            }
                          >
                            Details
                          </button>

                          <button
                            style={
                              styles.deleteButton
                            }
                            disabled={
                              processingId ===
                              song.id
                            }
                            onClick={() =>
                              deleteSong(
                                song.id
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {audioUrl && playingSongId && (
        <div style={styles.audioPlayer}>
          <div style={styles.audioPlayerTitle}>
            ▶ Playing Song
          </div>

          <audio
            src={audioUrl}
            controls
            autoPlay
            style={styles.audio}
            onEnded={() => {
              setPlayingSongId(null);
              setAudioUrl(null);
            }}
          />

          <button
            style={styles.audioClose}
            onClick={() => {
              setPlayingSongId(null);
              setAudioUrl(null);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {selectedSong && (
        <div
          style={styles.modalOverlay}
          onClick={() => setSelectedSong(null)}
        >
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Song Details
                </h2>

                <div style={styles.modalSubtitle}>
                  ID: {selectedSong.id}
                </div>
              </div>

              <button
                style={styles.modalClose}
                onClick={() =>
                  setSelectedSong(null)
                }
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalCoverBox}>
                {selectedSong.cover_url ? (
                  <img
                    src={selectedSong.cover_url}
                    alt={
                      selectedSong.song_title ||
                      "Cover"
                    }
                    style={styles.modalCover}
                  />
                ) : (
                  <div
                    style={
                      styles.modalCoverPlaceholder
                    }
                  >
                    🎵
                  </div>
                )}
              </div>

              <div style={styles.detailsGrid}>
                <DetailItem
                  label="Song Title"
                  value={
                    selectedSong.song_title
                  }
                />

                <DetailItem
                  label="Artist"
                  value={
                    selectedSong.artist_name
                  }
                />

                <DetailItem
                  label="Album"
                  value={
                    selectedSong.album_name
                  }
                />

                <DetailItem
                  label="Singer"
                  value={
                    selectedSong.singer_name
                  }
                />

                <DetailItem
                  label="Composer"
                  value={
                    selectedSong.composer
                  }
                />

                <DetailItem
                  label="Music Director"
                  value={
                    selectedSong.music_director
                  }
                />

                <DetailItem
                  label="Lyricist"
                  value={
                    selectedSong.lyricist
                  }
                />

                <DetailItem
                  label="Genre"
                  value={
                    selectedSong.genre
                  }
                />

                <DetailItem
                  label="Language"
                  value={
                    selectedSong.language
                  }
                />

                <DetailItem
                  label="Release Date"
                  value={
                    selectedSong.release_date
                  }
                />

                <DetailItem
                  label="Customer"
                  value={
                    selectedSong.customer_name ||
                    "Customer Not Found"
                  }
                />

                <DetailItem
                  label="Main Label"
                  value={
                    selectedSong.label_name ||
                    "Not Available"
                  }
                />

                <DetailItem
                  label="Label Type"
                  value={
                    selectedSong.label_type ||
                    "Not Available"
                  }
                />

                <DetailItem
                  label="Uploaded Under"
                  value={
                    selectedSong.upload_label ||
                    selectedSong.sub_label_name ||
                    selectedSong.label_name ||
                    "Not Available"
                  }
                />

                <DetailItem
                  label="Status"
                  value={
                    selectedSong.status ||
                    "Pending"
                  }
                />

                <DetailItem
                  label="Created At"
                  value={
                    selectedSong.created_at
                      ? new Date(
                          selectedSong.created_at
                        ).toLocaleString(
                          "en-IN"
                        )
                      : null
                  }
                />
              </div>

              {selectedSong.rejection_reason && (
                <div
                  style={
                    styles.modalRejectionBox
                  }
                >
                  <div
                    style={
                      styles.modalRejectionTitle
                    }
                  >
                    Rejection Reason
                  </div>

                  <div
                    style={
                      styles.modalRejectionText
                    }
                  >
                    {
                      selectedSong.rejection_reason
                    }
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.modalPlayButton}
                onClick={() =>
                  playSong(selectedSong)
                }
              >
                {playingSongId ===
                selectedSong.id
                  ? "⏹ Stop Audio"
                  : "▶ Play Audio"}
              </button>

              <button
                style={
                  styles.modalDownloadButton
                }
                onClick={() =>
                  downloadAudio(selectedSong)
                }
              >
                ⬇ Download
              </button>

              <button
                style={styles.modalDeleteButton}
                onClick={() =>
                  deleteSong(selectedSong.id)
                }
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .statusApproved {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        .statusRejected {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .statusPending {
          background: rgba(234, 179, 8, 0.15);
          color: #facc15;
          border: 1px solid rgba(234, 179, 8, 0.25);
        }

        .mainLabelBadge {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .subLabelBadge {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }
      `}</style>
    </div>
  );
}

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
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>

      <div>
        <div style={styles.statValue}>
          {value}
        </div>

        <div style={styles.statTitle}>
          {title}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div style={styles.detailItem}>
      <div style={styles.detailLabel}>
        {label}
      </div>

      <div style={styles.detailValue}>
        {value || "—"}
      </div>
    </div>
  );
}

function CoverImage({
  coverUrl,
  title,
}: {
  coverUrl: string | null;
  title: string | null;
}) {
  const [src, setSrc] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!coverUrl) {
        return;
      }

      try {
        let path = coverUrl;

        if (path.includes("/storage/v1/object/")) {
          const marker = "/covers/";
          const index = path.indexOf(marker);

          if (index !== -1) {
            path = path.substring(
              index + marker.length
            );
          }
        }

        path = path.replace(/^\/+/, "");

        if (path.startsWith("covers/")) {
          path = path.substring("covers/".length);
        }

        const { data, error } =
          await supabase.storage
            .from("covers")
            .createSignedUrl(path, 3600);

        if (
          !error &&
          data?.signedUrl &&
          active
        ) {
          setSrc(data.signedUrl);
        }
      } catch {
        // ignore cover error
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [coverUrl]);

  if (!src) {
    return (
      <div style={styles.coverPlaceholder}>
        🎵
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || "Cover"}
      style={styles.cover}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #09090b 0%, #111827 100%)",
    color: "#f8fafc",
    display: "flex",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  sidebar: {
    width: "250px",
    minHeight: "100vh",
    background: "#09090b",
    borderRight: "1px solid #27272a",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    padding: "22px 14px",
    zIndex: 20,
  },

  logoBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "8px",
  },

  logo: {
    width: "82px",
    height: "82px",
    objectFit: "contain",
    borderRadius: "18px",
  },

  brandTitle: {
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 800,
    color: "#ffffff",
  },

  brandSubTitle: {
    textAlign: "center",
    color: "#71717a",
    fontSize: "11px",
    marginTop: "3px",
    marginBottom: "28px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  navButton: {
    width: "100%",
    border: "1px solid transparent",
    background: "transparent",
    color: "#a1a1aa",
    padding: "12px 13px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    textAlign: "left",
  },

  navButtonActive: {
    background:
      "linear-gradient(135deg, rgba(59,130,246,.18), rgba(99,102,241,.12))",
    color: "#ffffff",
    border: "1px solid rgba(59,130,246,.22)",
  },

  sidebarBottom: {
    position: "absolute",
    left: "14px",
    right: "14px",
    bottom: "22px",
  },

  logoutButton: {
    width: "100%",
    background: "rgba(239,68,68,.08)",
    border: "1px solid rgba(239,68,68,.16)",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    fontSize: "14px",
  },

  main: {
    marginLeft: "250px",
    width: "calc(100% - 250px)",
    minHeight: "100vh",
    padding: "30px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  pageTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 800,
    letterSpacing: "-0.5px",
  },

  pageSubtitle: {
    margin: "6px 0 0",
    color: "#71717a",
    fontSize: "14px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
  },

  adminBadge: {
    padding: "9px 13px",
    borderRadius: "10px",
    background: "rgba(59,130,246,.1)",
    border: "1px solid rgba(59,130,246,.2)",
    color: "#93c5fd",
    fontSize: "13px",
    fontWeight: 700,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "14px",
    marginBottom: "24px",
  },

  statCard: {
    background:
      "linear-gradient(145deg, rgba(24,24,27,.95), rgba(17,24,39,.88))",
    border: "1px solid #27272a",
    borderRadius: "15px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minHeight: "82px",
  },

  statIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,.05)",
    fontSize: "20px",
  },

  statValue: {
    fontSize: "23px",
    fontWeight: 800,
    color: "#ffffff",
  },

  statTitle: {
    fontSize: "12px",
    color: "#71717a",
    marginTop: "2px",
  },

  contentCard: {
    background:
      "rgba(9,9,11,.72)",
    border: "1px solid #27272a",
    borderRadius: "16px",
    overflow: "hidden",
  },

  sectionHeader: {
    padding: "20px",
    borderBottom: "1px solid #27272a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: 800,
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#71717a",
    fontSize: "12px",
  },

  filters: {
    display: "flex",
    gap: "9px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  searchBox: {
    width: "260px",
    display: "flex",
    alignItems: "center",
    background: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "9px",
    padding: "0 10px",
  },

  searchIcon: {
    fontSize: "13px",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#ffffff",
    padding: "10px 8px",
    fontSize: "13px",
  },

  filterSelect: {
    background: "#18181b",
    color: "#ffffff",
    border: "1px solid #3f3f46",
    borderRadius: "9px",
    padding: "10px 12px",
    minWidth: "230px",
    outline: "none",
    cursor: "pointer",
    fontSize: "13px",
  },

  clearFilterButton: {
    border: "1px solid rgba(239,68,68,.3)",
    background: "rgba(239,68,68,.1)",
    color: "#fca5a5",
    padding: "10px 12px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "1350px",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "13px 14px",
    background: "#111113",
    color: "#71717a",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".5px",
    borderBottom: "1px solid #27272a",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 14px",
    borderBottom: "1px solid #1f1f23",
    verticalAlign: "middle",
  },

  cover: {
    width: "52px",
    height: "52px",
    borderRadius: "9px",
    objectFit: "cover",
    border: "1px solid #27272a",
  },

  coverPlaceholder: {
    width: "52px",
    height: "52px",
    borderRadius: "9px",
    background: "#18181b",
    border: "1px solid #27272a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  songTitle: {
    fontWeight: 700,
    color: "#f4f4f5",
    fontSize: "13px",
    maxWidth: "190px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  songMeta: {
    color: "#71717a",
    fontSize: "11px",
    marginTop: "4px",
  },

  artistName: {
    fontSize: "13px",
    color: "#e4e4e7",
    fontWeight: 600,
  },

  smallText: {
    color: "#71717a",
    fontSize: "10px",
    marginTop: "4px",
  },

  mutedText: {
    color: "#52525b",
    fontSize: "11px",
  },

  statusBadge: {
    display: "inline-flex",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  rejectionText: {
    color: "#fca5a5",
    fontSize: "11px",
    maxWidth: "150px",
    lineHeight: 1.4,
  },

  customerLabelBox: {
    minWidth: "170px",
  },

  customerName: {
    color: "#e4e4e7",
    fontSize: "12px",
    fontWeight: 700,
  },

  labelLine: {
    marginTop: "6px",
  },

  labelBadge: {
    display: "inline-flex",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: 800,
  },

  uploadLabel: {
    color: "#a1a1aa",
    fontSize: "11px",
    fontWeight: 600,
    marginTop: "5px",
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  playButton: {
    border: "1px solid rgba(59,130,246,.25)",
    background: "rgba(59,130,246,.1)",
    color: "#93c5fd",
    padding: "7px 9px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  approvalButtons: {
    display: "flex",
    gap: "6px",
  },

  approveButton: {
    width: "31px",
    height: "31px",
    borderRadius: "7px",
    border: "1px solid rgba(34,197,94,.25)",
    background: "rgba(34,197,94,.1)",
    color: "#4ade80",
    cursor: "pointer",
    fontWeight: 800,
  },

  rejectButton: {
    width: "31px",
    height: "31px",
    borderRadius: "7px",
    border: "1px solid rgba(239,68,68,.25)",
    background: "rgba(239,68,68,.1)",
    color: "#f87171",
    cursor: "pointer",
    fontWeight: 800,
  },

  actionButtons: {
    display: "flex",
    gap: "6px",
  },

  detailsButton: {
    border: "1px solid #3f3f46",
    background: "#18181b",
    color: "#d4d4d8",
    padding: "7px 9px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 700,
  },

  deleteButton: {
    border: "1px solid rgba(239,68,68,.25)",
    background: "rgba(239,68,68,.08)",
    color: "#f87171",
    padding: "7px 9px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 700,
  },

  emptyState: {
    padding: "70px 20px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "42px",
    marginBottom: "12px",
  },

  emptyTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#e4e4e7",
  },

  emptyText: {
    color: "#71717a",
    fontSize: "13px",
    marginTop: "5px",
  },

  loadingScreen: {
    minHeight: "100vh",
    background: "#09090b",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#ffffff",
  },

  loadingBox: {
    textAlign: "center",
  },

  spinner: {
    width: "34px",
    height: "34px",
    border: "3px solid #27272a",
    borderTop: "3px solid #60a5fa",
    borderRadius: "50%",
    margin: "0 auto 12px",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    color: "#a1a1aa",
    fontSize: "13px",
  },

  audioPlayer: {
    position: "fixed",
    left: "270px",
    right: "20px",
    bottom: "18px",
    zIndex: 100,
    background: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "12px",
    padding: "10px 13px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 15px 40px rgba(0,0,0,.45)",
  },

  audioPlayerTitle: {
    color: "#d4d4d8",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  audio: {
    flex: 1,
    height: "34px",
  },

  audioClose: {
    border: "none",
    background: "transparent",
    color: "#a1a1aa",
    cursor: "pointer",
    fontSize: "16px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.72)",
    backdropFilter: "blur(5px)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  modal: {
    width: "min(900px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#111113",
    border: "1px solid #3f3f46",
    borderRadius: "18px",
    boxShadow: "0 25px 80px rgba(0,0,0,.6)",
  },

  modalHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid #27272a",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: 800,
  },

  modalSubtitle: {
    color: "#71717a",
    fontSize: "11px",
    marginTop: "4px",
  },

  modalClose: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#18181b",
    color: "#a1a1aa",
    cursor: "pointer",
  },

  modalBody: {
    padding: "20px",
  },

  modalCoverBox: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "22px",
  },

  modalCover: {
    width: "190px",
    height: "190px",
    objectFit: "cover",
    borderRadius: "14px",
    border: "1px solid #3f3f46",
  },

  modalCoverPlaceholder: {
    width: "190px",
    height: "190px",
    borderRadius: "14px",
    background: "#18181b",
    border: "1px solid #3f3f46",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "50px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "10px",
  },

  detailItem: {
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "10px",
    padding: "11px 12px",
  },

  detailLabel: {
    color: "#71717a",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: ".4px",
    fontWeight: 700,
  },

  detailValue: {
    color: "#e4e4e7",
    fontSize: "12px",
    marginTop: "5px",
    wordBreak: "break-word",
  },

  modalRejectionBox: {
    marginTop: "15px",
    background: "rgba(239,68,68,.08)",
    border: "1px solid rgba(239,68,68,.2)",
    borderRadius: "10px",
    padding: "12px",
  },

  modalRejectionTitle: {
    color: "#f87171",
    fontSize: "11px",
    fontWeight: 800,
    marginBottom: "5px",
  },

  modalRejectionText: {
    color: "#fca5a5",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  modalFooter: {
    padding: "15px 20px",
    borderTop: "1px solid #27272a",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },

  modalPlayButton: {
    border: "1px solid rgba(59,130,246,.3)",
    background: "rgba(59,130,246,.1)",
    color: "#93c5fd",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },

  modalDownloadButton: {
    border: "1px solid rgba(34,197,94,.3)",
    background: "rgba(34,197,94,.1)",
    color: "#86efac",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },

  modalDeleteButton: {
    border: "1px solid rgba(239,68,68,.3)",
    background: "rgba(239,68,68,.1)",
    color: "#fca5a5",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },
};