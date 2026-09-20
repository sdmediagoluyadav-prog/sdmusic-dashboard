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

  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [selectedSubLabel, setSelectedSubLabel] =
    useState<SubLabel | null>(null);

  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      // ==============================
      // CHECK SESSION
      // ==============================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      // ==============================
      // CHECK ROLE
      // ==============================

      const roleResponse = await fetch("/api/auth/role", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const roleData = await roleResponse.json();

      console.log("Sub Label Dashboard Role:", roleData);

      if (!roleResponse.ok) {
        console.error("Role error:", roleData);

        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      // =====================================================
      // CUSTOMER LOGIN
      // =====================================================

      if (roleData.role === "customer") {
        setRole("customer");

        if (!roleData.customer) {
          alert("Customer account nahi mila ❌");
          router.replace("/login");
          return;
        }

        if (roleData.customer.is_active === false) {
          alert("Customer account inactive hai ❌");

          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setCustomerName(
          roleData.customer.customer_name || ""
        );

        // ==============================
        // LOAD CUSTOMER SUB LABELS
        // ==============================

        const {
          data: customerSubLabels,
          error: subLabelError,
        } = await supabase
          .from("sub_labels")
          .select(
            "id, customer_id, sub_label_name, email, auth_user_id, is_active, created_at"
          )
          .eq(
            "customer_id",
            roleData.customer.id
          )
          .order("id", {
            ascending: false,
          });

        if (subLabelError) {
          console.error(
            "Customer Sub Label Error:",
            subLabelError
          );

          alert(
            "Sub Labels load nahi ho paye ❌\n\n" +
              subLabelError.message
          );

          return;
        }

        setSubLabels(customerSubLabels || []);

        if (
          customerSubLabels &&
          customerSubLabels.length > 0
        ) {
          setSelectedSubLabel(
            customerSubLabels[0]
          );
        }

        return;
      }

      // =====================================================
      // SUB LABEL LOGIN
      // =====================================================

      if (roleData.role === "sub_label") {
        setRole("sub_label");

        if (!roleData.subLabel) {
          alert("Sub Label account nahi mila ❌");

          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (roleData.subLabel.is_active === false) {
          alert(
            "Aapka Sub Label account inactive hai ❌"
          );

          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const currentSubLabel: SubLabel =
          roleData.subLabel;

        setSubLabels([currentSubLabel]);
        setSelectedSubLabel(currentSubLabel);

        return;
      }

      // =====================================================
      // ADMIN LOGIN
      // =====================================================

      if (roleData.role === "admin") {
        router.replace("/dashboard");
        return;
      }

      // =====================================================
      // UNKNOWN ROLE
      // =====================================================

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error(
        "Sub Label Dashboard Error:",
        error
      );

      alert(
        "Dashboard load karne me problem aa gayi ❌"
      );

      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // LOGOUT
  // ==============================

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  // ==============================
  // SELECT SUB LABEL
  // ==============================

  function handleSubLabelChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedId = Number(event.target.value);

    const found = subLabels.find(
      (item) => item.id === selectedId
    );

    if (found) {
      setSelectedSubLabel(found);
    }
  }

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontSize: "18px",
        }}
      >
        Loading Sub Label Dashboard... 🔐
      </main>
    );
  }

  // ==============================
  // NO SUB LABEL
  // ==============================

  if (
    role === "customer" &&
    subLabels.length === 0
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "15px",
            padding: "35px",
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: "50px",
              marginBottom: "15px",
            }}
          >
            🏷️
          </div>

          <h2
            style={{
              margin: "0 0 10px",
            }}
          >
            No Sub Label Found
          </h2>

          <p
            style={{
              color: "#9ca3af",
              lineHeight: "1.6",
            }}
          >
            Aapke account me abhi koi Sub Label
            available nahi hai.
          </p>

          <button
            onClick={() =>
              router.push("/customer-dashboard")
            }
            style={{
              marginTop: "15px",
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ← Customer Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!selectedSubLabel) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        display: "flex",
      }}
    >
      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          background: "#111827",
          borderRight: "1px solid #1f2937",
          padding: "25px 18px",
          boxSizing: "border-box",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* LOGO */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "110px",
              height: "110px",
              objectFit: "contain",
              display: "block",
              margin: "0 auto 10px",
            }}
          />

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            Sub Label Dashboard
          </p>
        </div>

        {/* CUSTOMER SUB LABEL SELECTOR */}

        {role === "customer" &&
          subLabels.length > 0 && (
            <div
              style={{
                marginBottom: "25px",
              }}
            >
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: "12px",
                  marginBottom: "7px",
                }}
              >
                Select Sub Label
              </label>

              <select
                value={selectedSubLabel.id}
                onChange={handleSubLabelChange}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border:
                    "1px solid #374151",
                  background: "#1f2937",
                  color: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
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

        {/* MENU */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* DASHBOARD */}

          <button
            style={{
              width: "100%",
              padding: "13px 15px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              textAlign: "left",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            🏠 Dashboard
          </button>

          {/* UPLOAD */}

          <button
            onClick={() =>
              router.push(
                "/sub-label-dashboard/upload"
              )
            }
            style={{
              width: "100%",
              padding: "13px 15px",
              border: "none",
              borderRadius: "8px",
              background: "#1f2937",
              color: "#d1d5db",
              textAlign: "left",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            🎵 Upload Song
          </button>

          {/* MY SONGS */}

          <button
            onClick={() =>
              alert(
                "My Songs section next step me banega."
              )
            }
            style={{
              width: "100%",
              padding: "13px 15px",
              border: "none",
              borderRadius: "8px",
              background: "#1f2937",
              color: "#d1d5db",
              textAlign: "left",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            🎶 My Songs
          </button>

          {/* ARTISTS */}

          <button
            onClick={() =>
              alert(
                "Artists section next step me banega."
              )
            }
            style={{
              width: "100%",
              padding: "13px 15px",
              border: "none",
              borderRadius: "8px",
              background: "#1f2937",
              color: "#d1d5db",
              textAlign: "left",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            👤 Artists
          </button>

          {/* PROFILE */}

          <button
            onClick={() =>
              alert(
                "Profile section next step me banega."
              )
            }
            style={{
              width: "100%",
              padding: "13px 15px",
              border: "none",
              borderRadius: "8px",
              background: "#1f2937",
              color: "#d1d5db",
              textAlign: "left",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            ⚙️ Profile
          </button>
        </div>

        {/* CUSTOMER BACK BUTTON */}

        {role === "customer" && (
          <button
            onClick={() =>
              router.push("/customer-dashboard")
            }
            style={{
              position: "absolute",
              left: "18px",
              right: "18px",
              bottom: "75px",
              width: "calc(100% - 36px)",
              padding: "11px",
              border: "none",
              borderRadius: "8px",
              background: "#374151",
              color: "#ffffff",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            ← Customer Dashboard
          </button>
        )}

        {/* LOGOUT */}

        <div
          style={{
            position: "absolute",
            left: "18px",
            right: "18px",
            bottom: "20px",
          }}
        >
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "8px",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ================================================= */}
      {/* MAIN CONTENT */}
      {/* ================================================= */}

      <section
        style={{
          marginLeft: "250px",
          width: "calc(100% - 250px)",
          minHeight: "100vh",
          padding: "35px",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <p
            style={{
              margin: "0 0 7px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            {role === "customer"
              ? `Customer: ${customerName}`
              : "Sub Label Account"}
          </p>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "30px",
              fontWeight: "700",
            }}
          >
            Welcome,{" "}
            {selectedSubLabel.sub_label_name} 👋
          </h1>

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "15px",
            }}
          >
            SD Media Entertainment Sub Label
            Dashboard
          </p>
        </div>

        {/* ================================================= */}
        {/* SELECTED SUB LABEL CARD */}
        {/* ================================================= */}

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "14px",
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
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Selected Sub Label
              </p>

              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                }}
              >
                {selectedSubLabel.sub_label_name}
              </h2>
            </div>

            <span
              style={{
                display: "inline-block",
                padding: "7px 14px",
                borderRadius: "999px",
                background:
                  selectedSubLabel.is_active
                    ? "#14532d"
                    : "#7f1d1d",
                color:
                  selectedSubLabel.is_active
                    ? "#86efac"
                    : "#fca5a5",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              {selectedSubLabel.is_active
                ? "Active"
                : "Inactive"}
            </span>
          </div>
        </div>

        {/* ================================================= */}
        {/* STATS */}
        {/* ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          {/* TOTAL */}

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              Total Songs
            </p>

            <h2
              style={{
                margin: 0,
                fontSize: "30px",
              }}
            >
              0
            </h2>
          </div>

          {/* APPROVED */}

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              Approved
            </p>

            <h2
              style={{
                margin: 0,
                fontSize: "30px",
                color: "#22c55e",
              }}
            >
              0
            </h2>
          </div>

          {/* PENDING */}

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              Pending
            </p>

            <h2
              style={{
                margin: 0,
                fontSize: "30px",
                color: "#f59e0b",
              }}
            >
              0
            </h2>
          </div>
        </div>

        {/* ================================================= */}
        {/* ACCOUNT */}
        {/* ================================================= */}

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "25px",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "20px",
            }}
          >
            Sub Label Account
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Sub Label Name
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                {selectedSubLabel.sub_label_name}
              </p>
            </div>

            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Login Email
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                {selectedSubLabel.email}
              </p>
            </div>

            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Account Status
              </p>

              <span
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background:
                    selectedSubLabel.is_active
                      ? "#14532d"
                      : "#7f1d1d",
                  color:
                    selectedSubLabel.is_active
                      ? "#86efac"
                      : "#fca5a5",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                {selectedSubLabel.is_active
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Account ID
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                #{selectedSubLabel.id}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* MUSIC MANAGEMENT */}
        {/* ================================================= */}

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "14px",
            padding: "25px",
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "20px",
            }}
          >
            Sub Label Music Management
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#9ca3af",
              lineHeight: "1.6",
            }}
          >
            Selected Sub Label ke songs yahan se
            manage kiye jayenge.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "15px",
            }}
          >
            {/* UPLOAD */}

            <button
              onClick={() =>
                router.push(
                  "/sub-label-dashboard/upload"
                )
              }
              style={{
                background: "#1f2937",
                border: "none",
                borderRadius: "10px",
                padding: "18px",
                color: "#ffffff",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  marginBottom: "8px",
                }}
              >
                🎵
              </div>

              <h3
                style={{
                  margin: "0 0 5px",
                  fontSize: "16px",
                }}
              >
                Upload Songs
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Song upload karein.
              </p>
            </button>

            {/* MY SONGS */}

            <button
              onClick={() =>
                alert(
                  "My Songs section next step me banega."
                )
              }
              style={{
                background: "#1f2937",
                border: "none",
                borderRadius: "10px",
                padding: "18px",
                color: "#ffffff",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  marginBottom: "8px",
                }}
              >
                📋
              </div>

              <h3
                style={{
                  margin: "0 0 5px",
                  fontSize: "16px",
                }}
              >
                Manage Songs
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Uploaded songs manage karein.
              </p>
            </button>

            {/* STATUS */}

            <button
              onClick={() =>
                alert(
                  "Song Status section next step me banega."
                )
              }
              style={{
                background: "#1f2937",
                border: "none",
                borderRadius: "10px",
                padding: "18px",
                color: "#ffffff",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  marginBottom: "8px",
                }}
              >
                📊
              </div>

              <h3
                style={{
                  margin: "0 0 5px",
                  fontSize: "16px",
                }}
              >
                Song Status
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                Approval status dekhein.
              </p>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}