"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EditSongPage() {
  const router = useRouter();
  const params = useParams();

  const songId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");

  const [oldCoverUrl, setOldCoverUrl] = useState<string | null>(null);
  const [oldAudioUrl, setOldAudioUrl] = useState<string | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  useEffect(() => {
    loadSong();
  }, []);

  async function loadSong() {
    setLoading(true);

    try {
      // LOGIN CHECK
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // CUSTOMER CHECK
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, customer_name, label_name")
        .eq("auth_user_id", session.user.id)
        .single();

      if (customerError || !customer) {
        alert("Customer account nahi mila ❌");
        router.replace("/login");
        return;
      }

      // CHECK SONG BELONGS TO THIS CUSTOMER
      const { data: customerSong, error: customerSongError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customer.id)
          .eq("song_id", songId)
          .maybeSingle();

      if (customerSongError || !customerSong) {
        alert("Aapko is song ko edit karne ki permission nahi hai ❌");
        router.replace("/customer-dashboard");
        return;
      }

      // GET SONG
      const { data: song, error: songError } = await supabase
        .from("songs")
        .select(
          "id, song_title, artist_name, album_name, cover_url, audio_url, status, rejection_reason"
        )
        .eq("id", songId)
        .single();

      if (songError || !song) {
        alert("Song nahi mila ❌");
        router.replace("/customer-dashboard");
        return;
      }

      // ONLY REJECTED SONG CAN BE EDITED
      if (song.status !== "Rejected") {
        alert("Sirf Rejected song ko edit kiya ja sakta hai ❌");
        router.replace("/customer-dashboard");
        return;
      }

      setSongTitle(song.song_title || "");
      setArtistName(song.artist_name || "");
      setAlbumName(song.album_name || "");

      setOldCoverUrl(song.cover_url || null);
      setOldAudioUrl(song.audio_url || null);
    } catch (error) {
      console.error(error);
      alert("Song load karne me problem hui ❌");
      router.replace("/customer-dashboard");
    }

    setLoading(false);
  }

  async function saveChanges() {
    if (!songTitle.trim()) {
      alert("Song title likhiye ❌");
      return;
    }

    if (!artistName.trim()) {
      alert("Artist name likhiye ❌");
      return;
    }

    setSaving(true);

    try {
      let newCoverPath = oldCoverUrl;
      let newAudioPath = oldAudioUrl;

      // NEW COVER
      if (coverFile) {
        const coverPath = `covers/${Date.now()}-${crypto.randomUUID()}-${coverFile.name}`;

        const { error: coverUploadError } = await supabase.storage
          .from("songs")
          .upload(coverPath, coverFile);

        if (coverUploadError) {
          console.error(coverUploadError);

          alert(
            "Cover upload failed ❌\n\n" +
              coverUploadError.message
          );

          setSaving(false);
          return;
        }

        newCoverPath = coverPath;
      }

      // NEW AUDIO
      if (audioFile) {
        const audioPath = `audio/${Date.now()}-${crypto.randomUUID()}-${audioFile.name}`;

        const { error: audioUploadError } = await supabase.storage
          .from("songs")
          .upload(audioPath, audioFile);

        if (audioUploadError) {
          console.error(audioUploadError);

          alert(
            "Audio upload failed ❌\n\n" +
              audioUploadError.message
          );

          setSaving(false);
          return;
        }

        newAudioPath = audioPath;
      }

      // UPDATE SONG
      const { error: updateError } = await supabase
        .from("songs")
        .update({
          song_title: songTitle.trim(),
          artist_name: artistName.trim(),
          album_name: albumName.trim(),
          cover_url: newCoverPath,
          audio_url: newAudioPath,

          // RESUBMIT FOR ADMIN APPROVAL
          status: "Pending",
          rejection_reason: null,
        })
        .eq("id", songId);

      if (updateError) {
        console.error(updateError);

        alert(
          "Song update failed ❌\n\n" +
            updateError.message
        );

        setSaving(false);
        return;
      }

      alert(
        "Song successfully edit aur resubmit ho gaya ✅\n\nAb Admin dobara review karega."
      );

      router.replace("/customer-dashboard");
    } catch (error) {
      console.error(error);

      alert("Kuch galat ho gaya ❌");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading Edit Song... 🔐
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "750px",
          margin: "0 auto",
        }}
      >
        {/* LOGO */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
            }}
          />

          <p
            style={{
              color: "#94a3b8",
              marginTop: "5px",
            }}
          >
            Edit & Resubmit Song
          </p>
        </div>

        {/* BACK */}
        <button
          onClick={() => router.push("/customer-dashboard")}
          style={{
            background: "#1e293b",
            color: "white",
            border: "1px solid #334155",
            padding: "10px 15px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Dashboard
        </button>

        {/* FORM */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "14px",
            padding: "25px",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: "8px",
            }}
          >
            ✏️ Edit Rejected Song
          </h1>

          <p
            style={{
              color: "#fca5a5",
              background: "#1c0a0a",
              border: "1px solid #7f1d1d",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "25px",
            }}
          >
            Song me correction karke dobara submit karein.
          </p>

          {/* SONG TITLE */}
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: "600",
            }}
          >
            Song Title
          </label>

          <input
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            style={inputStyle}
            placeholder="Song title"
          />

          {/* ARTIST */}
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: "600",
            }}
          >
            Artist Name
          </label>

          <input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            style={inputStyle}
            placeholder="Artist name"
          />

          {/* ALBUM */}
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: "600",
            }}
          >
            Album Name
          </label>

          <input
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            style={inputStyle}
            placeholder="Album name"
          />

          {/* COVER */}
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: "600",
            }}
          >
            New Cover
          </label>

          {oldCoverUrl && (
            <img
              src={oldCoverUrl}
              alt="Current Cover"
              style={{
                width: "130px",
                height: "130px",
                objectFit: "cover",
                borderRadius: "10px",
                display: "block",
                marginBottom: "10px",
              }}
            />
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setCoverFile(e.target.files?.[0] || null)
            }
            style={fileInputStyle}
          />

          <p
            style={{
              color: "#64748b",
              fontSize: "12px",
              marginTop: "6px",
            }}
          >
            Agar cover me problem thi to naya cover upload karein.
          </p>

          {/* AUDIO */}
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: "600",
              marginTop: "20px",
            }}
          >
            New Audio
          </label>

          {oldAudioUrl && (
            <audio
              controls
              src={oldAudioUrl}
              style={{
                width: "100%",
                marginBottom: "10px",
              }}
            />
          )}

          <input
            type="file"
            accept="audio/*"
            onChange={(e) =>
              setAudioFile(e.target.files?.[0] || null)
            }
            style={fileInputStyle}
          />

          <p
            style={{
              color: "#64748b",
              fontSize: "12px",
              marginTop: "6px",
            }}
          >
            Agar audio me problem thi to naya audio upload karein.
          </p>

          {/* SAVE */}
          <button
            onClick={saveChanges}
            disabled={saving}
            style={{
              width: "100%",
              marginTop: "25px",
              background: saving ? "#475569" : "#22c55e",
              color: "white",
              border: "none",
              padding: "14px",
              borderRadius: "8px",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            {saving
              ? "Saving..."
              : "💾 Save Changes & Resubmit"}
          </button>
        </div>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  marginBottom: "18px",
  background: "#020617",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
  outline: "none",
};

const fileInputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px",
  background: "#020617",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: "8px",
};