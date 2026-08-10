"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  async function handlePasswordUpdate() {
    if (password.length < 6) {
      alert("Password कम से कम 6 characters का होना चाहिए");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error(error);
      alert(`Password Set Failed ❌\n${error.message}`);
      setLoading(false);
      return;
    }

    alert("Password Set Successfully ✅");

    router.replace("/customer-dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "30px",
          background: "#1e293b",
          borderRadius: "12px",
        }}
      >
        <h1>Set Your Password 🔐</h1>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "20px",
            borderRadius: "8px",
            border: "none",
          }}
        />

        <button
          onClick={handlePasswordUpdate}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "15px",
            padding: "12px",
            background: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {loading ? "Saving..." : "Set Password"}
        </button>
      </div>
    </main>
  );
}