"use client";

import { useEffect, useState } from "react";
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
  customer_name: string | null;
  label_name: string | null;
  signed_cover_url?: string | null;
  signed_audio_url?: string | null;
};

type Stats = {
  totalSongs: number;
  pending: number;
  approved: number;
  rejected: number;
  artists: number;
  albums: number;
  customers: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [songs, setSongs] = useState<Song[]>([]);

  const [stats, setStats] = useState<Stats>({
    totalSongs: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    artists: 0,
    albums: 0,
    customers: 0,
  });

  const [selectedSong, setSelectedSong] =
    useState<Song | null>(null);

  const [downloadLoading, setDownloadLoading] =
    useState<"audio" | "cover" | null>(null);

  // =========================================================
  // SIGNED URL
  // =========================================================

  async function createSignedUrl(
    path: string | null
  ): Promise<string | null> {
    if (!path) return null;

    // Agar database me already direct URL saved hai
    if (
      path.startsWith("http://") ||
      path.startsWith("https://")
    ) {
      return path;
    }

    const { data, error } = await supabase.storage
      .from("songs")
      .createSignedUrl(path, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  }

  // =========================================================
  // SAFE FILE NAME
  // =========================================================

  function safeFileName(name: string | null) {
    const cleaned = (name || "song")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim();

    return cleaned || "song";
  }

  // =========================================================
  // FILE EXTENSION
  // =========================================================

  function getFileExtension(
    path: string | null,
    fallback: string
  ): string {
    if (!path) return fallback;

    const cleanPath = path.split("?")[0];

    const lastPart =
      cleanPath.split("/").pop() || "";

    if (!lastPart.includes(".")) {
      return fallback;
    }

    const ext = lastPart.split(".").pop();

    if (!ext) {
      return fallback;
    }

    return `.${ext}`;
  }

  // =========================================================
  // DOWNLOAD FILE
  // =========================================================

  async function downloadFile(
    path: string | null,
    filename: string,
    type: "audio" | "cover"
  ) {
    if (!path) {
      alert(
        type === "audio"
          ? "Audio file nahi mila."
          : "Poster file nahi mila."
      );

      return;
    }

    try {
      setDownloadLoading(type);

      // -----------------------------------------------------
      // DIRECT URL
      // -----------------------------------------------------

      if (
        path.startsWith("http://") ||
        path.startsWith("https://")
      ) {
        const separator = path.includes("?")
          ? "&"
          : "?";

        const downloadUrl =
          `${path}${separator}download=${encodeURIComponent(
            filename
          )}`;

        const link =
          document.createElement("a");

        link.href = downloadUrl;
        link.download = filename;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        document.body.appendChild(link);
        link.click();
        link.remove();

        return;
      }

      // -----------------------------------------------------
      // PRIVATE SUPABASE STORAGE
      // -----------------------------------------------------

      const { data, error } =
        await supabase.storage
          .from("songs")
          .createSignedUrl(path, 60 * 60);

      if (error || !data?.signedUrl) {
        console.error(
          "Signed download URL error:",
          error
        );

        alert(
          type === "audio"
            ? "Audio download nahi ho pa raha hai."
            : "Poster download nahi ho pa raha hai."
        );

        return;
      }

      // Signed URL ke saath download filename
      const separator =
        data.signedUrl.includes("?")
          ? "&"
          : "?";

      const downloadUrl =
        `${data.signedUrl}${separator}download=${encodeURIComponent(
          filename
        )}`;

      const link =
        document.createElement("a");

      link.href = downloadUrl;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      alert(
        type === "audio"
          ? "Audio download karte waqt error aaya."
          : "Poster download karte waqt error aaya."
      );
    } finally {
      setDownloadLoading(null);
    }
  }

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  async function loadDashboard(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      }

      // -----------------------------------------------------
      // AUTH CHECK
      // -----------------------------------------------------

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // -----------------------------------------------------
      // ROLE CHECK
      // -----------------------------------------------------

      try {
        const roleResponse =
          await fetch("/api/auth/role", {
            cache: "no-store",
          });

        if (roleResponse.ok) {
          const roleData =
            await roleResponse.json();

          const role = String(
            roleData?.role || ""
          ).toLowerCase();

          if (role === "customer") {
            router.replace(
              "/customer-dashboard"
            );

            return;
          }

          if (
            role === "sub-label" ||
            role === "sublabel" ||
            role === "sub_label"
          ) {
            router.replace(
              "/sub-label-dashboard"
            );

            return;
          }
        }
      } catch (roleError) {
        console.error(
          "Role check error:",
          roleError
        );
      }

      // -----------------------------------------------------
      // TOTAL SONGS
      // -----------------------------------------------------

      const { count: totalSongs } =
        await supabase
          .from("songs")
          .select("*", {
            count: "exact",
            head: true,
          });

      // -----------------------------------------------------
      // PENDING
      // -----------------------------------------------------

      const { count: pending } =
        await supabase
          .from("songs")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "Pending");

      // -----------------------------------------------------
      // APPROVED
      // -----------------------------------------------------

      const { count: approved } =
        await supabase
          .from("songs")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "Approved");

      // -----------------------------------------------------
      // REJECTED
      // -----------------------------------------------------

      const { count: rejected } =
        await supabase
          .from("songs")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "Rejected");

      // -----------------------------------------------------
      // ARTISTS
      // -----------------------------------------------------

      const { data: artistRows } =
        await supabase
          .from("songs")
          .select("artist_name");

      const uniqueArtists = new Set(
        (artistRows || [])
          .map(
            (item: any) =>
              item.artist_name
          )
          .filter(Boolean)
      );

      // -----------------------------------------------------
      // ALBUMS
      // -----------------------------------------------------

      const { data: albumRows } =
        await supabase
          .from("songs")
          .select("album_name");

      const uniqueAlbums = new Set(
        (albumRows || [])
          .map(
            (item: any) =>
              item.album_name
          )
          .filter(Boolean)
      );

      // -----------------------------------------------------
      // CUSTOMERS
      // -----------------------------------------------------

      const { count: customers } =
        await supabase
          .from("customers")
          .select("*", {
            count: "exact",
            head: true,
          });

      // -----------------------------------------------------
      // LATEST SONGS
      // -----------------------------------------------------

      const {
        data: latestSongs,
        error: latestSongsError,
      } = await supabase
        .from("songs")
        .select(`
          id,
          song_title,
          artist_name,
          album_name,
          cover_url,
          audio_url,
          status,
          rejection_reason
        `)
        .order("id", {
          ascending: false,
        })
        .limit(5);

      if (latestSongsError) {
        console.error(
          "Latest songs error:",
          latestSongsError
        );
      }

      // -----------------------------------------------------
      // CUSTOMER SONG MAPPING
      // -----------------------------------------------------

      const songIds =
        (latestSongs || []).map(
          (song: any) => song.id
        );

      let customerSongRows: any[] = [];

      if (songIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("customer_songs")
          .select(`
            song_id,
            customer_id
          `)
          .in(
            "song_id",
            songIds
          );

        if (error) {
          console.error(
            "Customer songs error:",
            error
          );
        }

        customerSongRows = data || [];
      }

      // -----------------------------------------------------
      // CUSTOMER IDS
      // -----------------------------------------------------

      const customerIds =
        customerSongRows
          .map(
            (item) =>
              item.customer_id
          )
          .filter(Boolean);

      let customerRows: any[] = [];

      if (customerIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("customers")
          .select(`
            id,
            name,
            label_name
          `)
          .in(
            "id",
            customerIds
          );

        if (error) {
          console.error(
            "Customers fetch error:",
            error
          );
        }

        customerRows = data || [];
      }

      // -----------------------------------------------------
      // MAP SONG DATA
      // -----------------------------------------------------

      const finalSongs: Song[] =
        await Promise.all(
          (latestSongs || []).map(
            async (song: any) => {
              const customerSong =
                customerSongRows.find(
                  (item) =>
                    item.song_id ===
                    song.id
                );

              const customer =
                customerRows.find(
                  (item) =>
                    item.id ===
                    customerSong?.customer_id
                );

              const signedCoverUrl =
                await createSignedUrl(
                  song.cover_url
                );

              const signedAudioUrl =
                await createSignedUrl(
                  song.audio_url
                );

              return {
                id: song.id,
                song_title:
                  song.song_title,
                artist_name:
                  song.artist_name,
                album_name:
                  song.album_name,
                cover_url:
                  song.cover_url,
                audio_url:
                  song.audio_url,
                status:
                  song.status,
                rejection_reason:
                  song.rejection_reason,
                customer_name:
                  customer?.name ||
                  null,
                label_name:
                  customer?.label_name ||
                  null,
                signed_cover_url:
                  signedCoverUrl,
                signed_audio_url:
                  signedAudioUrl,
              };
            }
          )
        );

      setSongs(finalSongs);

      setStats({
        totalSongs:
          totalSongs || 0,
        pending:
          pending || 0,
        approved:
          approved || 0,
        rejected:
          rejected || 0,
        artists:
          uniqueArtists.size,
        albums:
          uniqueAlbums.size,
        customers:
          customers || 0,
      });
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  // =========================================================
  // APPROVE SONG
  // =========================================================

  async function approveSong(
    songId: number
  ) {
    const confirmed =
      window.confirm(
        "Kya aap is song ko approve karna chahte hain?"
      );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from("songs")
          .update({
            status: "Approved",
            rejection_reason: null,
          })
          .eq("id", songId);

      if (error) {
        console.error(error);

        alert(
          "Song approve nahi hua."
        );

        return;
      }

      alert(
        "Song Approved ✅"
      );

      await loadDashboard();

      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }
    } catch (error) {
      console.error(error);

      alert(
        "Approve karte waqt error aaya."
      );
    }
  }

  // =========================================================
  // REJECT SONG
  // =========================================================

  async function rejectSong(
    songId: number
  ) {
    const reason =
      window.prompt(
        "Reject karne ka reason likhiye:"
      );

    if (reason === null) return;

    if (!reason.trim()) {
      alert(
        "Rejection reason likhna zaroori hai."
      );

      return;
    }

    try {
      const { error } =
        await supabase
          .from("songs")
          .update({
            status: "Rejected",
            rejection_reason:
              reason.trim(),
          })
          .eq("id", songId);

      if (error) {
        console.error(error);

        alert(
          "Song reject nahi hua."
        );

        return;
      }

      alert(
        "Song Rejected ❌"
      );

      await loadDashboard();

      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }
    } catch (error) {
      console.error(error);

      alert(
        "Reject karte waqt error aaya."
      );
    }
  }

  // =========================================================
  // DELETE SONG
  // =========================================================

  async function deleteSong(
    songId: number
  ) {
    const confirmed =
      window.confirm(
        "Kya aap is song ko permanently delete karna chahte hain?"
      );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from("songs")
          .delete()
          .eq("id", songId);

      if (error) {
        console.error(error);

        alert(
          "Song delete nahi hua."
        );

        return;
      }

      alert(
        "Song deleted successfully ✅"
      );

      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }

      await loadDashboard();
    } catch (error) {
      console.error(error);

      alert(
        "Delete karte waqt error aaya."
      );
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  // =========================================================
  // STATUS BADGE
  // =========================================================

  function getStatusClass(
    status: string | null
  ) {
    const value =
      String(
        status || ""
      ).toLowerCase();

    if (value === "approved") {
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
    }

    if (value === "rejected") {
      return "bg-red-500/15 text-red-400 border border-red-500/20";
    }

    return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20";
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-4" />

          <p className="text-white/60">
            Loading Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="flex min-h-screen">

        {/* =====================================================
            SIDEBAR
        ====================================================== */}

        <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-white/10 bg-[#0d0d10] flex-col">

          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">

                <img
                  src="/sd-logo.png"
                  alt="SD Media"
                  className="w-full h-full object-contain"
                />

              </div>

              <div>
                <h1 className="font-bold text-lg">
                  SD Music
                </h1>

                <p className="text-xs text-white/40">
                  Admin Panel
                </p>
              </div>

            </div>
          </div>

          <nav className="p-4 space-y-2 flex-1">

            {/* DASHBOARD */}

            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white text-sm font-medium"
            >
              <span>📊</span>
              Dashboard
            </button>

            {/* ALL SONGS */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/songs"
                )
              }
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>🎵</span>
              All Songs
            </button>

            {/* UPLOAD SONG */}

            <button
              type="button"
              onClick={() =>
                router.push("/upload")
              }
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>⬆️</span>
              Upload Song
            </button>

            {/* CUSTOMERS */}

            <button
              type="button"
              onClick={() =>
                router.push("/customers")
              }
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>👥</span>
              Customers
            </button>

            {/* CUSTOMER DASHBOARD */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/customer-dashboard"
                )
              }
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>🏠</span>
              Customer Dashboard
            </button>

          </nav>

          <div className="p-4 border-t border-white/10">

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-sm font-medium"
            >
              🚪 Logout
            </button>

          </div>
        </aside>

        {/* =====================================================
            MAIN
        ====================================================== */}

        <main className="flex-1 min-w-0">

          {/* HEADER */}

          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#09090b]/90 backdrop-blur-xl">

            <div className="px-4 sm:px-6 lg:px-8 py-4">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-xs text-white/40 mb-1">
                    Admin Dashboard
                  </p>

                  <h2 className="text-xl sm:text-2xl font-bold">
                    Welcome back 👋
                  </h2>

                </div>

                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      loadDashboard(true)
                    }
                    disabled={refreshing}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm disabled:opacity-50"
                  >
                    {refreshing
                      ? "Refreshing..."
                      : "🔄 Refresh"}
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="lg:hidden px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm"
                  >
                    Logout
                  </button>

                </div>

              </div>

            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">

            {/* =================================================
                STAT CARDS
            ================================================== */}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

              {/* TOTAL */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <div className="flex items-center justify-between mb-4">

                  <span className="text-sm text-white/50">
                    Total Songs
                  </span>

                  <span className="text-xl">
                    🎵
                  </span>

                </div>

                <p className="text-3xl font-bold">
                  {stats.totalSongs}
                </p>

              </div>

              {/* PENDING */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <div className="flex items-center justify-between mb-4">

                  <span className="text-sm text-white/50">
                    Pending
                  </span>

                  <span className="text-xl">
                    ⏳
                  </span>

                </div>

                <p className="text-3xl font-bold text-yellow-400">
                  {stats.pending}
                </p>

              </div>

              {/* APPROVED */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <div className="flex items-center justify-between mb-4">

                  <span className="text-sm text-white/50">
                    Approved
                  </span>

                  <span className="text-xl">
                    ✅
                  </span>

                </div>

                <p className="text-3xl font-bold text-emerald-400">
                  {stats.approved}
                </p>

              </div>

              {/* REJECTED */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <div className="flex items-center justify-between mb-4">

                  <span className="text-sm text-white/50">
                    Rejected
                  </span>

                  <span className="text-xl">
                    ❌
                  </span>

                </div>

                <p className="text-3xl font-bold text-red-400">
                  {stats.rejected}
                </p>

              </div>

            </div>

            {/* =================================================
                SECONDARY STATS
            ================================================== */}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

                <p className="text-xs text-white/40 mb-1">
                  Artists
                </p>

                <p className="text-xl font-bold">
                  {stats.artists}
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

                <p className="text-xs text-white/40 mb-1">
                  Albums
                </p>

                <p className="text-xl font-bold">
                  {stats.albums}
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

                <p className="text-xs text-white/40 mb-1">
                  Customers
                </p>

                <p className="text-xl font-bold">
                  {stats.customers}
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">

                <p className="text-xs text-white/40 mb-1">
                  Dashboard
                </p>

                <p className="text-xl font-bold">
                  Active
                </p>

              </div>

            </div>

            {/* =================================================
                RECENT SONGS
            ================================================== */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">

              <div className="p-5 sm:p-6 border-b border-white/10">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <h3 className="text-lg font-bold">
                      Recent Songs
                    </h3>

                    <p className="text-sm text-white/40 mt-1">
                      Latest uploaded music
                    </p>

                  </div>

                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/50">
                    Latest 5
                  </span>

                </div>

              </div>

              {songs.length === 0 ? (

                <div className="p-10 text-center">

                  <div className="text-4xl mb-3">
                    🎵
                  </div>

                  <p className="text-white/50">
                    Abhi koi song available nahi hai.
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1100px]">

                    <thead>

                      <tr className="border-b border-white/10 text-left">

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Cover
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Song
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Artist
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Status
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Rejection Reason
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Customer / Label
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Play
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Approval
                        </th>

                        <th className="px-5 py-4 text-xs font-medium text-white/40">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {songs.map((song) => (

                        <tr
                          key={song.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition"
                        >

                          {/* COVER */}

                          <td className="px-5 py-4">

                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10">

                              {song.signed_cover_url ? (

                                <img
                                  src={
                                    song.signed_cover_url
                                  }
                                  alt={
                                    song.song_title ||
                                    "Song"
                                  }
                                  className="w-full h-full object-cover"
                                />

                              ) : (

                                <div className="w-full h-full flex items-center justify-center text-xl">
                                  🎵
                                </div>

                              )}

                            </div>

                          </td>

                          {/* SONG */}

                          <td className="px-5 py-4">

                            <div className="max-w-[220px]">

                              <p className="font-semibold truncate">
                                {song.song_title ||
                                  "Untitled Song"}
                              </p>

                              <p className="text-xs text-white/40 truncate mt-1">
                                {song.album_name ||
                                  "No Album"}
                              </p>

                            </div>

                          </td>

                          {/* ARTIST */}

                          <td className="px-5 py-4">

                            <p className="text-sm text-white/70">
                              {song.artist_name ||
                                "Unknown Artist"}
                            </p>

                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(
                                song.status
                              )}`}
                            >
                              {song.status ||
                                "Pending"}
                            </span>

                          </td>

                          {/* REJECTION */}

                          <td className="px-5 py-4">

                            {song.rejection_reason ? (

                              <p className="max-w-[220px] text-xs text-red-300/80">
                                {
                                  song.rejection_reason
                                }
                              </p>

                            ) : (

                              <span className="text-xs text-white/30">
                                —
                              </span>

                            )}

                          </td>

                          {/* CUSTOMER */}

                          <td className="px-5 py-4">

                            <div>

                              <p className="text-sm">
                                {song.customer_name ||
                                  "—"}
                              </p>

                              {song.label_name && (

                                <p className="text-xs text-white/40 mt-1">
                                  {song.label_name}
                                </p>

                              )}

                            </div>

                          </td>

                          {/* AUDIO */}

                          <td className="px-5 py-4">

                            {song.signed_audio_url ? (

                              <audio
                                controls
                                preload="none"
                                className="w-[230px] h-9"
                                src={
                                  song.signed_audio_url
                                }
                              />

                            ) : (

                              <span className="text-xs text-white/30">
                                Audio unavailable
                              </span>

                            )}

                          </td>

                          {/* APPROVAL */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  approveSong(
                                    song.id
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition text-xs font-medium"
                              >
                                ✓ Approve
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  rejectSong(
                                    song.id
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-xs font-medium"
                              >
                                ✕ Reject
                              </button>

                            </div>

                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-4">

                            <div className="flex flex-col gap-2 w-[120px]">

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedSong(
                                    song
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition text-xs font-medium"
                              >
                                👁️ Details
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteSong(
                                    song.id
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-xs font-medium"
                              >
                                🗑️ Delete
                              </button>

                            </div>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </div>

        </main>

      </div>

      {/* =====================================================
          SONG DETAILS MODAL
      ====================================================== */}

      {selectedSong && (

        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            setSelectedSong(null)
          }
        >

          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#111114] shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 px-5 sm:px-6 py-4 border-b border-white/10 bg-[#111114]/95 backdrop-blur-xl flex items-center justify-between">

              <div>

                <h2 className="text-lg sm:text-xl font-bold">
                  Song Details
                </h2>

                <p className="text-xs text-white/40 mt-1">
                  Song information & files
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSong(null)
                }
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
              >
                ✕
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="p-5 sm:p-6">

              <div className="grid md:grid-cols-[220px_1fr] gap-6">

                {/* POSTER */}

                <div>

                  <div className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">

                    {selectedSong.signed_cover_url ? (

                      <img
                        src={
                          selectedSong.signed_cover_url
                        }
                        alt={
                          selectedSong.song_title ||
                          "Song Poster"
                        }
                        className="w-full h-full object-cover"
                      />

                    ) : (

                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        🎵
                      </div>

                    )}

                  </div>

                  {/* DOWNLOAD POSTER */}

                  <button
                    type="button"
                    disabled={
                      downloadLoading ===
                      "cover"
                    }
                    onClick={() => {

                      const ext =
                        getFileExtension(
                          selectedSong.cover_url,
                          ".jpg"
                        );

                      const name =
                        safeFileName(
                          selectedSong.song_title
                        );

                      downloadFile(
                        selectedSong.cover_url,
                        `${name}-poster${ext}`,
                        "cover"
                      );
                    }}
                    className="w-full mt-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition text-sm font-medium disabled:opacity-50"
                  >
                    {downloadLoading ===
                    "cover"
                      ? "Downloading..."
                      : "⬇️ Download Poster"}
                  </button>

                </div>

                {/* SONG INFO */}

                <div>

                  <div className="mb-5">

                    <span
                      className={`inline-flex px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(
                        selectedSong.status
                      )}`}
                    >
                      {selectedSong.status ||
                        "Pending"}
                    </span>

                  </div>

                  <div className="space-y-4">

                    <div>

                      <p className="text-xs text-white/40 mb-1">
                        Song Name
                      </p>

                      <p className="font-semibold text-lg">
                        {selectedSong.song_title ||
                          "Untitled Song"}
                      </p>

                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">

                      <div>

                        <p className="text-xs text-white/40 mb-1">
                          Artist
                        </p>

                        <p className="text-sm">
                          {selectedSong.artist_name ||
                            "—"}
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-white/40 mb-1">
                          Album
                        </p>

                        <p className="text-sm">
                          {selectedSong.album_name ||
                            "—"}
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-white/40 mb-1">
                          Customer
                        </p>

                        <p className="text-sm">
                          {selectedSong.customer_name ||
                            "—"}
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-white/40 mb-1">
                          Label
                        </p>

                        <p className="text-sm">
                          {selectedSong.label_name ||
                            "—"}
                        </p>

                      </div>

                    </div>

                    {/* REJECTION REASON */}

                    {selectedSong.rejection_reason && (

                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">

                        <p className="text-xs text-red-300/60 mb-1">
                          Rejection Reason
                        </p>

                        <p className="text-sm text-red-300">
                          {
                            selectedSong.rejection_reason
                          }
                        </p>

                      </div>

                    )}

                  </div>

                </div>

              </div>

              {/* AUDIO SECTION */}

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">

                <div className="flex items-center justify-between gap-4 mb-4">

                  <div>

                    <h3 className="font-semibold">
                      Audio
                    </h3>

                    <p className="text-xs text-white/40 mt-1">
                      Listen or download the original audio
                    </p>

                  </div>

                  <span className="text-xl">
                    🎧
                  </span>

                </div>

                {selectedSong.signed_audio_url ? (

                  <audio
                    controls
                    className="w-full"
                    src={
                      selectedSong.signed_audio_url
                    }
                  />

                ) : (

                  <div className="rounded-xl bg-white/5 p-4 text-sm text-white/40">
                    Audio file available nahi hai.
                  </div>

                )}

                {/* DOWNLOAD AUDIO */}

                <button
                  type="button"
                  disabled={
                    downloadLoading ===
                    "audio"
                  }
                  onClick={() => {

                    const ext =
                      getFileExtension(
                        selectedSong.audio_url,
                        ".mp3"
                      );

                    const name =
                      safeFileName(
                        selectedSong.song_title
                      );

                    downloadFile(
                      selectedSong.audio_url,
                      `${name}${ext}`,
                      "audio"
                    );
                  }}
                  className="w-full mt-4 px-4 py-3 rounded-xl bg-white text-black hover:bg-white/90 transition text-sm font-semibold disabled:opacity-50"
                >
                  {downloadLoading ===
                  "audio"
                    ? "Downloading..."
                    : "⬇️ Download Audio"}
                </button>

              </div>

              {/* MODAL ACTIONS */}

              <div className="grid sm:grid-cols-3 gap-3 mt-6">

                <button
                  type="button"
                  onClick={() =>
                    approveSong(
                      selectedSong.id
                    )
                  }
                  className="px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition text-sm font-medium"
                >
                  ✓ Approve
                </button>

                <button
                  type="button"
                  onClick={() =>
                    rejectSong(
                      selectedSong.id
                    )
                  }
                  className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-sm font-medium"
                >
                  ✕ Reject
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deleteSong(
                      selectedSong.id
                    )
                  }
                  className="px-4 py-3 rounded-xl bg-red-500/5 text-red-400 hover:bg-red-500/15 transition text-sm font-medium"
                >
                  🗑️ Delete
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}