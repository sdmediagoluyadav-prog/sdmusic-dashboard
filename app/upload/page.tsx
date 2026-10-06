"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SubLabel = {
  id: number;
  customer_id: number;
  sub_label_name: string;
  email: string | null;
  auth_user_id: string | null;
  is_active: boolean;
};

export default function UploadPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [labelName, setLabelName] = useState("");

  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [selectedSubLabelId, setSelectedSubLabelId] = useState("main");

  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [singerName, setSingerName] = useState("");
  const [composer, setComposer] = useState("");
  const [musicDirector, setMusicDirector] = useState("");
  const [lyricist, setLyricist] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [cover, setCover] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      setCheckingAuth(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const roleResponse = await fetch("/api/auth/role", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roleData = await roleResponse.json();

      console.log("Upload role:", roleData);

      if (!roleResponse.ok) {
        alert(roleData?.error || "Role check failed");
        router.push("/login");
        return;
      }

      if (roleData.role === "admin") {
        setIsAdmin(true);
        setCheckingAuth(false);
        return;
      }

      if (roleData.role !== "customer") {
        alert("You are not authorized to upload songs.");
        router.push("/login");
        return;
      }

      const customer = roleData.customer;

      if (!customer?.id) {
        alert("Customer account नहीं मिला ❌");
        router.push("/login");
        return;
      }

      setCustomerName(customer.customer_name || "");
      setLabelName(customer.label_name || "");

      const { data: subLabelData, error: subLabelError } = await supabase
        .from("sub_labels")
        .select(
          "id, customer_id, sub_label_name, email, auth_user_id, is_active, created_at"
        )
        .eq("customer_id", customer.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (subLabelError) {
        console.error("Sub label load error:", subLabelError);
      } else {
        setSubLabels(subLabelData || []);
      }

      setCheckingAuth(false);
    } catch (error) {
      console.error("Auth check error:", error);
      alert("Something went wrong.");
      router.push("/login");
    }
  }

  async function uploadFile(
    file: File,
    folder: string,
    fallbackContentType: string
  ) {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "file";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}.${extension}`;

    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from("songs")
      .upload(filePath, file, {
        contentType: file.type || fallbackContentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return filePath;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!songTitle.trim()) {
      alert("Song Title डालें.");
      return;
    }

    if (!artistName.trim()) {
      alert("Artist Name डालें.");
      return;
    }

    if (!cover) {
      alert("Cover Image select करें.");
      return;
    }

    if (!audio) {
      alert("Audio File select करें.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Session expired. Please login again.");
        router.push("/login");
        return;
      }

      let customerId: number | null = null;

      if (!isAdmin) {
        const roleResponse = await fetch("/api/auth/role", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const roleData = await roleResponse.json();

        if (!roleResponse.ok || roleData.role !== "customer") {
          alert("Customer authorization failed.");
          return;
        }

        customerId = Number(roleData.customer?.id);

        if (!customerId) {
          alert("Customer account नहीं मिला ❌");
          return;
        }
      }

      let selectedSubLabel: SubLabel | null = null;

      if (
        !isAdmin &&
        selectedSubLabelId &&
        selectedSubLabelId !== "main"
      ) {
        selectedSubLabel =
          subLabels.find(
            (item) => String(item.id) === String(selectedSubLabelId)
          ) || null;

        if (!selectedSubLabel) {
          alert("Selected Sub Label valid नहीं है.");
          return;
        }

        if (
          Number(selectedSubLabel.customer_id) !== Number(customerId)
        ) {
          alert("Selected Sub Label इस customer का नहीं है.");
          return;
        }

        if (!selectedSubLabel.is_active) {
          alert("Selected Sub Label inactive है.");
          return;
        }
      }

      const coverPath = await uploadFile(
        cover,
        "covers",
        "image/jpeg"
      );

      let audioPath = "";

      try {
        audioPath = await uploadFile(
          audio,
          "audio",
          audio.type || "audio/wav"
        );
      } catch (audioError) {
        await supabase.storage
          .from("songs")
          .remove([coverPath]);

        throw audioError;
      }

      const { data: newSong, error: songError } = await supabase
        .from("songs")
        .insert({
          song_title: songTitle.trim(),
          artist_name: artistName.trim(),
          album_name: albumName.trim(),
          singer_name: singerName.trim(),
          composer: composer.trim(),
          music_director: musicDirector.trim(),
          lyricist: lyricist.trim(),
          genre: genre.trim(),
          language: language.trim(),
          release_date: releaseDate || null,
          cover_url: coverPath,
          audio_url: audioPath,
          status: "Pending",
        })
        .select()
        .single();

      if (songError || !newSong) {
        await supabase.storage
          .from("songs")
          .remove([coverPath, audioPath]);

        throw songError || new Error("Song insert failed.");
      }

      if (!isAdmin && customerId) {
        const { error: customerSongError } = await supabase
          .from("customer_songs")
          .insert({
            customer_id: customerId,
            song_id: newSong.id,
          });

        if (customerSongError) {
          await supabase
            .from("songs")
            .delete()
            .eq("id", newSong.id);

          await supabase.storage
            .from("songs")
            .remove([coverPath, audioPath]);

          throw customerSongError;
        }

        if (
          selectedSubLabelId &&
          selectedSubLabelId !== "main"
        ) {
          const { error: subLabelSongError } = await supabase
            .from("sub_label_songs")
            .insert({
              sub_label_id: Number(selectedSubLabelId),
              song_id: newSong.id,
            });

          if (subLabelSongError) {
            await supabase
              .from("customer_songs")
              .delete()
              .eq("customer_id", customerId)
              .eq("song_id", newSong.id);

            await supabase
              .from("songs")
              .delete()
              .eq("id", newSong.id);

            await supabase.storage
              .from("songs")
              .remove([coverPath, audioPath]);

            throw subLabelSongError;
          }
        }
      }

      let uploadedUnder = "Main Label";

      if (selectedSubLabel) {
        uploadedUnder = selectedSubLabel.sub_label_name;
      } else if (labelName) {
        uploadedUnder = labelName;
      }

      alert(
        `Song uploaded successfully ✅\n\nUploaded under: ${uploadedUnder}`
      );

      setSongTitle("");
      setArtistName("");
      setAlbumName("");
      setSingerName("");
      setComposer("");
      setMusicDirector("");
      setLyricist("");
      setGenre("");
      setLanguage("");
      setReleaseDate("");
      setCover(null);
      setAudio(null);
      setSelectedSubLabelId("main");

      const coverInput = document.getElementById(
        "cover"
      ) as HTMLInputElement | null;

      const audioInput = document.getElementById(
        "audio"
      ) as HTMLInputElement | null;

      if (coverInput) coverInput.value = "";
      if (audioInput) audioInput.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);

      alert(
        error?.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            Checking authentication...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Upload Song</h1>
            <p style={subtitleStyle}>
              Add your music content to SD Music Distribution
            </p>
          </div>
        </div>

        {!isAdmin && (
          <div style={customerBoxStyle}>
            <div>
              <strong>Customer:</strong>{" "}
              {customerName || "Customer"}
            </div>

            <div style={{ marginTop: 5 }}>
              <strong>Main Label:</strong>{" "}
              {labelName || "Main Customer Label"}
            </div>

            <div style={{ marginTop: 15 }}>
              <label style={labelStyle}>
                Upload Under
              </label>

              <select
                value={selectedSubLabelId}
                onChange={(e) =>
                  setSelectedSubLabelId(e.target.value)
                }
                style={inputStyle}
              >
                <option value="main">
                  Main Label:{" "}
                  {labelName || "Main Customer Label"}
                </option>

                {subLabels.map((subLabel) => (
                  <option
                    key={subLabel.id}
                    value={subLabel.id}
                  >
                    Sub Label: {subLabel.sub_label_name}
                  </option>
                ))}
              </select>

              <p style={helpTextStyle}>
                Main Label select करने पर song आपके Main Label
                में upload होगा. Sub Label select करने पर song
                उस Sub Label में भी दिखाई देगा.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>
                Song Title *
              </label>

              <input
                placeholder="Song Title"
                value={songTitle}
                onChange={(e) =>
                  setSongTitle(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Artist Name *
              </label>

              <input
                placeholder="Artist Name"
                value={artistName}
                onChange={(e) =>
                  setArtistName(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Album Name
              </label>

              <input
                placeholder="Album Name"
                value={albumName}
                onChange={(e) =>
                  setAlbumName(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Singer
              </label>

              <input
                placeholder="Singer Name"
                value={singerName}
                onChange={(e) =>
                  setSingerName(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Composer
              </label>

              <input
                placeholder="Composer"
                value={composer}
                onChange={(e) =>
                  setComposer(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Music Director
              </label>

              <input
                placeholder="Music Director"
                value={musicDirector}
                onChange={(e) =>
                  setMusicDirector(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Lyricist
              </label>

              <input
                placeholder="Lyricist"
                value={lyricist}
                onChange={(e) =>
                  setLyricist(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Genre
              </label>

              <input
                placeholder="Genre"
                value={genre}
                onChange={(e) =>
                  setGenre(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Language
              </label>

              <input
                placeholder="Language"
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Release Date
              </label>

              <input
                type="date"
                value={releaseDate}
                onChange={(e) =>
                  setReleaseDate(e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Cover Image *
              </label>

              <input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCover(
                    e.target.files?.[0] || null
                  )
                }
                style={fileInputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Audio File *
              </label>

              <input
                id="audio"
                type="file"
                accept="audio/*,.wav,.mp3"
                onChange={(e) =>
                  setAudio(
                    e.target.files?.[0] || null
                  )
                }
                style={fileInputStyle}
              />

              <p style={helpTextStyle}>
                WAV / MP3 supported
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Uploading..."
              : "Upload Song"}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0b0f19",
  padding: "40px 20px",
  color: "#ffffff",
};

const cardStyle: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "18px",
  padding: "30px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "30px",
  fontWeight: 700,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: "7px",
  color: "#9ca3af",
  fontSize: "14px",
};

const customerBoxStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #263244",
  borderRadius: "12px",
  padding: "18px",
  marginBottom: "25px",
  color: "#dbeafe",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "18px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#d1d5db",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #374151",
  background: "#0b1220",
  color: "#ffffff",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
};

const fileInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #374151",
  background: "#0b1220",
  color: "#d1d5db",
  boxSizing: "border-box",
};

const helpTextStyle: React.CSSProperties = {
  marginTop: "7px",
  marginBottom: 0,
  color: "#9ca3af",
  fontSize: "12px",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "28px",
  padding: "14px 20px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
};