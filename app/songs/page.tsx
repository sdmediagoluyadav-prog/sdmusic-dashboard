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
  status: string | null;
  [key: string]: any;
};

type StorageBucket = "songs" | "covers";

function getStoragePathInfo(value: string) {
  let path = value.trim();
  let bucketFromUrl: StorageBucket | null = null;

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const marker = "/storage/v1/object/";
      const index = url.pathname.indexOf(marker);

      // Normal external image URL: use it directly.
      if (index === -1) {
        return { externalUrl: path, path: "", bucketFromUrl: null };
      }

      let objectPath = url.pathname.substring(index + marker.length);
      objectPath = objectPath.replace(/^(public|sign|authenticated)\//, "");

      const slash = objectPath.indexOf("/");
      if (slash !== -1) {
        const bucket = objectPath.substring(0, slash);

        if (bucket === "songs" || bucket === "covers") {
          bucketFromUrl = bucket;
          objectPath = objectPath.substring(slash + 1);
        }
      }

      path = decodeURIComponent(objectPath);
    } catch {
      return { externalUrl: path, path: "", bucketFromUrl: null };
    }
  }

  path = path.replace(/^\/+/, "").replace(/\?.*$/, "");

  return { externalUrl: null, path, bucketFromUrl };
}

async function getPosterUrl(value: string | null): Promise<string | null> {
  if (!value?.trim()) return null;

  const info = getStoragePathInfo(value);

  if (info.externalUrl) {
    return info.externalUrl;
  }

  const originalPath = info.path;
  if (!originalPath) return null;

  const candidates: Array<{ bucket: StorageBucket; path: string }> = [];

  function add(bucket: StorageBucket, path: string) {
    const clean = path.replace(/^\/+/, "").replace(/\?.*$/, "");

    if (
      clean &&
      !candidates.some(
        (item) => item.bucket === bucket && item.path === clean
      )
    ) {
      candidates.push({ bucket, path: clean });
    }
  }

  const buckets: StorageBucket[] = info.bucketFromUrl
    ? [info.bucketFromUrl, info.bucketFromUrl === "songs" ? "covers" : "songs"]
    : ["songs", "covers"];

  for (const bucket of buckets) {
    // Try the exact saved path first.
    add(bucket, originalPath);

    // Remove only repeated bucket prefixes.
    let normalized = originalPath;
    while (normalized.startsWith(`${bucket}/`)) {
      normalized = normalized.substring(bucket.length + 1);
    }
    add(bucket, normalized);

    // Handle paths stored with a bucket/folder prefix.
    for (const prefix of ["covers/covers/", "songs/covers/", "covers/", "songs/"]) {
      if (originalPath.startsWith(prefix)) {
        add(bucket, originalPath.substring(prefix.length));
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const { data, error } = await supabase.storage
        .from(candidate.bucket)
        .createSignedUrl(candidate.path, 3600);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }

      console.warn("Poster path not found:", candidate.bucket, candidate.path, error?.message);
    } catch (error) {
      console.warn("Poster lookup failed:", candidate.bucket, candidate.path, error);
    }
  }

  return null;
}

function SongPoster({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPoster() {
      setLoading(true);
      setFailed(false);
      setImageUrl(null);

      const url = await getPosterUrl(coverUrl);

      if (!active) return;

      if (url) {
        setImageUrl(url);
      } else {
        setFailed(true);
      }

      setLoading(false);
    }

    loadPoster();

    return () => {
      active = false;
    };
  }, [coverUrl]);

  return (
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: "8px",
        overflow: "hidden",
        background: "#374151",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
        fontSize: "10px",
        color: "#d1d5db",
        textAlign: "center",
      }}
    >
      {loading ? (
        "Loading..."
      ) : imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={title || "Song Cover"}
          width={60}
          height={60}
          onError={() => setFailed(true)}
          style={{
            width: 60,
            height: 60,
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        "No Cover"
      )}
    </div>
  );
}

export default function SongsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      await fetchSongs();

      if (mounted) {
        setCheckingAuth(false);
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function fetchSongs() {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Songs fetch error:", error);
      return;
    }

    setSongs((data || []) as Song[]);
  }

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#111827",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "22px",
        }}
      >
        Checking Login... 🔐
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "white",
        padding: "30px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <h1 style={{ color: "#22c55e" }}>🎵 Uploaded Songs</h1>

        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "#22c55e",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Dashboard
        </button>
      </div>

      <div
        style={{
          background: "#1f2937",
          padding: "20px",
          borderRadius: "10px",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            marginTop: "10px",
            borderCollapse: "collapse",
            minWidth: "800px",
          }}
        >
          <thead>
            <tr>
              <th align="left">Cover</th>
              <th align="left">Song</th>
              <th align="left">Artist</th>
              <th align="left">Album</th>
              <th align="left">Status</th>
            </tr>
          </thead>

          <tbody>
            {songs.map((song) => (
              <tr key={song.id}>
                <td style={{ padding: "10px" }}>
                  <SongPoster
                    coverUrl={song.cover_url}
                    title={song.song_title || "Song Cover"}
                  />
                </td>

                <td>{song.song_title || "—"}</td>
                <td>{song.artist_name || "—"}</td>
                <td>{song.album_name || "—"}</td>
                <td>{song.status || "—"}</td>
              </tr>
            ))}

            {songs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "30px",
                    textAlign: "center",
                  }}
                >
                  अभी कोई song upload नहीं हुआ है।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}