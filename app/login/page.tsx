"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Session बनने के लिए थोड़ा इंतज़ार
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      alert("Login Successful ✅");
      router.replace("/dashboard");
    } else {
      alert("Login Failed. Session not found.");
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#111827",
      }}
    >
      <div
        style={{
          width: "400px",
          background: "#1f2937",
          padding: "30px",
          borderRadius: "10px",
        }}
      >
        <h2
          style={{
            color: "white",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          SD Media Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
          }}
        />

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </main>
  );
}