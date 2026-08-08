"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UploadPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [singerName, setSingerName] = useState("");
  const [composer, setComposer] = useState("");
  const [lyricist, setLyricist] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [cover, setCover] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cover || !audio) {
      alert("Please select Cover Image and Audio File");
      return;
    }

    setLoading(true);

    try {
      // Cover Upload
      const coverName = `${Date.now()}-${cover.name}`;

      const { error: coverError } = await supabase.storage
        .from("songs")
        .upload(`covers/${coverName}`, cover);

      if (coverError) throw coverError;

      const { data: coverData } = supabase.storage
        .from("songs")
        .getPublicUrl(`covers/${coverName}`);

      // Audio Upload
      const audioName = `${Date.now()}-${audio.name}`;

      const { error: audioError } = await supabase.storage
        .from("songs")
        .upload(`audio/${audioName}`, audio);

      if (audioError) throw audioError;

      const { data: audioData } = supabase.storage
        .from("songs")
        .getPublicUrl(`audio/${audioName}`);

      // Save in Database
      const { error } = await supabase.from("songs").insert([
        {
          song_title: songTitle,
          artist_name: artistName,
          album_name: albumName,
          singer_name: singerName,
          composer: composer,
          lyricist: lyricist,
          genre: genre,
          language: language,
          release_date: releaseDate,
          cover_url: coverData.publicUrl,
          audio_url: audioData.publicUrl,
          status: "Pending",
        },
      ]);

      if (error) throw error;

      alert("Song Uploaded Successfully ✅");

      setSongTitle("");
      setArtistName("");
      setAlbumName("");
      setSingerName("");
      setComposer("");
      setLyricist("");
      setGenre("");
      setLanguage("");
      setReleaseDate("");
      setCover(null);
      setAudio(null);
    } catch (err) {
      console.error(err);
      alert("Upload Failed ❌");
    } finally {
      setLoading(false);
    }
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
        padding: "40px",
      }}
    >
      <h1 style={{ color: "#22c55e" }}>🎵 Upload Song</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          maxWidth: "600px",
          marginTop: "30px",
        }}
      >
        <input
          placeholder="Song Title"
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
        />

        <input
          placeholder="Artist Name"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
        />

        <input
          placeholder="Album Name"
          value={albumName}
          onChange={(e) => setAlbumName(e.target.value)}
        />

        <input
          placeholder="Singer Name"
          value={singerName}
          onChange={(e) => setSingerName(e.target.value)}
        />

        <input
          placeholder="Composer"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
        />

        <input
          placeholder="Lyricist"
          value={lyricist}
          onChange={(e) => setLyricist(e.target.value)}
        />

        <input
          placeholder="Genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />

        <input
          placeholder="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />

        <input
          type="date"
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
        />

        <label>Cover Image</label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCover(e.target.files?.[0] || null)}
        />

        <label>Audio File</label>

        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setAudio(e.target.files?.[0] || null)}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#6b7280" : "#22c55e",
            color: "#fff",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Uploading..." : "Upload Song"}
        </button>
      </form>
    </main>
  );
}