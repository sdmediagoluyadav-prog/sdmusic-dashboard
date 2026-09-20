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

export default function SubLabelProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [selectedSubLabel, setSelectedSubLabel] =
    useState<SubLabel | null>(null);

  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      // ==============================
      // SESSION
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
      // ROLE
      // ==============================

      const roleResponse = await fetch("/api/auth/role", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const roleData = await roleResponse.json();

      if (!roleResponse.ok) {
        console.error("Role error:", roleData);

        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      // ==============================
      // CUSTOMER LOGIN
      // ==============================

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
        // CUSTOMER SUB LABELS
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
            "Sub Label Error:",
            subLabelError
          );

          alert(
            "Sub Labels load nahi ho paye ❌\n\n" +
              subLabelError.message
          );

          return;
        }

        setSubLabels(
          customerSubLabels || []
        );

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

      // ==============================
      // SUB LABEL LOGIN
      // ==============================

      if (roleData.role === "sub_label") {
        setRole("sub_label");

        if (!roleData.subLabel) {
          alert(
            "Sub Label account nahi mila ❌"
          );

          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (
          roleData.subLabel.is_active ===
          false
        ) {
          alert(
            "Aapka Sub Label account inactive hai ❌"
          );

          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const currentSubLabel: SubLabel =
          roleData.subLabel;

        setSubLabels([
          currentSubLabel,
        ]);

        setSelectedSubLabel(
          currentSubLabel
        );

        return;
      }

      // ==============================
      // ADMIN
      // ==============================

      if (roleData.role === "admin") {
        router.replace("/dashboard");
        return;
      }

      // ==============================
      // UNKNOWN ROLE
      // ==============================

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error(
        "Profile Load Error:",
        error
      );

      alert(
        "Profile load karne me problem aa gayi ❌"
      );

      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // SELECT SUB LABEL
  // ==============================

  function handleSubLabelChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedId = Number(
      event.target.value
    );

    const found = subLabels.find(
      (item) => item.id === selectedId
    );

    if (found) {
      setSelectedSubLabel(found);
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
        Loading Profile... 🔐
      </main>
    );
  }

  // ==============================
  // NO SUB LABEL
  // ==============================

  if (!selectedSubLabel) {
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
            ⚙️
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
            Is account ke liye koi Sub Label
            available nahi hai.
          </p>

          {role === "customer" && (
            <button
              onClick={() =>
                router.push(
                  "/customer-dashboard"
                )
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
          )}
        </div>
      </main>
    );
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
      {/* ==============================
          SIDEBAR
      ============================== */}

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

        {/* ==============================
            SUB LABEL SELECTOR
        ============================== */}

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
                onChange={
                  handleSubLabelChange
                }
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

        {/* ==============================
            MENU
        ============================== */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <NavButton
            text="🏠 Dashboard"
            onClick={() =>
              router.push(
                "/sub-label-dashboard"
              )
            }
          />

          <NavButton
            text="🎵 Upload Song"
            onClick={() =>
              router.push(
                "/sub-label-dashboard/upload"
              )
            }
          />

          <NavButton
            text="🎶 My Songs"
            onClick={() =>
              router.push(
                "/sub-label-dashboard/my-songs"
              )
            }
          />

          <NavButton
            text="👤 Artists"
            onClick={() =>
              router.push(
                "/sub-label-dashboard/artists"
              )
            }
          />

          <NavButton
            text="⚙️ Profile"
            active
            onClick={() =>
              router.push(
                "/sub-label-dashboard/profile"
              )
            }
          />
        </div>

        {/* CUSTOMER DASHBOARD */}

        {role === "customer" && (
          <button
            onClick={() =>
              router.push(
                "/customer-dashboard"
              )
            }
            style={{
              position: "absolute",
              left: "18px",
              right: "18px",
              bottom: "75px",
              width:
                "calc(100% - 36px)",
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

      {/* ==============================
          MAIN CONTENT
      ============================== */}

      <section
        style={{
          marginLeft: "250px",
          width:
            "calc(100% - 250px)",
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
            Profile ⚙️
          </h1>

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "15px",
            }}
          >
            Sub Label account ki details
          </p>
        </div>

        {/* ==============================
            PROFILE HEADER CARD
        ============================== */}

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* PROFILE ICON */}

            <div
              style={{
                width: "75px",
                height: "75px",
                borderRadius: "50%",
                background: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "34px",
                flexShrink: 0,
              }}
            >
              🏷️
            </div>

            <div
              style={{
                flex: 1,
                minWidth: "200px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 7px",
                  fontSize: "24px",
                }}
              >
                {
                  selectedSubLabel.sub_label_name
                }
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                Sub Label Account
              </p>
            </div>

            {/* STATUS */}

            <span
              style={{
                display: "inline-block",
                padding: "8px 14px",
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
                fontWeight: "700",
              }}
            >
              {selectedSubLabel.is_active
                ? "Active Account"
                : "Inactive Account"}
            </span>
          </div>
        </div>

        {/* ==============================
            ACCOUNT INFORMATION
        ============================== */}

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: "0 0 22px",
              fontSize: "20px",
            }}
          >
            Account Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            {/* SUB LABEL NAME */}

            <InfoCard
              label="Sub Label Name"
              value={
                selectedSubLabel.sub_label_name
              }
              icon="🏷️"
            />

            {/* LOGIN EMAIL */}

            <InfoCard
              label="Login Email"
              value={
                selectedSubLabel.email
              }
              icon="📧"
            />

            {/* ACCOUNT ID */}

            <InfoCard
              label="Account ID"
              value={`#${selectedSubLabel.id}`}
              icon="🆔"
            />

            {/* CUSTOMER ID */}

            <InfoCard
              label="Customer ID"
              value={`#${selectedSubLabel.customer_id}`}
              icon="👤"
            />

            {/* STATUS */}

            <InfoCard
              label="Account Status"
              value={
                selectedSubLabel.is_active
                  ? "Active"
                  : "Inactive"
              }
              icon="🔐"
            />

            {/* CREATED */}

            <InfoCard
              label="Account Created"
              value={
                selectedSubLabel.created_at
                  ? new Date(
                      selectedSubLabel.created_at
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )
                  : "-"
              }
              icon="📅"
            />
          </div>
        </div>

        {/* ==============================
            CUSTOMER INFORMATION
        ============================== */}

        {role === "customer" && (
          <div
            style={{
              background: "#111827",
              border:
                "1px solid #1f2937",
              borderRadius: "14px",
              padding: "25px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "20px",
              }}
            >
              Customer Information
            </h2>

            <InfoCard
              label="Customer Name"
              value={
                customerName || "-"
              }
              icon="👤"
            />
          </div>
        )}

        {/* ==============================
            ACCOUNT SECURITY
        ============================== */}

        <div
          style={{
            background: "#111827",
            border:
              "1px solid #1f2937",
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
            Account Security
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#9ca3af",
              lineHeight: "1.6",
              fontSize: "14px",
            }}
          >
            Aapke Sub Label account ki login
            information securely managed hai.
          </p>

          <div
            style={{
              padding: "15px",
              borderRadius: "9px",
              background:
                "rgba(37,99,235,0.10)",
              border:
                "1px solid rgba(59,130,246,0.25)",
              color: "#bfdbfe",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            🔒 Password yahan display nahi kiya
            jaata hai. Account security ke liye
            password ko hidden rakha gaya hai.
          </div>
        </div>

        {/* ==============================
            BACK BUTTONS
        ============================== */}

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "25px",
          }}
        >
          <button
            onClick={() =>
              router.push(
                "/sub-label-dashboard"
              )
            }
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ← Dashboard
          </button>

          <button
            onClick={() =>
              router.push(
                "/sub-label-dashboard/my-songs"
              )
            }
            style={{
              padding: "12px 18px",
              border:
                "1px solid #374151",
              borderRadius: "8px",
              background: "#1f2937",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            🎶 My Songs
          </button>

          <button
            onClick={() =>
              router.push(
                "/sub-label-dashboard/artists"
              )
            }
            style={{
              padding: "12px 18px",
              border:
                "1px solid #374151",
              borderRadius: "8px",
              background: "#1f2937",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            👤 Artists
          </button>
        </div>
      </section>
    </main>
  );
}

/* =========================
   NAV BUTTON
========================= */

function NavButton({
  text,
  onClick,
  active = false,
}: {
  text: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "13px 15px",
        border: active
          ? "1px solid #2563eb"
          : "none",
        borderRadius: "8px",
        background: active
          ? "#2563eb"
          : "#1f2937",
        color: "#ffffff",
        textAlign: "left",
        fontSize: "14px",
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );
}

/* =========================
   INFO CARD
========================= */

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            background: "#1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: "12px",
              marginBottom: "5px",
            }}
          >
            {label}
          </div>

          <div
            style={{
              color: "#e2e8f0",
              fontSize: "14px",
              fontWeight: "600",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}