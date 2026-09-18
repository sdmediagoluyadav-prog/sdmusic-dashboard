"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string | null;
  label_name: string | null;
  email: string | null;
  auth_user_id: string | null;
};

type Song = {
  id: number;
  song_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
};

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const customerId = String(params.id);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] =
    useState(false);

  const [customerName, setCustomerName] =
    useState("");

  const [labelName, setLabelName] =
    useState("");

  const [coverUrls, setCoverUrls] = useState<
    Record<number, string>
  >({});

  const [audioUrls, setAudioUrls] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  async function loadCustomer() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // Customer details
      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id, customer_name, label_name, email, auth_user_id"
        )
        .eq("id", customerId)
        .single();

      if (customerError || !customerData) {
        alert("Customer nahi mila ❌");
        router.replace("/customers");
        return;
      }

      setCustomer(customerData);

      setCustomerName(
        customerData.customer_name || ""
      );

      setLabelName(
        customerData.label_name || ""
      );

      // Customer songs
      const {
        data: customerSongs,
        error: customerSongsError,
      } = await supabase
        .from("customer_songs")
        .select("song_id")
        .eq("customer_id", customerId);

      if (customerSongsError) {
        console.error(customerSongsError);
        setSongs([]);
        return;
      }

      const songIds =
        customerSongs?.map(
          (item) => item.song_id
        ) || [];

      if (songIds.length === 0) {
        setSongs([]);
        return;
      }

      const {
        data: songsData,
        error: songsError,
      } = await supabase
        .from("songs")
        .select(
          `
            id,
            song_title,
            artist_name,
            album_name,
            cover_url,
            audio_url,
            status,
            rejection_reason
          `
        )
        .in("id", songIds)
        .order("id", {
          ascending: false,
        });

      if (songsError) {
        console.error(songsError);
        setSongs([]);
        return;
      }

      const loadedSongs =
        (songsData || []) as Song[];

      setSongs(loadedSongs);

      // Signed URLs
      const newCoverUrls: Record<
        number,
        string
      > = {};

      const newAudioUrls: Record<
        number,
        string
      > = {};

      for (const song of loadedSongs) {
        if (song.cover_url) {
          const { data } =
            await supabase.storage
              .from("songs")
              .createSignedUrl(
                song.cover_url,
                60 * 60
              );

          if (data?.signedUrl) {
            newCoverUrls[song.id] =
              data.signedUrl;
          }
        }

        if (song.audio_url) {
          const { data } =
            await supabase.storage
              .from("songs")
              .createSignedUrl(
                song.audio_url,
                60 * 60
              );

          if (data?.signedUrl) {
            newAudioUrls[song.id] =
              data.signedUrl;
          }
        }
      }

      setCoverUrls(newCoverUrls);
      setAudioUrls(newAudioUrls);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Edit customer
  async function saveCustomer() {
    if (!customer) return;

    const trimmedName =
      customerName.trim();

    const trimmedLabel =
      labelName.trim();

    if (!trimmedName) {
      alert("Customer Name required hai ❌");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Session expired ❌");
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/customers/update",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            customer_id: customer.id,
            customer_name: trimmedName,
            label_name: trimmedLabel,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            "Customer update nahi hua ❌"
        );
        return;
      }

      setCustomer(result.customer);

      setCustomerName(
        result.customer.customer_name ||
          ""
      );

      setLabelName(
        result.customer.label_name ||
          ""
      );

      setEditing(false);

      alert(
        "Customer successfully update ho gaya ✅"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong ❌"
      );
    } finally {
      setSaving(false);
    }
  }

  // Reset customer password
  async function resetCustomerPassword() {
    if (!customer) return;

    const confirmReset = confirm(
      `Kya ${customer.customer_name || "customer"} ko password reset email bhejna hai?`
    );

    if (!confirmReset) {
      return;
    }

    setResettingPassword(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Session expired ❌");
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/customers/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            customer_id: customer.id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            "Password reset email nahi gaya ❌"
        );
        return;
      }

      alert(
        `Password reset email successfully bhej diya gaya ✅\n\nEmail: ${customer.email || "-"}`
      );
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      alert(
        "Something went wrong ❌"
      );
    } finally {
      setResettingPassword(false);
    }
  }

  // Approve song
  async function approveSong(songId: number) {
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

    loadCustomer();
  }

  // Reject song
  async function rejectSong(songId: number) {
    const reason = prompt(
      "Reject karne ka reason likhiye:"
    );

    if (!reason?.trim()) {
      return;
    }

    const { error } = await supabase
      .from("songs")
      .update({
        status: "Rejected",
        rejection_reason:
          reason.trim(),
      })
      .eq("id", songId);

    if (error) {
      alert(error.message);
      return;
    }

    loadCustomer();
  }

  // Delete song
  async function deleteSong(songId: number) {
    const confirmDelete =
      confirm(
        "Kya aap ye song delete karna chahte hain?"
      );

    if (!confirmDelete) {
      return;
    }

    const { error: linkError } =
      await supabase
        .from("customer_songs")
        .delete()
        .eq("customer_id", customerId)
        .eq("song_id", songId);

    if (linkError) {
      alert(linkError.message);
      return;
    }

    const { error: songError } =
      await supabase
        .from("songs")
        .delete()
        .eq("id", songId);

    if (songError) {
      alert(songError.message);
      return;
    }

    loadCustomer();
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b1120",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
      >
        Loading Customer...
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const approvedCount =
    songs.filter(
      (song) =>
        song.status === "Approved"
    ).length;

  const pendingCount =
    songs.filter(
      (song) =>
        song.status === "Pending"
    ).length;

  const rejectedCount =
    songs.filter(
      (song) =>
        song.status === "Rejected"
    ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1120",
        color: "white",
        padding: "25px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "25px",
        }}
      >
        <div>
          <button
            onClick={() =>
              router.push("/customers")
            }
            style={{
              background:
                "#1f2937",
              color: "white",
              border: "none",
              padding:
                "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              marginBottom:
                "15px",
            }}
          >
            ← Back to Customers
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: "30px",
            }}
          >
            Customer Details
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              setEditing(true)
            }
            style={{
              background:
                "#2563eb",
              color: "white",
              border: "none",
              padding:
                "12px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ✏️ Edit Customer
          </button>

          <button
            onClick={
              resetCustomerPassword
            }
            disabled={
              resettingPassword
            }
            style={{
              background:
                "#7c3aed",
              color: "white",
              border: "none",
              padding:
                "12px 20px",
              borderRadius: "8px",
              cursor:
                resettingPassword
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "bold",
              opacity:
                resettingPassword
                  ? 0.7
                  : 1,
            }}
          >
            {resettingPassword
              ? "Sending..."
              : "🔐 Reset Password"}
          </button>
        </div>
      </div>

      {/* Customer Info */}
      <div
        style={{
          background:
            "#111827",
          border:
            "1px solid #1f2937",
          borderRadius: "14px",
          padding: "22px",
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "18px",
          }}
        >
          <div>
            <p
              style={{
                color: "#9ca3af",
                margin: "0 0 7px",
              }}
            >
              Customer Name
            </p>

            <h2
              style={{
                margin: 0,
              }}
            >
              {customer.customer_name ||
                "-"}
            </h2>
          </div>

          <div>
            <p
              style={{
                color: "#9ca3af",
                margin: "0 0 7px",
              }}
            >
              Label Name
            </p>

            <h2
              style={{
                margin: 0,
              }}
            >
              {customer.label_name ||
                "-"}
            </h2>
          </div>

          <div>
            <p
              style={{
                color: "#9ca3af",
                margin: "0 0 7px",
              }}
            >
              Email
            </p>

            <p
              style={{
                margin: 0,
                wordBreak:
                  "break-word",
              }}
            >
              {customer.email ||
                "-"}
            </p>
          </div>

          <div>
            <p
              style={{
                color: "#9ca3af",
                margin: "0 0 7px",
              }}
            >
              Customer ID
            </p>

            <p
              style={{
                margin: 0,
              }}
            >
              {customer.id}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        <StatCard
          title="Total Songs"
          value={songs.length}
        />

        <StatCard
          title="Approved"
          value={approvedCount}
        />

        <StatCard
          title="Pending"
          value={pendingCount}
        />

        <StatCard
          title="Rejected"
          value={rejectedCount}
        />
      </div>

      {/* Songs */}
      <h2
        style={{
          marginBottom: "18px",
        }}
      >
        Customer Songs
      </h2>

      {songs.length === 0 ? (
        <div
          style={{
            background:
              "#111827",
            padding: "35px",
            borderRadius:
              "12px",
            textAlign: "center",
            color: "#9ca3af",
          }}
        >
          Is customer ne abhi
          koi song upload nahi kiya.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {songs.map((song) => (
            <div
              key={song.id}
              style={{
                background:
                  "#111827",
                border:
                  "1px solid #1f2937",
                borderRadius:
                  "14px",
                padding: "16px",
              }}
            >
              {coverUrls[song.id] && (
                <img
                  src={
                    coverUrls[
                      song.id
                    ]
                  }
                  alt={
                    song.song_title ||
                    "Song cover"
                  }
                  style={{
                    width: "100%",
                    aspectRatio:
                      "1 / 1",
                    objectFit:
                      "cover",
                    borderRadius:
                      "10px",
                    marginBottom:
                      "14px",
                  }}
                />
              )}

              <h3
                style={{
                  margin:
                    "0 0 8px",
                }}
              >
                {song.song_title ||
                  "Untitled Song"}
              </h3>

              <p
                style={{
                  margin:
                    "5px 0",
                  color:
                    "#d1d5db",
                }}
              >
                Artist:{" "}
                {song.artist_name ||
                  "-"}
              </p>

              <p
                style={{
                  margin:
                    "5px 0",
                  color:
                    "#d1d5db",
                }}
              >
                Album:{" "}
                {song.album_name ||
                  "-"}
              </p>

              <p
                style={{
                  margin:
                    "10px 0",
                  fontWeight:
                    "bold",
                }}
              >
                Status:{" "}
                <span
                  style={{
                    color:
                      song.status ===
                      "Approved"
                        ? "#22c55e"
                        : song.status ===
                          "Rejected"
                        ? "#ef4444"
                        : "#f59e0b",
                  }}
                >
                  {song.status ||
                    "Pending"}
                </span>
              </p>

              {song.rejection_reason && (
                <div
                  style={{
                    background:
                      "#3f1d1d",
                    border:
                      "1px solid #7f1d1d",
                    padding:
                      "10px",
                    borderRadius:
                      "8px",
                    marginBottom:
                      "12px",
                    color:
                      "#fca5a5",
                    fontSize:
                      "14px",
                  }}
                >
                  <strong>
                    Rejection Reason:
                  </strong>{" "}
                  {song.rejection_reason}
                </div>
              )}

              {audioUrls[song.id] && (
                <audio
                  controls
                  src={
                    audioUrls[
                      song.id
                    ]
                  }
                  style={{
                    width: "100%",
                    marginBottom:
                      "12px",
                  }}
                />
              )}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() =>
                    approveSong(
                      song.id
                    )
                  }
                  style={{
                    background:
                      "#16a34a",
                    color: "white",
                    border: "none",
                    padding:
                      "9px 12px",
                    borderRadius:
                      "7px",
                    cursor:
                      "pointer",
                  }}
                >
                  ✓ Approve
                </button>

                <button
                  onClick={() =>
                    rejectSong(
                      song.id
                    )
                  }
                  style={{
                    background:
                      "#dc2626",
                    color: "white",
                    border: "none",
                    padding:
                      "9px 12px",
                    borderRadius:
                      "7px",
                    cursor:
                      "pointer",
                  }}
                >
                  ✕ Reject
                </button>

                <button
                  onClick={() =>
                    deleteSong(
                      song.id
                    )
                  }
                  style={{
                    background:
                      "#374151",
                    color: "white",
                    border: "none",
                    padding:
                      "9px 12px",
                    borderRadius:
                      "7px",
                    cursor:
                      "pointer",
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Customer Modal */}
      {editing && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth:
                "500px",
              background:
                "#111827",
              border:
                "1px solid #374151",
              borderRadius:
                "14px",
              padding: "25px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                Edit Customer
              </h2>

              <button
                onClick={() =>
                  setEditing(false)
                }
                style={{
                  background:
                    "transparent",
                  color: "white",
                  border: "none",
                  fontSize:
                    "24px",
                  cursor:
                    "pointer",
                }}
              >
                ×
              </button>
            </div>

            <label
              style={{
                display:
                  "block",
                marginBottom:
                  "7px",
                color:
                  "#d1d5db",
              }}
            >
              Customer Name
            </label>

            <input
              value={
                customerName
              }
              onChange={(e) =>
                setCustomerName(
                  e.target.value
                )
              }
              placeholder="Customer Name"
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                background:
                  "#0b1120",
                color: "white",
                border:
                  "1px solid #374151",
                padding:
                  "12px",
                borderRadius:
                  "8px",
                marginBottom:
                  "16px",
                outline: "none",
              }}
            />

            <label
              style={{
                display:
                  "block",
                marginBottom:
                  "7px",
                color:
                  "#d1d5db",
              }}
            >
              Label Name
            </label>

            <input
              value={
                labelName
              }
              onChange={(e) =>
                setLabelName(
                  e.target.value
                )
              }
              placeholder="Label Name"
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                background:
                  "#0b1120",
                color: "white",
                border:
                  "1px solid #374151",
                padding:
                  "12px",
                borderRadius:
                  "8px",
                marginBottom:
                  "20px",
                outline: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                onClick={() =>
                  setEditing(false)
                }
                disabled={saving}
                style={{
                  flex: 1,
                  background:
                    "#374151",
                  color: "white",
                  border: "none",
                  padding:
                    "12px",
                  borderRadius:
                    "8px",
                  cursor:
                    "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={
                  saveCustomer
                }
                disabled={saving}
                style={{
                  flex: 1,
                  background:
                    "#2563eb",
                  color: "white",
                  border: "none",
                  padding:
                    "12px",
                  borderRadius:
                    "8px",
                  cursor:
                    "pointer",
                  fontWeight:
                    "bold",
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
        background:
          "#111827",
        border:
          "1px solid #1f2937",
        borderRadius:
          "12px",
        padding: "20px",
      }}
    >
      <p
        style={{
          color: "#9ca3af",
          margin:
            "0 0 8px",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          margin: 0,
          fontSize: "28px",
        }}
      >
        {value}
      </h2>
    </div>
  );
}