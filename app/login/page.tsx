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

    try {
      // Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;

      if (!user) {
        alert("Login Failed. User not found.");
        setLoading(false);
        return;
      }

      // Check if this user is a Customer
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, customer_name, label_name, auth_user_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      console.log("Logged in user:", user.id);
      console.log("Customer:", customer);
      console.log("Customer error:", customerError);

      // Customer मिला
      if (customer) {
        alert("Customer Login Successful ✅");
        router.replace("/customer-dashboard");
        return;
      }

      // Customer नहीं मिला → Admin
      alert("Admin Login Successful ✅");
      router.replace("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Login में कुछ गलत हो गया ❌");
    } finally {
      setLoading(false);
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
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "400px",
          maxWidth: "100%",
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
            boxSizing: "border-box",
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
            boxSizing: "border-box",
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
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </main>
  );
}