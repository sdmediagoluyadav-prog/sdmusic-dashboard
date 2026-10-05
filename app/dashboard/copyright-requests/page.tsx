"use client";
// Copyright Requests admin page

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name?: string | null;
  name?: string | null;
  label_name: string | null;
};

type CopyrightRequest = {
  id: number;
  customer_id: number;
  video_url: string;
  reason: string;
  details: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  customer?: Customer | null;
};

export default function CopyrightRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<CopyrightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("Copyright Admin Session:", session);
      console.log("Copyright Session Error:", sessionError);

      if (sessionError) {
        console.error("Session error:", sessionError);
        router.push("/login");
        return;
      }

      if (!session) {
        console.error("No active Supabase session.");
        router.push("/login");
        return;
      }

      if (!session.access_token) {
        console.error("Access token missing.");
        router.push("/login");
        return;
      }

      console.log("Calling role API...");

      const response = await fetch("/api/auth/role", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const roleData = await response.json();

      console.log("Role API Status:", response.status);
      console.log("Role API Response:", roleData);

      if (!response.ok) {
        console.error("Role API failed:", roleData);

        // Token expired/invalid
        if (response.status === 401) {
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        setLoading(false);
        return;
      }

      if (roleData?.role !== "admin") {
        console.error("User is not admin:", roleData);
        router.push("/customer-dashboard");
        return;
      }

      console.log("Admin verified successfully.");

      await loadRequests(session.access_token);
    } catch (error) {
      console.error("Admin check error:", error);
      setLoading(false);
    }
  }

  async function loadRequests(accessToken?: string) {
    setLoading(true);

    try {
      let token = accessToken;

      // Agar token nahi mila to current session se le lo
      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          alert("Session expired. Please login again.");
          router.push("/login");
          return;
        }

        token = session.access_token;
      }

      const response = await fetch("/api/copyright-requests", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      console.log("Copyright API Status:", response.status);
      console.log("Copyright API Response:", result);

      if (!response.ok) {
        if (response.status === 401) {
          alert("Session expired. Please login again.");
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        alert(result?.error || "Copyright requests load nahi ho payi.");
        return;
      }

      setRequests(result?.requests || []);
    } catch (error) {
      console.error("Load requests error:", error);
      alert("Copyright requests load karte waqt error aaya.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    requestId: number,
    status: "Approved" | "Rejected"
  ) {
    if (updatingId !== null) return;

    let rejectionReason: string | null = null;

    if (status === "Rejected") {
      const reason = window.prompt(
        "Reject karne ka reason enter karein:"
      );

      if (reason === null) {
        return;
      }

      rejectionReason = reason.trim();

      if (!rejectionReason) {
        alert("Please rejection reason enter karein.");
        return;
      }
    }

    const confirmMessage =
      status === "Approved"
        ? "Kya aap is Copyright Request ko Approve karna chahte hain?"
        : "Kya aap is Copyright Request ko Reject karna chahte hain?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdatingId(requestId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Session expired. Please login again.");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/copyright-requests", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: requestId,
          status,
          rejection_reason: rejectionReason,
        }),
      });

      const result = await response.json();

      console.log("Update API Status:", response.status);
      console.log("Update API Response:", result);

      if (!response.ok) {
        if (response.status === 401) {
          alert("Session expired. Please login again.");
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        alert(result?.error || "Status update nahi ho paya.");
        return;
      }

      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status,
                rejection_reason: rejectionReason,
              }
            : request
        )
      );

      alert(
        status === "Approved"
          ? "Copyright Request Approved successfully."
          : "Copyright Request Rejected successfully."
      );
    } catch (error) {
      console.error("Status update error:", error);
      alert("Something went wrong.");
    } finally {
      setUpdatingId(null);
    }
  }

  function getStatusClass(status: string) {
    if (status === "Approved") {
      return "bg-green-500/15 text-green-400 border-green-500/20";
    }

    if (status === "Rejected") {
      return "bg-red-500/15 text-red-400 border-red-500/20";
    }

    return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
  }

  function formatDate(date: string) {
    try {
      return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  }

  function getCustomerName(customer?: Customer | null) {
    if (!customer) {
      return null;
    }

    return customer.customer_name || customer.name || null;
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[250px] bg-[#0a1627] border-r border-white/10 flex flex-col">
          <div className="p-5 border-b border-white/10">
            <img
              src="/sd-logo.png"
              alt="SD Media"
              className="h-12 w-auto object-contain"
            />

            <p className="text-white/40 text-xs mt-2">
              Music Content Management
            </p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>📊</span>
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => router.push("/songs")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>🎵</span>
              All Songs
            </button>

            <button
              type="button"
              onClick={() => router.push("/upload")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>⬆️</span>
              Upload Song
            </button>

            <button
              type="button"
              onClick={() => router.push("/customers")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>👥</span>
              Customers
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/copyright-requests")
              }
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/15 text-blue-400 transition text-sm"
            >
              <span>📄</span>
              Copyright Requests
            </button>

            <button
              type="button"
              onClick={() => router.push("/customer-dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition text-sm"
            >
              <span>🏠</span>
              Customer Dashboard
            </button>
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition text-sm"
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">
                  Copyright Requests
                </h1>

                <p className="text-white/50 mt-2">
                  Customer ki copyright removal requests manage karein.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadRequests()}
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-50"
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-[#0a1627] p-10 text-center text-white/50">
                Loading copyright requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0a1627] p-10 text-center">
                <div className="text-4xl mb-3">📄</div>

                <h2 className="text-xl font-semibold">
                  No Copyright Requests
                </h2>

                <p className="text-white/40 mt-2">
                  Abhi tak koi copyright request submit nahi hui hai.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {requests.map((request) => {
                  const customer = request.customer;

                  return (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-white/10 bg-[#0a1627] p-6"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="text-xs text-white/40">
                              Request #{request.id}
                            </span>

                            <span
                              className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusClass(
                                request.status
                              )}`}
                            >
                              {request.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <p className="text-xs text-white/40 mb-1">
                                Customer
                              </p>

                              <p className="font-medium">
                                {getCustomerName(customer) ||
                                  `Customer #${request.customer_id}`}
                              </p>

                              {customer?.label_name && (
                                <p className="text-sm text-white/40 mt-1">
                                  {customer.label_name}
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="text-xs text-white/40 mb-1">
                                Submitted
                              </p>

                              <p className="text-sm text-white/70">
                                {formatDate(request.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5">
                            <p className="text-xs text-white/40 mb-1">
                              YouTube Video
                            </p>

                            <a
                              href={request.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 break-all text-sm"
                            >
                              {request.video_url}
                            </a>
                          </div>

                          <div className="mt-5">
                            <p className="text-xs text-white/40 mb-1">
                              Copyright Issue
                            </p>

                            <p className="text-white/80">
                              {request.reason}
                            </p>
                          </div>

                          <div className="mt-5">
                            <p className="text-xs text-white/40 mb-1">
                              Details
                            </p>

                            <div className="rounded-xl bg-black/20 border border-white/5 p-4 text-sm text-white/70 whitespace-pre-wrap">
                              {request.details}
                            </div>
                          </div>

                          {request.status === "Rejected" &&
                            request.rejection_reason && (
                              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                                <p className="text-xs text-red-400 mb-1">
                                  Rejection Reason
                                </p>

                                <p className="text-sm text-red-300 whitespace-pre-wrap">
                                  {request.rejection_reason}
                                </p>
                              </div>
                            )}

                          {request.status === "Approved" && (
                            <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                              <p className="text-sm text-green-400 font-medium">
                                ✅ Copyright Request Approved
                              </p>

                              <p className="text-xs text-green-300/70 mt-1">
                                Customer ko request approval ka status
                                dikhaya jayega.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row lg:flex-col gap-3 lg:w-32">
                          {request.status === "Pending" && (
                            <>
                              <button
                                type="button"
                                disabled={updatingId === request.id}
                                onClick={() =>
                                  updateStatus(
                                    request.id,
                                    "Approved"
                                  )
                                }
                                className="flex-1 lg:w-full px-4 py-3 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 hover:bg-green-500/25 transition text-sm font-medium disabled:opacity-50"
                              >
                                {updatingId === request.id
                                  ? "..."
                                  : "✓ Approve"}
                              </button>

                              <button
                                type="button"
                                disabled={updatingId === request.id}
                                onClick={() =>
                                  updateStatus(
                                    request.id,
                                    "Rejected"
                                  )
                                }
                                className="flex-1 lg:w-full px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition text-sm font-medium disabled:opacity-50"
                              >
                                {updatingId === request.id
                                  ? "..."
                                  : "✕ Reject"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}