"use client";

import { useEffect, useMemo, useState } from "react";
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

  label_type: "Main Label" | "Sub Label" | null;
  upload_label: string | null;
  sub_label_name: string | null;
};

type Customer = {
  id: number;
  customer_name: string | null;
  label_name: string | null;
};

type SubLabel = {
  id: number;
  customer_id: number;
  sub_label_name: string | null;
};

function normalizeStoragePath(
  value: string | null,
  bucket: "covers" | "songs"
) {
  if (!value) return "";

  let path = value.trim();

  if (!path) return "";

  // Full Supabase URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const marker = `/storage/v1/object/`;

    const markerIndex = path.indexOf(marker);

    if (markerIndex !== -1) {
      path = path.substring(markerIndex + marker.length);

      // public / sign / authenticated
      path = path.replace(/^public\//, "");
      path = path.replace(/^sign\//, "");
      path = path.replace(/^authenticated\//, "");

      const bucketPrefix = `${bucket}/`;

      if (path.startsWith(bucketPrefix)) {
        path = path.substring(bucketPrefix.length);
      }

      return decodeURIComponent(path);
    }

    return path;
  }

  // Remove bucket prefix if it was saved as:
  // covers/file.jpg
  // songs/file.mp3
  const prefix = `${bucket}/`;

  if (path.startsWith(prefix)) {
    path = path.substring(prefix.length);
  }

  // Sometimes stored value can contain:
  // /covers/file.jpg
  // /songs/file.mp3
  path = path.replace(new RegExp(`^/${bucket}/`), "");

  return path;
}

async function getSignedStorageUrl(
  value: string | null,
  bucket: "covers" | "songs"
) {
  if (!value) return null;

  const normalizedPath = normalizeStoragePath(value, bucket);

  if (!normalizedPath) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalizedPath, 3600);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  // If original value itself is already a valid URL,
  // use it as fallback.
  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  console.error(
    `Unable to create signed URL for ${bucket}:`,
    error
  );

  return null;
}

function CoverImage({
  coverUrl,
  title,
}: {
  coverUrl: string | null;
  title: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCover() {
      setLoading(true);

      if (!coverUrl) {
        if (active) {
          setUrl(null);
          setLoading(false);
        }
        return;
      }

      const signedUrl = await getSignedStorageUrl(
        coverUrl,
        "covers"
      );

      if (active) {
        setUrl(signedUrl);
        setLoading(false);
      }
    }

    loadCover();

    return () => {
      active = false;
    };
  }, [coverUrl]);

  if (loading) {
    return (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          background: "#1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 11,
        }}
      >
        Loading
      </div>
    );
  }

  if (!url) {
    return (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          background: "#1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 11,
          textAlign: "center",
          padding: 5,
        }}
      >
        No Poster
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={title}
      style={{
        width: 64,
        height: 64,
        objectFit: "cover",
        borderRadius: 10,
        display: "block",
        background: "#111827",
      }}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [songs, setSongs] = useState<Song[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);

  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");

  const [selectedSong, setSelectedSong] =
    useState<Song | null>(null);

  const [playingSongId, setPlayingSongId] =
    useState<number | null>(null);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [actionLoading, setActionLoading] =
    useState<number | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      setCheckingAuth(true);

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

      const result = await response.json();

      if (result.role === "customer") {
        router.replace("/customer-dashboard");
        return;
      }

      if (result.role === "sub_label") {
        router.replace("/sub-label-dashboard");
        return;
      }

      if (result.role !== "admin") {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
      await loadDashboard();
    } catch (error) {
      console.error("Admin auth error:", error);
      router.replace("/login");
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);

      const [
        songsResult,
        customersResult,
        subLabelsResult,
        customerSongsResult,
        subLabelSongsResult,
      ] = await Promise.all([
        supabase
          .from("songs")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("customers")
          .select("id, customer_name, label_name")
          .order("id", { ascending: false }),

        supabase
          .from("sub_labels")
          .select("id, customer_id, sub_label_name")
          .order("id", { ascending: false }),

        supabase
          .from("customer_songs")
          .select("customer_id, song_id"),

        supabase
          .from("sub_label_songs")
          .select("sub_label_id, song_id"),
      ]);

      if (songsResult.error) {
        console.error("Songs error:", songsResult.error);
        alert(
          "Songs load nahi ho paaye: " +
            songsResult.error.message
        );
        return;
      }

      if (customersResult.error) {
        console.error(
          "Customers error:",
          customersResult.error
        );
      }

      if (subLabelsResult.error) {
        console.error(
          "Sub labels error:",
          subLabelsResult.error
        );
      }

      if (customerSongsResult.error) {
        console.error(
          "Customer songs error:",
          customerSongsResult.error
        );
      }

      if (subLabelSongsResult.error) {
        console.error(
          "Sub label songs error:",
          subLabelSongsResult.error
        );
      }

      const customerList =
        (customersResult.data || []) as Customer[];

      const subLabelList =
        (subLabelsResult.data || []) as SubLabel[];

      const customerSongRelations =
        customerSongsResult.data || [];

      const subLabelSongRelations =
        subLabelSongsResult.data || [];

      const mappedSongs: Song[] = (songsResult.data || []).map(
        (song: any) => {
          const customerRelation =
            customerSongRelations.find(
              (item: any) => item.song_id === song.id
            );

          const subLabelRelation =
            subLabelSongRelations.find(
              (item: any) => item.song_id === song.id
            );

          const customer = customerRelation
            ? customerList.find(
                (item) =>
                  item.id === customerRelation.customer_id
              )
            : null;

          const subLabel = subLabelRelation
            ? subLabelList.find(
                (item) =>
                  item.id === subLabelRelation.sub_label_id
              )
            : null;

          if (subLabel) {
            const parentCustomer = customerList.find(
              (item) =>
                item.id === subLabel.customer_id
            );

            return {
              ...song,
              customer_name:
                parentCustomer?.customer_name || null,
              label_name:
                parentCustomer?.label_name || null,
              label_type: "Sub Label",
              upload_label:
                subLabel.sub_label_name || null,
              sub_label_name:
                subLabel.sub_label_name || null,
            };
          }

          return {
            ...song,
            customer_name:
              customer?.customer_name || null,
            label_name:
              customer?.label_name || null,
            label_type: "Main Label",
            upload_label:
              customer?.label_name ||
              customer?.customer_name ||
              null,
            sub_label_name: null,
          };
        }
      );

      setSongs(mappedSongs);
      setCustomers(customerList);
      setSubLabels(subLabelList);
    } catch (error) {
      console.error("Dashboard load error:", error);
      alert("Dashboard load karte waqt error aa gaya.");
    } finally {
      setLoading(false);
    }
  }

  const labelOptions = useMemo(() => {
    const options: {
      value: string;
      label: string;
    }[] = [];

    const mainLabels = new Set<string>();
    const subLabelsSet = new Set<string>();

    songs.forEach((song) => {
      if (
        song.label_type === "Main Label" &&
        song.label_name
      ) {
        mainLabels.add(song.label_name);
      }

      if (
        song.label_type === "Sub Label" &&
        song.sub_label_name
      ) {
        subLabelsSet.add(song.sub_label_name);
      }
    });

    Array.from(mainLabels)
      .sort()
      .forEach((label) => {
        options.push({
          value: `main:${label}`,
          label: `Main Label - ${label}`,
        });
      });

    Array.from(subLabelsSet)
      .sort()
      .forEach((label) => {
        options.push({
          value: `sub:${label}`,
          label: `Sub Label - ${label}`,
        });
      });

    return options;
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return songs.filter((song) => {
      const matchesSearch =
        !query ||
        [
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
          song.sub_label_name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );

      let matchesLabel = true;

      if (labelFilter !== "all") {
        if (labelFilter.startsWith("main:")) {
          const label = labelFilter.substring(5);

          matchesLabel =
            song.label_type === "Main Label" &&
            song.label_name === label;
        }

        if (labelFilter.startsWith("sub:")) {
          const label = labelFilter.substring(4);

          matchesLabel =
            song.label_type === "Sub Label" &&
            song.sub_label_name === label;
        }
      }

      return matchesSearch && matchesLabel;
    });
  }, [songs, search, labelFilter]);

  const stats = useMemo(() => {
    const artists = new Set(
      songs
        .map((song) => song.artist_name)
        .filter(Boolean)
    );

    const albums = new Set(
      songs
        .map((song) => song.album_name)
        .filter(Boolean)
    );

    return {
      total: songs.length,
      pending: songs.filter(
        (song) =>
          String(song.status || "").toLowerCase() ===
          "pending"
      ).length,
      approved: songs.filter(
        (song) =>
          String(song.status || "").toLowerCase() ===
          "approved"
      ).length,
      rejected: songs.filter(
        (song) =>
          String(song.status || "").toLowerCase() ===
          "rejected"
      ).length,
      artists: artists.size,
      albums: albums.size,
      customers: customers.length,
    };
  }, [songs, customers]);

  async function approveSong(song: Song) {
    try {
      setActionLoading(song.id);

      const { error } = await supabase
        .from("songs")
        .update({
          status: "Approved",
          rejection_reason: null,
        })
        .eq("id", song.id);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setSongs((current) =>
        current.map((item) =>
          item.id === song.id
            ? {
                ...item,
                status: "Approved",
                rejection_reason: null,
              }
            : item
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectSong(song: Song) {
    const reason = window.prompt(
      "Reject karne ka reason likhiye:"
    );

    if (reason === null) return;

    const finalReason =
      reason.trim() || "Rejected by admin";

    try {
      setActionLoading(song.id);

      const { error } = await supabase
        .from("songs")
        .update({
          status: "Rejected",
          rejection_reason: finalReason,
        })
        .eq("id", song.id);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setSongs((current) =>
        current.map((item) =>
          item.id === song.id
            ? {
                ...item,
                status: "Rejected",
                rejection_reason: finalReason,
              }
            : item
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteSong(song: Song) {
    const confirmed = window.confirm(
      `"${song.song_title || "This song"}" ko delete karna hai?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(song.id);

      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", song.id);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setSongs((current) =>
        current.filter((item) => item.id !== song.id)
      );

      if (selectedSong?.id === song.id) {
        setSelectedSong(null);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function playSong(song: Song) {
    try {
      if (playingSongId === song.id) {
        setPlayingSongId(null);
        setAudioUrl(null);
        return;
      }

      const signedUrl = await getSignedStorageUrl(
        song.audio_url,
        "songs"
      );

      if (!signedUrl) {
        alert("Audio file nahi mili.");
        return;
      }

      setAudioUrl(signedUrl);
      setPlayingSongId(song.id);
    } catch (error) {
      console.error("Play audio error:", error);
      alert("Audio play nahi ho pa raha hai.");
    }
  }

  async function downloadAudio(song: Song) {
    try {
      if (!song.audio_url) {
        alert("Is song ka audio available nahi hai.");
        return;
      }

      const signedUrl = await getSignedStorageUrl(
        song.audio_url,
        "songs"
      );

      if (!signedUrl) {
        alert("Audio file nahi mili.");
        return;
      }

      const response = await fetch(signedUrl);

      if (!response.ok) {
        throw new Error(
          `Audio download failed: ${response.status}`
        );
      }

      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${song.song_title || "song"}.mp3`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Audio download error:", error);

      // Fallback
      const signedUrl = await getSignedStorageUrl(
        song.audio_url,
        "songs"
      );

      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        alert("Audio download nahi ho paaya.");
      }
    }
  }

  async function downloadPoster(song: Song) {
    try {
      if (!song.cover_url) {
        alert("Is song ka poster available nahi hai.");
        return;
      }

      const signedUrl = await getSignedStorageUrl(
        song.cover_url,
        "covers"
      );

      if (!signedUrl) {
        alert("Poster file nahi mili.");
        return;
      }

      const response = await fetch(signedUrl);

      if (!response.ok) {
        throw new Error(
          `Poster download failed: ${response.status}`
        );
      }

      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const extension =
        blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
          ? "webp"
          : "jpg";

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${
        song.song_title || "poster"
      }.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Poster download error:", error);

      // Fallback
      const signedUrl = await getSignedStorageUrl(
        song.cover_url,
        "covers"
      );

      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        alert("Poster download nahi ho paaya.");
      }
    }
  }

  function getStatusStyle(status: string | null) {
    const value = String(status || "").toLowerCase();

    if (value === "approved") {
      return {
        background: "rgba(34,197,94,0.15)",
        color: "#4ade80",
        border: "1px solid rgba(34,197,94,0.3)",
      };
    }

    if (value === "rejected") {
      return {
        background: "rgba(239,68,68,0.15)",
        color: "#f87171",
        border: "1px solid rgba(239,68,68,0.3)",
      };
    }

    return {
      background: "rgba(234,179,8,0.15)",
      color: "#facc15",
      border: "1px solid rgba(234,179,8,0.3)",
    };
  }

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b1120",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        Checking admin access...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1120",
        color: "#e5e7eb",
        display: "flex",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: 250,
          minHeight: "100vh",
          background: "#111827",
          borderRight: "1px solid #1f2937",
          padding: 18,
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 30,
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media"
            style={{
              width: 46,
              height: 46,
              objectFit: "contain",
              borderRadius: 10,
            }}
          />

          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              SD Media
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#64748b",
              }}
            >
              Admin Panel
            </div>
          </div>
        </div>

        <SidebarButton
          active
          label="Dashboard"
          onClick={() => router.push("/dashboard")}
        />

        <SidebarButton
          label="All Songs"
          onClick={() => router.push("/songs")}
        />

        <SidebarButton
          label="Upload Song"
          onClick={() => router.push("/upload")}
        />

        <SidebarButton
          label="Customers"
          onClick={() => router.push("/customers")}
        />

        <SidebarButton
          label="Copyright Requests"
          onClick={() =>
            router.push("/dashboard/copyright-requests")
          }
        />

        <SidebarButton
          label="Customer Dashboard"
          onClick={() =>
            router.push("/customer-dashboard")
          }
        />

        <div style={{ height: 20 }} />

        <SidebarButton
          label="Logout"
          danger
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        />
      </aside>

      {/* MAIN */}
      <main
        style={{
          marginLeft: 250,
          width: "calc(100% - 250px)",
          padding: 28,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            marginBottom: 26,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Music Dashboard
            </h1>

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748b",
              }}
            >
              All uploaded songs, labels and sub-labels
            </p>
          </div>

          <button
            onClick={loadDashboard}
            style={{
              border: "1px solid #334155",
              background: "#111827",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 9,
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(150px,1fr))",
            gap: 14,
            marginBottom: 25,
          }}
        >
          <StatCard
            title="Total Songs"
            value={stats.total}
          />

          <StatCard
            title="Pending"
            value={stats.pending}
          />

          <StatCard
            title="Approved"
            value={stats.approved}
          />

          <StatCard
            title="Rejected"
            value={stats.rejected}
          />

          <StatCard
            title="Artists"
            value={stats.artists}
          />

          <StatCard
            title="Albums"
            value={stats.albums}
          />

          <StatCard
            title="Customers"
            value={stats.customers}
          />
        </div>

        {/* SEARCH / FILTER */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 14,
            padding: 16,
            marginBottom: 18,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search song, artist, album, singer, label..."
            style={{
              flex: 1,
              minWidth: 280,
              background: "#0b1120",
              color: "#fff",
              border: "1px solid #334155",
              borderRadius: 9,
              padding: "12px 14px",
              outline: "none",
            }}
          />

          <select
            value={labelFilter}
            onChange={(e) =>
              setLabelFilter(e.target.value)
            }
            style={{
              minWidth: 250,
              background: "#0b1120",
              color: "#fff",
              border: "1px solid #334155",
              borderRadius: 9,
              padding: "12px 14px",
              outline: "none",
            }}
          >
            <option value="all">
              All Labels / Sub Labels
            </option>

            {labelOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch("");
              setLabelFilter("all");
            }}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#fff",
              borderRadius: 9,
              padding: "0 16px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>

        <div
          style={{
            color: "#64748b",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          Showing {filteredSongs.length} of {songs.length} songs
        </div>

        {/* TABLE */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 14,
            overflow: "auto",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 50,
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              Loading songs...
            </div>
          ) : filteredSongs.length === 0 ? (
            <div
              style={{
                padding: 50,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              No songs found.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1250,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      "1px solid #1f2937",
                  }}
                >
                  <th style={thStyle}>Poster</th>
                  <th style={thStyle}>Song</th>
                  <th style={thStyle}>Artist</th>
                  <th style={thStyle}>Label</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Play</th>
                  <th style={thStyle}>Approval</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSongs.map((song) => (
                  <tr
                    key={song.id}
                    style={{
                      borderBottom:
                        "1px solid #1f2937",
                    }}
                  >
                    {/* POSTER */}
                    <td style={tdStyle}>
                      <CoverImage
                        coverUrl={song.cover_url}
                        title={
                          song.song_title ||
                          "Song poster"
                        }
                      />
                    </td>

                    {/* SONG */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#fff",
                          maxWidth: 230,
                        }}
                      >
                        {song.song_title ||
                          "Untitled Song"}
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        {song.album_name ||
                          "No Album"}
                      </div>
                    </td>

                    {/* ARTIST */}
                    <td style={tdStyle}>
                      <div>
                        {song.artist_name ||
                          "-"}
                      </div>

                      {song.singer_name && (
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          Singer:{" "}
                          {song.singer_name}
                        </div>
                      )}
                    </td>

                    {/* LABEL */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontWeight: 700,
                          color:
                            song.label_type ===
                            "Sub Label"
                              ? "#c084fc"
                              : "#38bdf8",
                        }}
                      >
                        {song.label_type ||
                          "Main Label"}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          color: "#fff",
                        }}
                      >
                        {song.upload_label ||
                          song.label_name ||
                          "-"}
                      </div>

                      {song.label_type ===
                        "Sub Label" &&
                        song.label_name && (
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: 11,
                              marginTop: 4,
                            }}
                          >
                            Main:{" "}
                            {song.label_name}
                          </div>
                        )}
                    </td>

                    {/* STATUS */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...getStatusStyle(
                            song.status
                          ),
                          display:
                            "inline-block",
                          padding:
                            "5px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {song.status ||
                          "Pending"}
                      </span>

                      {song.rejection_reason && (
                        <div
                          style={{
                            color: "#f87171",
                            fontSize: 11,
                            marginTop: 7,
                            maxWidth: 180,
                          }}
                        >
                          {song.rejection_reason}
                        </div>
                      )}
                    </td>

                    {/* PLAY */}
                    <td style={tdStyle}>
                      <button
                        onClick={() =>
                          playSong(song)
                        }
                        style={{
                          ...smallButton,
                          background:
                            playingSongId ===
                            song.id
                              ? "#7c3aed"
                              : "#1e293b",
                        }}
                      >
                        {playingSongId ===
                        song.id
                          ? "⏹ Stop"
                          : "▶ Play"}
                      </button>

                      {playingSongId ===
                        song.id &&
                        audioUrl && (
                          <audio
                            src={audioUrl}
                            controls
                            autoPlay
                            style={{
                              width: 220,
                              marginTop: 8,
                            }}
                            onEnded={() => {
                              setPlayingSongId(
                                null
                              );
                              setAudioUrl(null);
                            }}
                          />
                        )}
                    </td>

                    {/* APPROVAL */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() =>
                            approveSong(song)
                          }
                          disabled={
                            actionLoading ===
                            song.id
                          }
                          style={{
                            ...smallButton,
                            background:
                              "#166534",
                          }}
                        >
                          ✓ Approve
                        </button>

                        <button
                          onClick={() =>
                            rejectSong(song)
                          }
                          disabled={
                            actionLoading ===
                            song.id
                          }
                          style={{
                            ...smallButton,
                            background:
                              "#991b1b",
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>

                    {/* ACTION */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() =>
                            setSelectedSong(
                              song
                            )
                          }
                          style={{
                            ...smallButton,
                            background:
                              "#1d4ed8",
                          }}
                        >
                          Details
                        </button>

                        <button
                          onClick={() =>
                            downloadAudio(song)
                          }
                          style={{
                            ...smallButton,
                            background:
                              "#065f46",
                          }}
                        >
                          🎵 Audio
                        </button>

                        <button
                          onClick={() =>
                            downloadPoster(song)
                          }
                          style={{
                            ...smallButton,
                            background:
                              "#7c2d12",
                          }}
                        >
                          🖼 Poster
                        </button>

                        <button
                          onClick={() =>
                            deleteSong(song)
                          }
                          disabled={
                            actionLoading ===
                            song.id
                          }
                          style={{
                            ...smallButton,
                            background:
                              "#7f1d1d",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* DETAILS MODAL */}
      {selectedSong && (
        <div
          onClick={() =>
            setSelectedSong(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "min(900px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 20,
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#fff",
                  }}
                >
                  {selectedSong.song_title ||
                    "Song Details"}
                </h2>

                <div
                  style={{
                    marginTop: 6,
                    color: "#64748b",
                  }}
                >
                  Song ID:{" "}
                  {selectedSong.id}
                </div>
              </div>

              <button
                onClick={() =>
                  setSelectedSong(null)
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border:
                    "1px solid #334155",
                  background: "#1e293b",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "180px 1fr",
                gap: 24,
                marginBottom: 24,
              }}
            >
              <div>
                <CoverImage
                  coverUrl={
                    selectedSong.cover_url
                  }
                  title={
                    selectedSong.song_title ||
                    "Poster"
                  }
                />

                <button
                  onClick={() =>
                    downloadPoster(
                      selectedSong
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: 10,
                    border: "none",
                    borderRadius: 8,
                    background:
                      "#7c2d12",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  🖼 Download Poster
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2,minmax(0,1fr))",
                  gap: 12,
                }}
              >
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
                  value={selectedSong.genre}
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
                    selectedSong.customer_name
                  }
                />

                <DetailItem
                  label="Main Label"
                  value={
                    selectedSong.label_name
                  }
                />

                <DetailItem
                  label="Upload Type"
                  value={
                    selectedSong.label_type
                  }
                />

                <DetailItem
                  label="Uploaded Label"
                  value={
                    selectedSong.upload_label
                  }
                />

                {selectedSong.label_type ===
                  "Sub Label" && (
                  <DetailItem
                    label="Sub Label"
                    value={
                      selectedSong.sub_label_name
                    }
                  />
                )}

                <DetailItem
                  label="Status"
                  value={
                    selectedSong.status
                  }
                />
              </div>
            </div>

            {selectedSong.rejection_reason && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background:
                    "rgba(239,68,68,0.1)",
                  border:
                    "1px solid rgba(239,68,68,0.25)",
                  color: "#fca5a5",
                  marginBottom: 20,
                }}
              >
                <strong>
                  Rejection Reason:
                </strong>{" "}
                {selectedSong.rejection_reason}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() =>
                  playSong(selectedSong)
                }
                style={{
                  padding: "11px 16px",
                  border: "none",
                  borderRadius: 8,
                  background:
                    "#4c1d95",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {playingSongId ===
                selectedSong.id
                  ? "⏹ Stop Audio"
                  : "▶ Play Audio"}
              </button>

              <button
                onClick={() =>
                  downloadAudio(
                    selectedSong
                  )
                }
                style={{
                  padding: "11px 16px",
                  border: "none",
                  borderRadius: 8,
                  background:
                    "#065f46",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                🎵 Download Audio
              </button>

              <button
                onClick={() =>
                  downloadPoster(
                    selectedSong
                  )
                }
                style={{
                  padding: "11px 16px",
                  border: "none",
                  borderRadius: 8,
                  background:
                    "#7c2d12",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                🖼 Download Poster
              </button>

              <button
                onClick={() =>
                  deleteSong(selectedSong)
                }
                style={{
                  padding: "11px 16px",
                  border: "none",
                  borderRadius: 8,
                  background:
                    "#7f1d1d",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Delete Song
              </button>
            </div>

            {playingSongId ===
              selectedSong.id &&
              audioUrl && (
                <audio
                  src={audioUrl}
                  controls
                  autoPlay
                  style={{
                    width: "100%",
                    marginTop: 18,
                  }}
                />
              )}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarButton({
  label,
  onClick,
  active = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "11px 13px",
        marginBottom: 6,
        borderRadius: 8,
        border: "1px solid transparent",
        background: active
          ? "#1e293b"
          : "transparent",
        color: danger
          ? "#f87171"
          : active
          ? "#fff"
          : "#94a3b8",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      {label}
    </button>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#fff",
          fontSize: 25,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div
      style={{
        background: "#0b1120",
        border: "1px solid #1f2937",
        borderRadius: 9,
        padding: 11,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#fff",
          fontSize: 13,
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 12px",
  color: "#64748b",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "13px 12px",
  verticalAlign: "middle",
  color: "#cbd5e1",
  fontSize: 13,
};

const smallButton: React.CSSProperties = {
  border: "none",
  color: "#fff",
  padding: "7px 9px",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
};