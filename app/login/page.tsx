"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Login Successful");
      router.push("/dashboard");
    }
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
        <h2 style={{ color: "white", textAlign: "center" }}>
          SD Media Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px", marginTop: "20px" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px", marginTop: "10px" }}
        />

        <button
          onClick={login}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "20px",
            background: "#22c55e",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </div>
    </main>
  );
}