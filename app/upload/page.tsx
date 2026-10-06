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
  const [selectedSubLabelId, setSelectedSubLabelId] =
    useState("");

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
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        let role = "";

        try {
          const roleResponse = await fetch("/api/auth/role", {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (roleResponse.ok) {
            const roleData = await roleResponse.json();

            console.log("Upload Page Role:", roleData);

            role = String(
              roleData?.role || ""
            ).toLowerCase();

            /*
              ADMIN
            */
            if (
              role === "admin" ||
              role === "administrator" ||
              role === "super_admin"
            ) {
              if (mounted) {
                setIsAdmin(true);
                setCheckingAuth(false);
              }

              return;
            }

            /*
              CUSTOMER FROM ROLE API
            */
            if (
              role === "customer" &&
              roleData?.customer
            ) {
              const customer =
                roleData.customer;

              if (mounted) {
                setIsAdmin(false);

                setCustomerName(
                  customer.customer_name || ""
                );

                setLabelName(
                  customer.label_name || ""
                );
              }

              /*
                CUSTOMER KE SAARE ACTIVE
                SUB LABELS LOAD KARO
              */

              const {
                data: subLabelData,
                error: subLabelError,
              } = await supabase
                .from("sub_labels")
                .select(
                  `
                    id,
                    customer_id,
                    sub_label_name,
                    email,
                    auth_user_id,
                    is_active
                  `
                )
                .eq(
                  "customer_id",
                  customer.id
                )
                .eq(
                  "is_active",
                  true
                )
                .order(
                  "created_at",
                  {
                    ascending: false,
                  }
                );

              if (subLabelError) {
                console.error(
                  "Sub Labels Load Error:",
                  subLabelError
                );
              } else if (mounted) {
                setSubLabels(
                  subLabelData || []
                );
              }

              if (mounted) {
                setCheckingAuth(false);
              }

              return;
            }
          } else {
            const roleError =
              await roleResponse.text();

            console.error(
              "Role API error:",
              roleResponse.status,
              roleError
            );
          }
        } catch (roleError) {
          console.error(
            "Role check error:",
            roleError
          );
        }

        /*
          CUSTOMER FALLBACK CHECK
        */

        const {
          data: customer,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(
            "id, customer_name, label_name"
          )
          .eq(
            "auth_user_id",
            session.user.id
          )
          .single();

        if (
          customerError ||
          !customer
        ) {
          console.error(
            "Customer check error:",
            customerError
          );

          alert(
            "Customer account नहीं मिला ❌"
          );

          router.replace("/login");
          return;
        }

        /*
          CUSTOMER INFO
        */

        if (mounted) {
          setCustomerName(
            customer.customer_name || ""
          );

          setLabelName(
            customer.label_name || ""
          );
        }

        /*
          CUSTOMER KE ACTIVE SUB LABELS
        */

        const {
          data: subLabelData,
          error: subLabelError,
        } = await supabase
          .from("sub_labels")
          .select(
            `
              id,
              customer_id,
              sub_label_name,
              email,
              auth_user_id,
              is_active
            `
          )
          .eq(
            "customer_id",
            customer.id
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (subLabelError) {
          console.error(
            "Sub Labels Load Error:",
            subLabelError
          );
        } else if (mounted) {
          setSubLabels(
            subLabelData || []
          );
        }

        if (mounted) {
          setIsAdmin(false);
          setCheckingAuth(false);
        }
      } catch (error) {
        console.error(
          "Auth check error:",
          error
        );

        router.replace("/login");
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!songTitle.trim()) {
      alert("Please enter Song Title");
      return;
    }

    if (!artistName.trim()) {
      alert("Please enter Artist Name");
      return;
    }

    /*
      CUSTOMER KE LIYE SUB LABEL SELECT
      KARNA REQUIRED HOGA AGAR SUB LABELS HAIN
    */

    if (
      !isAdmin &&
      subLabels.length > 0 &&
      !selectedSubLabelId
    ) {
      alert(
        "Please select a Sub Label"
      );
      return;
    }

    if (!cover || !audio) {
      alert(
        "Please select Cover Image and Audio File"
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      let customer: {
        id: number;
        customer_name: string | null;
        label_name: string | null;
      } | null = null;

      /*
        CUSTOMER ACCOUNT
      */

      if (!isAdmin) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(
            "id, customer_name, label_name"
          )
          .eq(
            "auth_user_id",
            session.user.id
          )
          .single();

        if (
          customerError ||
          !customerData
        ) {
          console.error(
            "Customer fetch error:",
            customerError
          );

          throw new Error(
            "Customer account नहीं मिला"
          );
        }

        customer = customerData;

        /*
          SELECTED SUB LABEL KI SECURITY CHECK
          CUSTOMER SIRF APNA SUB LABEL USE KAR SAKE
        */

        if (selectedSubLabelId) {
          const {
            data: selectedSubLabel,
            error:
              selectedSubLabelError,
          } = await supabase
            .from("sub_labels")
            .select(
              "id, customer_id, sub_label_name, is_active"
            )
            .eq(
              "id",
              Number(selectedSubLabelId)
            )
            .eq(
              "customer_id",
              customer.id
            )
            .eq(
              "is_active",
              true
            )
            .maybeSingle();

          if (
            selectedSubLabelError ||
            !selectedSubLabel
          ) {
            console.error(
              "Selected Sub Label Error:",
              selectedSubLabelError
            );

            throw new Error(
              "Selected Sub Label valid नहीं है"
            );
          }
        }
      }

      const timestamp = Date.now();

      const coverName =
        `${timestamp}-${cover.name}`;

      const audioName =
        `${timestamp}-${audio.name}`;

      const coverPath =
        `covers/${coverName}`;

      const audioPath =
        `audio/${audioName}`;

      /*
        UPLOAD COVER
      */

      const {
        error: coverError,
      } = await supabase.storage
        .from("songs")
        .upload(
          coverPath,
          cover
        );

      if (coverError) {
        console.error(
          "Cover upload error:",
          coverError
        );

        throw coverError;
      }

      /*
        UPLOAD AUDIO
        WAV + MP3 SUPPORT
      */

      const {
        error: audioError,
      } = await supabase.storage
        .from("songs")
        .upload(
          audioPath,
          audio,
          {
            contentType:
              audio.type || "audio/wav",
            upsert: false,
          }
        );

      if (audioError) {
        console.error(
          "Audio upload error:",
          audioError
        );

        await supabase.storage
          .from("songs")
          .remove([
            coverPath,
          ]);

        throw audioError;
      }

      /*
        CREATE SONG
      */

      const {
        data: newSong,
        error: databaseError,
      } = await supabase
        .from("songs")
        .insert([
          {
            song_title:
              songTitle.trim(),

            artist_name:
              artistName.trim(),

            album_name:
              albumName.trim(),

            singer_name:
              singerName.trim(),

            composer:
              composer.trim(),

            lyricist:
              lyricist.trim(),

            genre:
              genre.trim(),

            language:
              language.trim(),

            release_date:
              releaseDate || null,

            cover_url:
              coverPath,

            audio_url:
              audioPath,

            status:
              "Pending",
          },
        ])
        .select("id")
        .single();

      if (
        databaseError ||
        !newSong
      ) {
        console.error(
          "Song database error:",
          databaseError
        );

        await supabase.storage
          .from("songs")
          .remove([
            coverPath,
            audioPath,
          ]);

        throw (
          databaseError ||
          new Error(
            "Song create failed"
          )
        );
      }

      /*
        CUSTOMER SONG LINK
      */

      if (
        !isAdmin &&
        customer
      ) {
        const {
          error:
            customerSongError,
        } = await supabase
          .from("customer_songs")
          .insert([
            {
              customer_id:
                customer.id,

              song_id:
                newSong.id,
            },
          ]);

        if (customerSongError) {
          console.error(
            "Customer song linking error:",
            customerSongError
          );

          await supabase
            .from("songs")
            .delete()
            .eq(
              "id",
              newSong.id
            );

          await supabase.storage
            .from("songs")
            .remove([
              coverPath,
              audioPath,
            ]);

          throw customerSongError;
        }

        /*
          SUB LABEL SONG LINK
        */

        if (selectedSubLabelId) {
          const {
            error:
              subLabelSongError,
          } = await supabase
            .from("sub_label_songs")
            .insert([
              {
                sub_label_id:
                  Number(
                    selectedSubLabelId
                  ),

                song_id:
                  newSong.id,
              },
            ]);

          if (
            subLabelSongError
          ) {
            console.error(
              "Sub Label song linking error:",
              subLabelSongError
            );

            /*
              CUSTOMER LINK DELETE
            */

            await supabase
              .from("customer_songs")
              .delete()
              .eq(
                "song_id",
                newSong.id
              )
              .eq(
                "customer_id",
                customer.id
              );

            /*
              SONG DELETE
            */

            await supabase
              .from("songs")
              .delete()
              .eq(
                "id",
                newSong.id
              );

            /*
              FILE DELETE
            */

            await supabase.storage
              .from("songs")
              .remove([
                coverPath,
                audioPath,
              ]);

            throw subLabelSongError;
          }
        }
      }

      /*
        SUCCESS
      */

      if (isAdmin) {
        alert(
          "Song Uploaded Successfully ✅"
        );

        router.push(
          "/dashboard"
        );
      } else {
        const selectedName =
          subLabels.find(
            (item) =>
              item.id ===
              Number(
                selectedSubLabelId
              )
          )?.sub_label_name;

        alert(
          `Song Uploaded Successfully ✅\n\nCustomer: ${
            customer?.customer_name ||
            ""
          }\nSub Label: ${
            selectedName ||
            "Main Customer Label"
          }`
        );

        router.push(
          "/customer-dashboard"
        );
      }

      /*
        FORM RESET
      */

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
      setSelectedSubLabelId("");

      const fileInputs =
        document.querySelectorAll(
          'input[type="file"]'
        ) as NodeListOf<HTMLInputElement>;

      fileInputs.forEach(
        (input) => {
          input.value = "";
        }
      );
    } catch (error: any) {
      console.error(
        "Upload error:",
        error
      );

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
          justifyContent:
            "center",
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
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
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
            onClick={() =>
              router.push(
                isAdmin
                  ? "/dashboard"
                  : "/customer-dashboard"
              )
            }
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
          {/* CUSTOMER INFO */}

          {!isAdmin && (
            <div
              style={{
                background: "#0f172a",
                border:
                  "1px solid #334155",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "5px",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "11px",
                  marginBottom: "5px",
                }}
              >
                UPLOADING FOR
              </div>

              <div
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "15px",
                }}
              >
                {customerName ||
                  "Customer"}
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  marginTop: "5px",
                }}
              >
                Label:{" "}
                {labelName ||
                  "Label Name Not Set"}
              </div>
            </div>
          )}

          {/* SUB LABEL */}

          {!isAdmin &&
            subLabels.length > 0 && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: "#cbd5e1",
                    fontSize: "14px",
                    marginBottom: "7px",
                    fontWeight: "600",
                  }}
                >
                  Select Sub Label
                </label>

                <select
                  value={
                    selectedSubLabelId
                  }
                  onChange={(e) =>
                    setSelectedSubLabelId(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    background: "#0f172a",
                    color: "#fff",
                    border:
                      "1px solid #334155",
                    padding: "12px",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                >
                  <option value="">
                    -- Select Sub Label --
                  </option>

                  {subLabels.map(
                    (subLabel) => (
                      <option
                        key={
                          subLabel.id
                        }
                        value={
                          subLabel.id
                        }
                      >
                        {
                          subLabel.sub_label_name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

          {!isAdmin &&
            subLabels.length === 0 && (
              <div
                style={{
                  background:
                    "rgba(59,130,246,0.10)",
                  border:
                    "1px solid rgba(59,130,246,0.30)",
                  color: "#bfdbfe",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              >
                ℹ️ Is customer ke liye
                abhi koi active Sub Label
                available nahi hai. Song
                main customer label ke naam
                par upload hoga.
              </div>
            )}

          <input
            placeholder="Song Title"
            value={songTitle}
            onChange={(e) =>
              setSongTitle(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Artist Name"
            value={artistName}
            onChange={(e) =>
              setArtistName(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Album Name"
            value={albumName}
            onChange={(e) =>
              setAlbumName(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Singer Name"
            value={singerName}
            onChange={(e) =>
              setSingerName(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Composer"
            value={composer}
            onChange={(e) =>
              setComposer(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Lyricist"
            value={lyricist}
            onChange={(e) =>
              setLyricist(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Genre"
            value={genre}
            onChange={(e) =>
              setGenre(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Language"
            value={language}
            onChange={(e) =>
              setLanguage(
                e.target.value
              )
            }
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
            onChange={(e) =>
              setReleaseDate(
                e.target.value
              )
            }
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
              setCover(
                e.target.files?.[0] ||
                  null
              )
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
            accept="audio/*,.wav,.mp3"
            onChange={(e) =>
              setAudio(
                e.target.files?.[0] ||
                  null
              )
            }
            style={fileInputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? "#6b7280"
                : "#22c55e",
              color: "#fff",
              border: "none",
              padding: "13px",
              borderRadius: "8px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontWeight: "bold",
              fontSize: "15px",
              marginTop: "10px",
            }}
          >
            {loading
              ? "Uploading..."
              : "Upload Song"}
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