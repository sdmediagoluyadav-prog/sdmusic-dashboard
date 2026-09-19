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
    if (!email.trim() || !password) {
      alert("Email aur Password dono bharo ❌");
      return;
    }

    setLoading(true);

    try {
      // --------------------------------
      // LOGIN
      // --------------------------------

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        alert(error.message);
        return;
      }

      const user = data.user;
      const session = data.session;

      if (!user || !session) {
        alert("Login Failed. Session nahi mila ❌");
        return;
      }

      console.log("Logged in Auth User ID:", user.id);
      console.log("Logged in Email:", user.email);

      // --------------------------------
      // SERVER SIDE ROLE CHECK
      // --------------------------------

      const response = await fetch("/api/auth/role", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const roleData = await response.json();

      console.log("Role Response:", roleData);

      if (!response.ok) {
        console.error("Role Check Error:", roleData);

        alert(
          "Account role check me problem aa rahi hai ❌\n\n" +
            (roleData.error || "Role identify nahi ho saka.")
        );

        await supabase.auth.signOut();
        return;
      }

      // --------------------------------
      // CUSTOMER
      // --------------------------------

      if (roleData.role === "customer") {
        if (roleData.customer?.is_active === false) {
          alert("Aapka customer account inactive hai ❌");

          await supabase.auth.signOut();
          return;
        }

        alert("Customer Login Successful ✅");

        router.replace("/customer-dashboard");
        return;
      }

      // --------------------------------
      // SUB LABEL
      // --------------------------------

      if (roleData.role === "sub_label") {
        if (roleData.subLabel?.is_active === false) {
          alert("Aapka Sub Label account inactive hai ❌");

          await supabase.auth.signOut();
          return;
        }

        alert("Sub Label Login Successful ✅");

        router.replace("/sub-label-dashboard");
        return;
      }

      // --------------------------------
      // ADMIN
      // --------------------------------

      if (roleData.role === "admin") {
        alert("Admin Login Successful ✅");

        router.replace("/dashboard");
        return;
      }

      // --------------------------------
      // UNKNOWN ROLE
      // --------------------------------

      alert("Account role identify nahi ho saka ❌");

      await supabase.auth.signOut();
    } catch (error) {
      console.error("Login Error:", error);

      alert("Login mein kuch galat ho gaya ❌");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#111827",
          borderRadius: "16px",
          padding: "30px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
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
              width: "100px",
              height: "100px",
              objectFit: "contain",
              marginBottom: "10px",
            }}
          />

          <h1
            style={{
              color: "#ffffff",
              fontSize: "25px",
              margin: "0 0 6px",
            }}
          >
            SD Media Entertainment
          </h1>

          <p
            style={{
              color: "#9ca3af",
              margin: 0,
              fontSize: "14px",
            }}
          >
            Music Distribution Dashboard
          </p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label
            style={{
              display: "block",
              color: "#d1d5db",
              fontSize: "14px",
              marginBottom: "7px",
            }}
          >
            Email
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px",
              borderRadius: "9px",
              border: "1px solid #374151",
              background: "#1f2937",
              color: "#ffffff",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: "22px" }}>
          <label
            style={{
              display: "block",
              color: "#d1d5db",
              fontSize: "14px",
              marginBottom: "7px",
            }}
          >
            Password
          </label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                login();
              }
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px",
              borderRadius: "9px",
              border: "1px solid #374151",
              background: "#1f2937",
              color: "#ffffff",
              outline: "none",
            }}
          />
        </div>

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "9px",
            background: loading ? "#4b5563" : "#2563eb",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </main>
  );
}