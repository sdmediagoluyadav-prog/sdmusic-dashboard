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

      // Check that logged-in user is a customer
      const { data: customer, error } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (error || !customer) {
        console.error("Customer check error:", error);
        alert("Customer account नहीं मिला ❌");
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

    if (!songTitle.trim()) {
      alert("Please enter Song Title");
      return;
    }

    if (!artistName.trim()) {
      alert("Please enter Artist Name");
      return;
    }

    if (!cover || !audio) {
      alert("Please select Cover Image and Audio File");
      return;
    }

    setLoading(true);

    try {
      // ==========================================
      // 1. CHECK LOGIN SESSION
      // ==========================================

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // ==========================================
      // 2. GET LOGGED-IN CUSTOMER
      // ==========================================

      const { data: customer, error: customerError } =
        await supabase
          .from("customers")
          .select("id, customer_name, label_name")
          .eq("auth_user_id", session.user.id)
          .single();

      if (customerError || !customer) {
        console.error("Customer fetch error:", customerError);
        throw new Error("Customer account नहीं मिला");
      }

      // ==========================================
      // 3. CREATE UNIQUE FILE NAMES
      // ==========================================

      const timestamp = Date.now();

      const coverName = `${timestamp}-${cover.name}`;
      const audioName = `${timestamp}-${audio.name}`;

      const coverPath = `covers/${coverName}`;
      const audioPath = `audio/${audioName}`;

      // ==========================================
      // 4. UPLOAD COVER
      // ==========================================

      const { error: coverError } = await supabase.storage
        .from("songs")
        .upload(coverPath, cover);

      if (coverError) {
        console.error("Cover upload error:", coverError);
        throw coverError;
      }

      // ==========================================
      // 5. UPLOAD AUDIO
      // ==========================================

      const { error: audioError } = await supabase.storage
        .from("songs")
        .upload(audioPath, audio);

      if (audioError) {
        console.error("Audio upload error:", audioError);

        // Remove cover if audio upload fails
        await supabase.storage
          .from("songs")
          .remove([coverPath]);

        throw audioError;
      }

      // ==========================================
      // 6. INSERT SONG INTO SONGS TABLE
      // ==========================================

      const { data: newSong, error: databaseError } =
        await supabase
          .from("songs")
          .insert([
            {
              song_title: songTitle.trim(),
              artist_name: artistName.trim(),
              album_name: albumName.trim(),
              singer_name: singerName.trim(),
              composer: composer.trim(),
              lyricist: lyricist.trim(),
              genre: genre.trim(),
              language: language.trim(),
              release_date: releaseDate || null,

              cover_url: coverPath,
              audio_url: audioPath,

              status: "Pending",
            },
          ])
          .select("id")
          .single();

      if (databaseError || !newSong) {
        console.error("Song database error:", databaseError);

        // Remove uploaded files if database insert fails
        await supabase.storage
          .from("songs")
          .remove([coverPath, audioPath]);

        throw databaseError || new Error("Song create failed");
      }

      // ==========================================
      // 7. AUTOMATICALLY LINK SONG TO CUSTOMER
      // ==========================================

      const { error: customerSongError } = await supabase
        .from("customer_songs")
        .insert([
          {
            customer_id: customer.id,
            song_id: newSong.id,
          },
        ]);

      if (customerSongError) {
        console.error(
          "Customer song linking error:",
          customerSongError
        );

        // Delete song if customer linking fails
        await supabase
          .from("songs")
          .delete()
          .eq("id", newSong.id);

        // Delete uploaded files
        await supabase.storage
          .from("songs")
          .remove([coverPath, audioPath]);

        throw customerSongError;
      }

      // ==========================================
      // 8. SUCCESS
      // ==========================================

      alert(
        `Song Uploaded Successfully ✅\n\nCustomer: ${customer.customer_name}`
      );

      // Clear form
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

      // Reset file inputs
      const fileInputs = document.querySelectorAll(
        'input[type="file"]'
      ) as NodeListOf<HTMLInputElement>;

      fileInputs.forEach((input) => {
        input.value = "";
      });

      // Go back to customer dashboard
      router.push("/customer-dashboard");
    } catch (error: any) {
      console.error("Upload error:", error);

      alert(
        error?.message
          ? `Upload Failed ❌\n\n${error.message}`
          : "Upload Failed ❌"
      );
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
      <div
        style={{
          maxWidth: "650px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <h1
            style={{
              color: "#22c55e",
              margin: 0,
            }}
          >
            🎵 Upload Song
          </h1>

          <button
            type="button"
            onClick={() => router.push("/customer-dashboard")}
            style={{
              background: "#334155",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            ← Dashboard
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            background: "#1e293b",
            padding: "25px",
            borderRadius: "14px",
          }}
        >
          <input
            placeholder="Song Title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Artist Name"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Album Name"
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Singer Name"
            value={singerName}
            onChange={(e) => setSingerName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Composer"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Lyricist"
            value={lyricist}
            onChange={(e) => setLyricist(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={inputStyle}
          />

          <label
            style={{
              color: "#cbd5e1",
              fontSize: "14px",
            }}
          >
            Release Date
          </label>

          <input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            style={inputStyle}
          />

          <label
            style={{
              color: "#cbd5e1",
              fontSize: "14px",
            }}
          >
            Cover Image
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setCover(e.target.files?.[0] || null)
            }
            style={fileInputStyle}
          />

          <label
            style={{
              color: "#cbd5e1",
              fontSize: "14px",
            }}
          >
            Audio File
          </label>

          <input
            type="file"
            accept="audio/*"
            onChange={(e) =>
              setAudio(e.target.files?.[0] || null)
            }
            style={fileInputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#6b7280" : "#22c55e",
              color: "#fff",
              border: "none",
              padding: "13px",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "15px",
              marginTop: "10px",
            }}
          >
            {loading ? "Uploading..." : "Upload Song"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle = {
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  padding: "12px",
  borderRadius: "8px",
  outline: "none",
  fontSize: "14px",
};

const fileInputStyle = {
  background: "#0f172a",
  color: "#cbd5e1",
  border: "1px solid #334155",
  padding: "10px",
  borderRadius: "8px",
  fontSize: "14px",
};