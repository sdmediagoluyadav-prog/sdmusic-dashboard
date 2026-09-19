"use client";

import { useEffect, useState } from "react";
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

      // ---------------------------------------
      // CUSTOMER LOAD
      // ---------------------------------------

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select("id, customer_name, label_name")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

      console.log("Customer User ID:", session.user.id);
      console.log("Customer Data:", customerData);
      console.log("Customer Error:", customerError);

      if (customerError) {
        console.error(customerError);

        alert(
          "Customer load error ❌\n\n" + customerError.message
        );

        return;
      }

      if (!customerData) {
        alert("Customer account नहीं मिला ❌");
        return;
      }

      setCustomer(customerData);

      // ---------------------------------------
      // CUSTOMER SONG RELATIONS
      // ---------------------------------------

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
            .select(
              `
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
            `
            )
            .in("id", songIds)
            .order("id", { ascending: false });

        if (songError) {
          console.error(songError);

          alert(
            "Songs load error ❌\n\n" + songError.message
          );

          return;
        }

        const songsWithUrls: Song[] = [];

        for (const song of (songData || []) as Song[]) {
          let coverSignedUrl: string | null = null;
          let audioSignedUrl: string | null = null;

          // Cover signed URL
          if (song.cover_url) {
            if (song.cover_url.startsWith("http")) {
              coverSignedUrl = song.cover_url;
            } else {
              const { data } = await supabase.storage
                .from("songs")
                .createSignedUrl(song.cover_url, 3600);

              coverSignedUrl = data?.signedUrl || null;
            }
          }

          // Audio signed URL
          if (song.audio_url) {
            if (song.audio_url.startsWith("http")) {
              audioSignedUrl = song.audio_url;
            } else {
              const { data } = await supabase.storage
                .from("songs")
                .createSignedUrl(song.audio_url, 3600);

              audioSignedUrl = data?.signedUrl || null;
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

      // ---------------------------------------
      // SUB LABELS LOAD
      // ---------------------------------------

      const { data: subLabelData, error: subLabelError } =
        await supabase
          .from("sub_labels")
          .select(
            `
            id,
            customer_id,
            sub_label_name,
            email,
            auth_user_id,
            is_active,
            created_at
            `
          )
          .eq("customer_id", customerData.id)
          .order("id", { ascending: false });

      if (subLabelError) {
        console.error("Sub Label Error:", subLabelError);
      } else {
        setSubLabels((subLabelData || []) as SubLabel[]);
      }
    } catch (error) {
      console.error(error);

      alert("Dashboard load nahi ho paya ❌");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // ---------------------------------------
  // CREATE SUB LABEL
  // ---------------------------------------

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
        alert("Session expire ho gaya. Dobara login karo.");
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/sub-labels/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subLabelName: subLabelName.trim(),
          email: subLabelEmail.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Sub Label create nahi hua ❌");
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

      alert("Sub Label successfully create ho gaya ✅");
    } catch (error) {
      console.error(error);

      alert("Sub Label create karte time error aa gaya ❌");
    } finally {
      setCreatingSubLabel(false);
    }
  }

  // ---------------------------------------
  // DELETE SUB LABEL
  // ---------------------------------------

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
        alert("Sub Label delete nahi hua ❌\n\n" + error.message);
        return;
      }

      setSubLabels((previous) =>
        previous.filter((item) => item.id !== id)
      );

      alert("Sub Label delete ho gaya ✅");
    } catch (error) {
      console.error(error);

      alert("Delete karte time error aa gaya ❌");
    }
  }

  // ---------------------------------------
  // LOGOUT
  // ---------------------------------------

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ---------------------------------------
  // FILTER SONGS
  // ---------------------------------------

  const filteredSongs = songs.filter((song) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      song.song_title?.toLowerCase().includes(searchText) ||
      song.artist_name?.toLowerCase().includes(searchText) ||
      song.album_name?.toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All" ||
      (song.status || "").toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // ---------------------------------------
  // STATS
  // ---------------------------------------

  const totalSongs = songs.length;

  const approvedSongs = songs.filter(
    (song) =>
      (song.status || "").toLowerCase() === "approved"
  ).length;

  const pendingSongs = songs.filter(
    (song) =>
      (song.status || "").toLowerCase() === "pending"
  ).length;

  const rejectedSongs = songs.filter(
    (song) =>
      (song.status || "").toLowerCase() === "rejected"
  ).length;

  const artists = new Set(
    songs.map((song) => song.artist_name).filter(Boolean)
  ).size;

  const albums = new Set(
    songs.map((song) => song.album_name).filter(Boolean)
  ).size;

  // ---------------------------------------
  // LOADING
  // ---------------------------------------

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading Customer Dashboard... 🔐
      </main>
    );
  }

  // ---------------------------------------
  // CUSTOMER NOT FOUND
  // ---------------------------------------

  if (!customer) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#111827",
            padding: "30px",
            borderRadius: "16px",
            textAlign: "center",
            maxWidth: "450px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Customer account नहीं मिला ❌
          </h2>

          <p style={{ color: "#9ca3af" }}>
            Customer account mapping check karni hogi.
          </p>

          <button
            onClick={() => router.replace("/login")}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#fff",
      }}
    >
      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <header
        style={{
          height: "72px",
          background: "#111827",
          borderBottom: "1px solid #1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media"
            style={{
              width: "45px",
              height: "45px",
              objectFit: "contain",
            }}
          />

          <div>
            <div
              style={{
                fontSize: "17px",
                fontWeight: "700",
              }}
            >
              SD Media Entertainment
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              Customer Dashboard
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            border: "1px solid #374151",
            background: "#1f2937",
            color: "#fff",
            padding: "9px 14px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      {/* -------------------------------- */}
      {/* MAIN */}
      {/* -------------------------------- */}

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "25px",
        }}
      >
        {/* CUSTOMER INFO */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #111827, #172033)",
            border: "1px solid #263244",
            borderRadius: "16px",
            padding: "22px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              marginBottom: "5px",
            }}
          >
            Welcome back
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            {customer.customer_name}
          </h1>

          <div
            style={{
              marginTop: "7px",
              color: "#60a5fa",
              fontSize: "14px",
            }}
          >
            {customer.label_name || "Music Label"}
          </div>
        </div>

        {/* -------------------------------- */}
        {/* STATS */}
        {/* -------------------------------- */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <StatCard title="Total Songs" value={totalSongs} />
          <StatCard title="Approved" value={approvedSongs} />
          <StatCard title="Pending" value={pendingSongs} />
          <StatCard title="Rejected" value={rejectedSongs} />
          <StatCard title="Artists" value={artists} />
          <StatCard title="Albums" value={albums} />
        </div>

        {/* -------------------------------- */}
        {/* SUB LABEL SECTION */}
        {/* -------------------------------- */}

        <section
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "16px",
            padding: "22px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                Sub Labels
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Apne label ke liye alag login accounts banayein.
              </p>
            </div>

            <button
              onClick={() =>
                setShowSubLabelForm(!showSubLabelForm)
              }
              style={{
                background: "#2563eb",
                border: "none",
                color: "#fff",
                padding: "11px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              + Add Sub Label
            </button>
          </div>

          {/* CREATE FORM */}

          {showSubLabelForm && (
            <div
              style={{
                background: "#0f172a",
                border: "1px solid #263244",
                borderRadius: "12px",
                padding: "18px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                <input
                  type="text"
                  placeholder="Sub Label Name"
                  value={subLabelName}
                  onChange={(e) =>
                    setSubLabelName(e.target.value)
                  }
                  style={inputStyle}
                />

                <input
                  type="email"
                  placeholder="Sub Label Email"
                  value={subLabelEmail}
                  onChange={(e) =>
                    setSubLabelEmail(e.target.value)
                  }
                  style={inputStyle}
                />
              </div>

              <button
                onClick={addSubLabel}
                disabled={creatingSubLabel}
                style={{
                  marginTop: "14px",
                  background: creatingSubLabel
                    ? "#4b5563"
                    : "#16a34a",
                  border: "none",
                  color: "#fff",
                  padding: "11px 18px",
                  borderRadius: "8px",
                  cursor: creatingSubLabel
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "600",
                }}
              >
                {creatingSubLabel
                  ? "Creating..."
                  : "Create Sub Label"}
              </button>
            </div>
          )}

          {/* LOGIN DETAILS */}

          {loginDetails && (
            <div
              style={{
                background: "#052e16",
                border: "1px solid #166534",
                borderRadius: "12px",
                padding: "18px",
                marginBottom: "18px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "12px",
                }}
              >
                Sub Label Login Details ✅
              </h3>

              <p
                style={{
                  margin: "7px 0",
                  color: "#d1fae5",
                }}
              >
                <strong>Email:</strong>{" "}
                {loginDetails.email}
              </p>

              <p
                style={{
                  margin: "7px 0",
                  color: "#d1fae5",
                }}
              >
                <strong>Temporary Password:</strong>{" "}
                {loginDetails.password}
              </p>

              <p
                style={{
                  color: "#86efac",
                  fontSize: "13px",
                  marginBottom: 0,
                }}
              >
                ⚠️ Is password ko safe jagah save karke Sub Label
                user ko de dena.
              </p>
            </div>
          )}

          {/* SUB LABEL LIST */}

          {subLabels.length === 0 ? (
            <div
              style={{
                padding: "25px",
                textAlign: "center",
                color: "#9ca3af",
                border: "1px dashed #374151",
                borderRadius: "10px",
              }}
            >
              Abhi koi Sub Label nahi hai.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "14px",
              }}
            >
              {subLabels.map((subLabel) => (
                <div
                  key={subLabel.id}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #263244",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                        }}
                      >
                        {subLabel.sub_label_name}
                      </h3>

                      <p
                        style={{
                          margin: "7px 0",
                          color: "#9ca3af",
                          fontSize: "13px",
                          wordBreak: "break-word",
                        }}
                      >
                        {subLabel.email}
                      </p>
                    </div>

                    <span
                      style={{
                        height: "fit-content",
                        padding: "4px 8px",
                        borderRadius: "20px",
                        background: subLabel.is_active
                          ? "#14532d"
                          : "#450a0a",
                        color: subLabel.is_active
                          ? "#86efac"
                          : "#fca5a5",
                        fontSize: "11px",
                      }}
                    >
                      {subLabel.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      deleteSubLabel(subLabel.id)
                    }
                    style={{
                      marginTop: "12px",
                      background: "#7f1d1d",
                      border: "none",
                      color: "#fecaca",
                      padding: "8px 11px",
                      borderRadius: "7px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* -------------------------------- */}
        {/* SONG SECTION */}
        {/* -------------------------------- */}

        <section
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "16px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                My Songs
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Aapke account ke uploaded songs.
              </p>
            </div>

            <button
              onClick={() => router.push("/upload")}
              style={{
                background: "#2563eb",
                border: "none",
                color: "#fff",
                padding: "11px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              + Upload Song
            </button>
          </div>

          {/* SEARCH + FILTER */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(200px, 1fr) 180px",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <input
              type="text"
              placeholder="Search song, artist, album..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              style={inputStyle}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* SONG LIST */}

          {filteredSongs.length === 0 ? (
            <div
              style={{
                padding: "45px 20px",
                textAlign: "center",
                color: "#9ca3af",
                border: "1px dashed #374151",
                borderRadius: "12px",
              }}
            >
              {songs.length === 0
                ? "Abhi koi song upload nahi hua."
                : "Search ke according koi song nahi mila."}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onEdit={() =>
                    router.push(
                      `/customer-dashboard/edit/${song.id}`
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ---------------------------------------
// STAT CARD
// ---------------------------------------

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
        borderRadius: "14px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: "#9ca3af",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: "700",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------
// SONG CARD
// ---------------------------------------

function SongCard({
  song,
  onEdit,
}: {
  song: Song;
  onEdit: () => void;
}) {
  const status = (song.status || "Pending").toLowerCase();

  let statusBackground = "#78350f";
  let statusColor = "#fde68a";

  if (status === "approved") {
    statusBackground = "#14532d";
    statusColor = "#86efac";
  }

  if (status === "rejected") {
    statusBackground = "#7f1d1d";
    statusColor = "#fca5a5";
  }

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #263244",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      {/* COVER */}

      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: "#1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {song.cover_signed_url ? (
          <img
            src={song.cover_signed_url}
            alt={song.song_title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              color: "#6b7280",
              fontSize: "40px",
            }}
          >
            🎵
          </div>
        )}
      </div>

      {/* DETAILS */}

      <div style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
              lineHeight: 1.35,
            }}
          >
            {song.song_title}
          </h3>

          <span
            style={{
              flexShrink: 0,
              padding: "4px 8px",
              borderRadius: "20px",
              background: statusBackground,
              color: statusColor,
              fontSize: "10px",
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            {song.status || "Pending"}
          </span>
        </div>

        <div
          style={{
            marginTop: "10px",
            color: "#d1d5db",
            fontSize: "13px",
          }}
        >
          Artist: {song.artist_name || "-"}
        </div>

        <div
          style={{
            marginTop: "5px",
            color: "#9ca3af",
            fontSize: "13px",
          }}
        >
          Album: {song.album_name || "-"}
        </div>

        {song.singer_name && (
          <div
            style={{
              marginTop: "5px",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            Singer: {song.singer_name}
          </div>
        )}

        {song.genre && (
          <div
            style={{
              marginTop: "5px",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            Genre: {song.genre}
          </div>
        )}

        {/* AUDIO */}

        {song.audio_signed_url && (
          <audio
            controls
            src={song.audio_signed_url}
            style={{
              width: "100%",
              marginTop: "14px",
            }}
          />
        )}

        {/* REJECTION REASON */}

        {status === "rejected" && song.rejection_reason && (
          <div
            style={{
              marginTop: "14px",
              padding: "11px",
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              borderRadius: "8px",
              color: "#fecaca",
              fontSize: "12px",
            }}
          >
            <strong>Rejection Reason:</strong>
            <div style={{ marginTop: "5px" }}>
              {song.rejection_reason}
            </div>
          </div>
        )}

        {/* ACTIONS */}

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "15px",
            flexWrap: "wrap",
          }}
        >
          {status === "rejected" && (
            <button
              onClick={onEdit}
              style={{
                flex: 1,
                minWidth: "100px",
                background: "#2563eb",
                border: "none",
                color: "#fff",
                padding: "9px 12px",
                borderRadius: "7px",
                cursor: "pointer",
              }}
            >
              Edit & Resubmit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------
// INPUT STYLE
// ---------------------------------------

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: "8px",
  border: "1px solid #374151",
  background: "#1f2937",
  color: "#fff",
  outline: "none",
};