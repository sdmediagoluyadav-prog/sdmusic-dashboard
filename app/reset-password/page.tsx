"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function setupRecoverySession() {
      try {
        // --------------------------------
        // CHECK URL ERROR
        // --------------------------------

        const searchParams = new URLSearchParams(
          window.location.search
        );

        const urlError =
          searchParams.get("error");

        const urlErrorCode =
          searchParams.get("error_code");

        const urlErrorDescription =
          searchParams.get(
            "error_description"
          );

        if (urlError || urlErrorCode) {
          console.error(
            "Recovery URL error:",
            urlError,
            urlErrorCode,
            urlErrorDescription
          );

          if (mounted) {
            setCheckingSession(false);

            alert(
              `Password reset link invalid/expired ❌\n\n${
                urlErrorDescription
                  ? decodeURIComponent(
                      urlErrorDescription.replace(
                        /\+/g,
                        " "
                      )
                    )
                  : "Please request a new password reset email."
              }`
            );
          }

          return;
        }

        // --------------------------------
        // PKCE FLOW
        // --------------------------------

        const code =
          searchParams.get("code");

        if (code) {
          const {
            data,
            error,
          } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (error) {
            console.error(
              "Exchange code error:",
              error
            );

            if (mounted) {
              alert(
                `Password reset link invalid ❌\n\n${error.message}`
              );
              setCheckingSession(false);
            }

            return;
          }

          if (data.session) {
            console.log(
              "Recovery session created from code"
            );

            if (mounted) {
              setRecoveryReady(true);
              setCheckingSession(false);
            }

            return;
          }
        }

        // --------------------------------
        // IMPLICIT FLOW
        // --------------------------------

        const hash =
          window.location.hash;

        if (hash) {
          const hashParams =
            new URLSearchParams(
              hash.substring(1)
            );

          const accessToken =
            hashParams.get(
              "access_token"
            );

          const refreshToken =
            hashParams.get(
              "refresh_token"
            );

          const type =
            hashParams.get("type");

          if (
            accessToken &&
            refreshToken
          ) {
            const {
              data,
              error,
            } =
              await supabase.auth.setSession({
                access_token:
                  accessToken,
                refresh_token:
                  refreshToken,
              });

            if (error) {
              console.error(
                "Set recovery session error:",
                error
              );

              if (mounted) {
                alert(
                  `Password reset session failed ❌\n\n${error.message}`
                );
                setCheckingSession(false);
              }

              return;
            }

            if (data.session) {
              console.log(
                "Recovery session created from URL"
              );

              if (mounted) {
                setRecoveryReady(true);
                setCheckingSession(false);
              }

              return;
            }
          }

          if (
            type === "recovery"
          ) {
            console.log(
              "Recovery link detected"
            );
          }
        }

        // --------------------------------
        // CHECK EXISTING SESSION
        // --------------------------------

        const {
          data: sessionData,
        } =
          await supabase.auth.getSession();

        if (sessionData.session) {
          console.log(
            "Existing session found"
          );

          if (mounted) {
            setRecoveryReady(true);
            setCheckingSession(false);
          }

          return;
        }

        // --------------------------------
        // AUTH STATE LISTENER
        // --------------------------------

        const {
          data: authListener,
        } =
          supabase.auth.onAuthStateChange(
            (event, session) => {
              console.log(
                "Auth event:",
                event
              );

              if (
                event ===
                  "PASSWORD_RECOVERY" &&
                session
              ) {
                if (mounted) {
                  setRecoveryReady(true);
                  setCheckingSession(false);
                }
              }
            }
          );

        // Give auth a little time
        // to process the recovery link
        setTimeout(async () => {
          const {
            data: latestSession,
          } =
            await supabase.auth.getSession();

          if (
            mounted &&
            latestSession.session
          ) {
            setRecoveryReady(true);
          }

          if (mounted) {
            setCheckingSession(false);
          }
        }, 1000);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error(
          "Recovery setup error:",
          error
        );

        if (mounted) {
          setCheckingSession(false);

          alert(
            "Password reset session create nahi ho paaya ❌"
          );
        }
      }
    }

    setupRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handlePasswordUpdate() {
    if (password.length < 6) {
      alert(
        "Password कम से कम 6 characters का होना चाहिए"
      );
      return;
    }

    if (!recoveryReady) {
      alert(
        "Password reset session nahi mila ❌\nPlease new reset link se page open karein."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        alert(
          "Auth session missing ❌\nPlease new password reset link se dobara open karein."
        );

        setLoading(false);
        return;
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        console.error(
          "Password update error:",
          error
        );

        alert(
          `Password Set Failed ❌\n${error.message}`
        );

        setLoading(false);
        return;
      }

      alert(
        "Password Set Successfully ✅"
      );

      router.replace(
        "/customer-dashboard"
      );
    } catch (error) {
      console.error(
        "Password update exception:",
        error
      );

      alert(
        "Password set karte waqt error aa gaya ❌"
      );

      setLoading(false);
    }
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
        padding: "20px",
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
        <h1>
          Set Your Password 🔐
        </h1>

        {checkingSession && (
          <p
            style={{
              marginTop: "15px",
              color: "#94a3b8",
            }}
          >
            Password reset session
            checking...
          </p>
        )}

        {!checkingSession &&
          !recoveryReady && (
            <p
              style={{
                marginTop: "15px",
                color: "#f87171",
              }}
            >
              Password reset link
              invalid ya expired hai.
              <br />
              Please new reset email
              request karein.
            </p>
          )}

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          disabled={
            checkingSession ||
            !recoveryReady ||
            loading
          }
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "20px",
            borderRadius: "8px",
            border: "none",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={
            handlePasswordUpdate
          }
          disabled={
            loading ||
            checkingSession ||
            !recoveryReady
          }
          style={{
            width: "100%",
            marginTop: "15px",
            padding: "12px",
            background:
              loading ||
              checkingSession ||
              !recoveryReady
                ? "#475569"
                : "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor:
              loading ||
              checkingSession ||
              !recoveryReady
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? "Saving..."
            : checkingSession
            ? "Checking..."
            : "Set Password"}
        </button>
      </div>
    </main>
  );
}