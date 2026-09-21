"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SubLabel = {
  id: string;
  customer_id: string | null;
  sub_label_name: string;
  email: string;
  auth_user_id: string | null;
  is_active: boolean;
  created_at: string;
};

export default function SubLabelProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<SubLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("sub_labels")
        .select(
          "id, customer_id, sub_label_name, email, auth_user_id, is_active, created_at"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        setError("Sub Label profile नहीं मिला।");
        return;
      }

      setProfile(data);
    } catch (err: any) {
      console.error("Profile error:", err);
      setError(err?.message || "Profile load नहीं हो पाया।");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
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
          fontSize: "18px",
        }}
      >
        Loading Profile...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b1120",
          color: "white",
          padding: "40px",
        }}
      >
        <button
          onClick={() => router.push("/sub-label-dashboard")}
          style={{
            background: "#1e293b",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "25px",
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            background: "#111827",
            border: "1px solid #263244",
            borderRadius: "14px",
            padding: "25px",
            maxWidth: "700px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Profile</h2>

          <p style={{ color: "#f87171" }}>{error}</p>

          <button
            onClick={loadProfile}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1120",
        color: "white",
        padding: "30px",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            Profile
          </h1>

          <p
            style={{
              marginTop: "6px",
              color: "#94a3b8",
              marginBottom: 0,
            }}
          >
            Sub Label Account Information
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "#dc2626",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Logout
        </button>
      </div>

      {/* Back Button */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 25px auto",
        }}
      >
        <button
          onClick={() => router.push("/sub-label-dashboard")}
          style={{
            background: "#1e293b",
            color: "white",
            border: "1px solid #334155",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Profile Card */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          background: "#111827",
          border: "1px solid #263244",
          borderRadius: "16px",
          padding: "30px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "65px",
              height: "65px",
              borderRadius: "50%",
              background: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
            }}
          >
            👤
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
              }}
            >
              {profile.sub_label_name}
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#94a3b8",
              }}
            >
              Sub Label Profile
            </p>
          </div>
        </div>

        {/* Details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {/* Sub Label Name */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #263244",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                marginBottom: "7px",
              }}
            >
              Sub Label Name
            </div>

            <div
              style={{
                fontSize: "17px",
                fontWeight: 600,
              }}
            >
              {profile.sub_label_name || "—"}
            </div>
          </div>

          {/* Email */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #263244",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                marginBottom: "7px",
              }}
            >
              Login Email
            </div>

            <div
              style={{
                fontSize: "17px",
                fontWeight: 600,
                wordBreak: "break-word",
              }}
            >
              {profile.email || "—"}
            </div>
          </div>

          {/* Account ID */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #263244",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                marginBottom: "7px",
              }}
            >
              Account ID
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                wordBreak: "break-all",
              }}
            >
              {profile.id || "—"}
            </div>
          </div>

          {/* Customer ID */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #263244",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                marginBottom: "7px",
              }}
            >
              Customer ID
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                wordBreak: "break-all",
              }}
            >
              {profile.customer_id || "—"}
            </div>
          </div>

          {/* Status */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #263244",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                marginBottom: "7px",
              }}
            >
              Account Status
            </div>

            <span
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: "20px",
                background: profile.is_active
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(239,68,68,0.15)",
                color: profile.is_active ? "#4ade80" : "#f87171",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {profile.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Created Date */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #263244",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                marginBottom: "7px",
              }}
            >
              Account Created
            </div>

            <div
              style={{
                fontSize: "17px",
                fontWeight: 600,
              }}
            >
              {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}