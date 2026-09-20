"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SubLabel = {
  id: number;
  customer_id: number;
  sub_label_name: string;
  email: string;
  auth_user_id: string;
  is_active: boolean;
  created_at: string;
};

type UserRole = "customer" | "sub_label" | "admin" | null;

export default function SubLabelDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);

  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [selectedSubLabel, setSelectedSubLabel] =
    useState<SubLabel | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const roleRes = await fetch("/api/auth/role", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const roleData = await roleRes.json();

      if (!roleRes.ok) {
        alert(roleData?.error || "Role check failed");
        router.push("/login");
        return;
      }

      setRole(roleData.role);

      /* =========================
         ADMIN
      ========================= */
      if (roleData.role === "admin") {
        router.push("/dashboard");
        return;
      }

      /* =========================
         CUSTOMER
      ========================= */
      if (roleData.role === "customer") {
        const customer = roleData.customer;

        if (!customer || !customer.is_active) {
          alert("Customer account inactive or not found.");
          router.push("/login");
          return;
        }

        setCustomerName(customer.customer_name || "");
        setCustomerId(customer.id);

        const { data: labels, error: labelsError } = await supabase
          .from("sub_labels")
          .select("*")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false });

        if (labelsError) {
          console.error(labelsError);
          alert("Sub Labels load nahi ho paaye.");
          return;
        }

        setSubLabels(labels || []);

        if (labels && labels.length > 0) {
          setSelectedSubLabel(labels[0]);
        }

        return;
      }

      /* =========================
         SUB LABEL
      ========================= */
      if (roleData.role === "sub_label") {
        const subLabel = roleData.subLabel;

        if (!subLabel || !subLabel.is_active) {
          alert("Sub Label account inactive or not found.");
          router.push("/login");
          return;
        }

        setSelectedSubLabel(subLabel);

        return;
      }

      alert("Invalid account role.");
      router.push("/login");
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading Sub Label Dashboard...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
      }}
    >
      {/* =========================
          SIDEBAR
      ========================= */}
      <aside
        style={{
          width: "250px",
          background: "#111827",
          borderRight: "1px solid #1f2937",
          minHeight: "100vh",
          padding: "20px 14px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* LOGO */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 10px 25px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media"
            style={{
              width: "42px",
              height: "42px",
              objectFit: "contain",
            }}
          />

          <div>
            <div
              style={{
                fontWeight: "700",
                fontSize: "16px",
              }}
            >
              SD Media
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: "11px",
              }}
            >
              Sub Label Dashboard
            </div>
          </div>
        </div>

        {/* =========================
            DASHBOARD
        ========================= */}
        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🏠 Dashboard
        </button>

        {/* =========================
            UPLOAD SONG
        ========================= */}
        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/upload"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🎵 Upload Song
        </button>

        {/* =========================
            MY SONGS
        ========================= */}
        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/my-songs"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🎶 My Songs
        </button>

        {/* =========================
            ARTISTS
        ========================= */}
        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/artists"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          👤 Artists
        </button>

        {/* =========================
            PROFILE
        ========================= */}
        <button
          onClick={() =>
            router.push(
              "/sub-label-dashboard/profile"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "6px",
            border: "none",
            borderRadius: "8px",
            background: "transparent",
            color: "#cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ⚙️ Profile
        </button>

        {/* =========================
            CUSTOMER DASHBOARD
        ========================= */}
        {role === "customer" && (
          <button
            onClick={() =>
              router.push("/customer-dashboard")
            }
            style={{
              width: "100%",
              padding: "12px 14px",
              marginBottom: "6px",
              border: "none",
              borderRadius: "8px",
              background: "transparent",
              color: "#cbd5e1",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            👑 Customer Dashboard
          </button>
        )}

        {/* =========================
            LOGOUT
        ========================= */}
        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: "12px 14px",
            marginTop: "25px",
            border: "1px solid #374151",
            borderRadius: "8px",
            background: "#1f2937",
            color: "#f87171",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🚪 Logout
        </button>
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}
      <main
        style={{
          marginLeft: "250px",
          width: "calc(100% - 250px)",
          padding: "30px",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Sub Label Dashboard
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "6px",
            }}
          >
            Manage your music and sub label account.
          </p>
        </div>

        {/* =========================
            SELECTED SUB LABEL
        ========================= */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "22px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: "13px",
              marginBottom: "7px",
            }}
          >
            Selected Sub Label
          </div>

          {selectedSubLabel ? (
            <>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {selectedSubLabel.sub_label_name}
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  marginTop: "5px",
                }}
              >
                {selectedSubLabel.email}
              </div>
            </>
          ) : (
            <div
              style={{
                color: "#94a3b8",
              }}
            >
              No Sub Label found.
            </div>
          )}

          {/* CUSTOMER SUB LABEL SELECTOR */}
          {role === "customer" &&
            subLabels.length > 0 && (
              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "13px",
                    marginBottom: "7px",
                  }}
                >
                  Select Sub Label
                </label>

                <select
                  value={selectedSubLabel?.id || ""}
                  onChange={(e) => {
                    const selected = subLabels.find(
                      (item) =>
                        item.id === Number(e.target.value)
                    );

                    if (selected) {
                      setSelectedSubLabel(selected);
                    }
                  }}
                  style={{
                    width: "100%",
                    maxWidth: "450px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "white",
                    outline: "none",
                  }}
                >
                  {subLabels.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.sub_label_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
        </div>

        {/* =========================
            STATS
        ========================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              Total Songs
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginTop: "8px",
              }}
            >
              0
            </div>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              Approved
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginTop: "8px",
                color: "#22c55e",
              }}
            >
              0
            </div>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              Pending
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginTop: "8px",
                color: "#facc15",
              }}
            >
              0
            </div>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              Rejected
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginTop: "8px",
                color: "#ef4444",
              }}
            >
              0
            </div>
          </div>
        </div>

        {/* =========================
            ACCOUNT CARD
        ========================= */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "22px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "19px",
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Account Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Sub Label
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {selectedSubLabel?.sub_label_name ||
                  "N/A"}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Email
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {selectedSubLabel?.email || "N/A"}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                Account Status
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontWeight: "600",
                  color: selectedSubLabel?.is_active
                    ? "#22c55e"
                    : "#ef4444",
                }}
              >
                {selectedSubLabel?.is_active
                  ? "Active"
                  : "Inactive"}
              </div>
            </div>

            {role === "customer" && (
              <div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "12px",
                  }}
                >
                  Customer
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontWeight: "600",
                  }}
                >
                  {customerName || "N/A"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================
            MUSIC MANAGEMENT
        ========================= */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            padding: "22px",
          }}
        >
          <h2
            style={{
              fontSize: "19px",
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Music Management
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >
            {/* UPLOAD */}
            <div
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/upload"
                )
              }
              style={{
                border: "1px solid #1f2937",
                borderRadius: "10px",
                padding: "20px",
                cursor: "pointer",
                background: "#0f172a",
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                  marginBottom: "10px",
                }}
              >
                🎵
              </div>

              <div
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                }}
              >
                Upload Song
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                Upload your new songs.
              </div>
            </div>

            {/* MY SONGS */}
            <div
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/my-songs"
                )
              }
              style={{
                border: "1px solid #1f2937",
                borderRadius: "10px",
                padding: "20px",
                cursor: "pointer",
                background: "#0f172a",
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                  marginBottom: "10px",
                }}
              >
                🎶
              </div>

              <div
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                }}
              >
                My Songs
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                View and manage your songs.
              </div>
            </div>

            {/* SONG STATUS */}
            <div
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/my-songs"
                )
              }
              style={{
                border: "1px solid #1f2937",
                borderRadius: "10px",
                padding: "20px",
                cursor: "pointer",
                background: "#0f172a",
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                  marginBottom: "10px",
                }}
              >
                📊
              </div>

              <div
                style={{
                  fontWeight: "700",
                  marginBottom: "6px",
                }}
              >
                Song Status
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                Check approved, pending and rejected
                songs.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}