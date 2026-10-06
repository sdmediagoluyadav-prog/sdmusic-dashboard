"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

type CopyrightRequest = {
  videoUrl: string;
  reason: string;
  details: string;
};

type SubmittedCopyrightRequest = {
  id: number;
  video_url: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};

export default function YouTubeCopyrightPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requests, setRequests] = useState<SubmittedCopyrightRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  const [copyrightRequest, setCopyrightRequest] =
    useState<CopyrightRequest>({
      videoUrl: "",
      reason: "",
      details: "",
    });

  useEffect(() => {
    loadCustomer();
  }, []);

  async function loadCustomer() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_name, label_name")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Customer load error:", error);
        alert("Customer account load nahi hua ❌");
        return;
      }

      if (!data) {
        alert("Customer account nahi mila ❌");
        router.replace("/login");
        return;
      }

      setCustomer(data);
      await loadCopyrightRequests(data.id);
    } catch (error) {
      console.error(error);
      alert("Customer account load nahi hua ❌");
    } finally {
      setLoading(false);
    }
  }

  async function loadCopyrightRequests(customerId: number) {
    try {
      setRequestsLoading(true);

      const { data, error } = await supabase
        .from("Copyright Removal Request")
        .select("id, video_url, reason, details, status, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Copyright history error:", error);
        setRequests([]);
        return;
      }

      setRequests((data || []) as SubmittedCopyrightRequest[]);
    } catch (error) {
      console.error(error);
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function submitCopyrightRequest(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!customer) {
      alert("Customer account nahi mila ❌");
      return;
    }

    if (!copyrightRequest.videoUrl.trim()) {
      alert("YouTube Video URL डालें ❌");
      return;
    }

    if (!copyrightRequest.reason.trim()) {
      alert("Copyright issue का reason select करें ❌");
      return;
    }

    if (!copyrightRequest.details.trim()) {
      alert("Copyright details डालें ❌");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        alert("Session expire ho gaya. Dobara login karo ❌");
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("Copyright Removal Request")
        .insert({
          customer_id: customer.id,
          video_url: copyrightRequest.videoUrl.trim(),
          reason: copyrightRequest.reason.trim(),
          details: copyrightRequest.details.trim(),
          status: "Pending",
        });

      if (error) {
        console.error("Copyright request error:", error);

        alert(
          "Copyright request submit nahi hua ❌\n\n" +
            error.message
        );

        return;
      }

      setSubmitted(true);
      await loadCopyrightRequests(customer.id);

      setCopyrightRequest({
        videoUrl: "",
        reason: "",
        details: "",
      });

      alert("Copyright request successfully submit ho gaya ✅");
    } catch (error) {
      console.error(error);

      alert(
        "Copyright request submit karte time error aa gaya ❌"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-box">
          <div className="spinner"></div>
          <h2>Loading YouTube Copyright...</h2>
          <p>Please wait...</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background: #020b18;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial, Helvetica, sans-serif;
          }

          .loading-box {
            text-align: center;
            padding: 40px;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #17355c;
            border-top-color: #2f80ff;
            border-radius: 50%;
            margin: 0 auto 20px;
            animation: spin 0.8s linear infinite;
          }

          h2 {
            margin: 0 0 8px;
          }

          p {
            color: #7893b5;
            margin: 0;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="empty-page">
        <div className="empty-box">
          <h2>Customer account नहीं मिला ❌</h2>
          <button onClick={() => router.replace("/login")}>
            Go To Login
          </button>
        </div>

        <style jsx>{`
          .empty-page {
            min-height: 100vh;
            background: #020b18;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .empty-box {
            background: #071a31;
            border: 1px solid #174a80;
            padding: 40px;
            border-radius: 18px;
            color: white;
            text-align: center;
          }

          button {
            margin-top: 20px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            background: #216ff3;
            color: white;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="brand">
            <img src="/sd-logo.png" alt="SD Media" />

            <div>
              <strong>SD Media</strong>
              <span>Customer Dashboard</span>
            </div>
          </div>

          <div className="welcome-user">
            <div className="big-avatar">
              {customer.customer_name
                ?.charAt(0)
                ?.toUpperCase()}
            </div>

            <div>
              <small>Welcome</small>
              <strong>{customer.customer_name}</strong>
              <span>Customer</span>
            </div>
          </div>

          <div className="menu-label">MAIN MENU</div>

          <nav className="menu">
            <button
              className="menu-item"
              onClick={() =>
                router.push("/customer-dashboard")
              }
            >
              <span>🏠</span>
              Dashboard
            </button>

            <button
              className="menu-item"
              onClick={() => router.push("/upload")}
            >
              <span>⬆️</span>
              Upload Song
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push("/customer-dashboard/my-songs")
              }
            >
              <span>🎵</span>
              My Songs
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push("/customer-dashboard/artists")
              }
            >
              <span>👥</span>
              Artists
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push("/customer-dashboard/royalty")
              }
            >
              <span>₹</span>
              Royalty
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push("/customer-dashboard/sub-labels")
              }
            >
              <span>🏷️</span>
              Sub Labels
            </button>

            <button className="menu-item active">
              <span>©️</span>
              YouTube Copyright
            </button>

            <button
              className="menu-item"
              onClick={() =>
                router.push("/customer-dashboard/profile")
              }
            >
              <span>⚙️</span>
              Profile
            </button>
          </nav>

          <div className="sidebar-bottom">
            <button className="logout-button" onClick={logout}>
              <span>🚪</span>
              Logout
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="header">
            <div>
              <h1>YouTube Copyright</h1>
              <p>
                Submit a legitimate copyright / rights-management
                request for your content
              </p>
            </div>

            <div className="header-user">
              <div className="notification">🔔</div>

              <div className="avatar">
                {customer.customer_name
                  ?.charAt(0)
                  ?.toUpperCase()}
              </div>

              <div>
                <strong>{customer.customer_name}</strong>
                <span>
                  {customer.label_name || "Customer"}
                </span>
              </div>
            </div>
          </header>

          <div className="content">
            <section className="copyright-section">
              <div className="copyright-header">
                <div className="copyright-icon">©️</div>

                <div>
                  <h2>YouTube Copyright</h2>
                  <p>
                    Submit a legitimate copyright / rights-management
                    request for your content.
                  </p>
                </div>

                <span className="copyright-status">
                  Copyright Support
                </span>
              </div>

              <div className="copyright-body">
                <div className="copyright-info">
                  <div className="info-box">
                    <strong>📺 YouTube Video</strong>
                    <span>
                      Submit the URL of the video related to your
                      copyright issue.
                    </span>
                  </div>

                  <div className="info-box">
                    <strong>📋 Issue Details</strong>
                    <span>
                      Explain why you own or control the relevant
                      rights.
                    </span>
                  </div>

                  <div className="info-box">
                    <strong>🔎 Review</strong>
                    <span>
                      Your request can be reviewed before any action
                      is taken.
                    </span>
                  </div>
                </div>
              </div>

              {submitted && (
                <div className="submitted-message success-message">
                  <div className="success-icon">✓</div>

                  <div>
                    <strong>
                      Copyright Request Submitted Successfully
                    </strong>

                    <p>
                      Aapki request successfully submit ho gayi hai.
                      Request abhi <b>Pending</b> status mein hai.
                    </p>

                    <small>
                      Admin Dashboard → Copyright Requests mein
                      request review ki jayegi.
                    </small>
                  </div>
                </div>
              )}

              <form
                className="copyright-form"
                onSubmit={submitCopyrightRequest}
              >
                <div className="form-title">
                  <h3>Submit Copyright Request</h3>
                  <p>
                    Provide accurate information about your rights
                    and the affected content.
                  </p>
                </div>

                <label>
                  YouTube Video URL

                  <input
                    type="url"
                    value={copyrightRequest.videoUrl}
                    onChange={(e) =>
                      setCopyrightRequest((previous) => ({
                        ...previous,
                        videoUrl: e.target.value,
                      }))
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </label>

                <label>
                  Copyright Issue

                  <select
                    value={copyrightRequest.reason}
                    onChange={(e) =>
                      setCopyrightRequest((previous) => ({
                        ...previous,
                        reason: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select issue</option>

                    <option value="My original content was uploaded without permission">
                      My original content was uploaded without
                      permission
                    </option>

                    <option value="Unauthorized use of my music">
                      Unauthorized use of my music
                    </option>

                    <option value="Unauthorized use of my video">
                      Unauthorized use of my video
                    </option>

                    <option value="Other legitimate copyright issue">
                      Other legitimate copyright issue
                    </option>
                  </select>
                </label>

                <label>
                  Details

                  <textarea
                    value={copyrightRequest.details}
                    onChange={(e) =>
                      setCopyrightRequest((previous) => ({
                        ...previous,
                        details: e.target.value,
                      }))
                    }
                    placeholder="Explain the copyright issue and your rights..."
                    rows={7}
                    required
                  />
                </label>

                <div className="copyright-note">
                  ⚠️ Only submit accurate information for content
                  where you have the relevant rights or authorization.
                </div>

                <button
                  type="submit"
                  className="submit-copyright"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Copyright Request"}
                </button>
              </form>
            </section>

            <section className="history-section">
              <div className="history-header">
                <div>
                  <h2>My Copyright Requests</h2>
                  <p>
                    Aapki submitted copyright requests aur unka current status.
                  </p>
                </div>

                <button
                  type="button"
                  className="refresh-button"
                  onClick={() => customer && loadCopyrightRequests(customer.id)}
                  disabled={requestsLoading}
                >
                  {requestsLoading ? "Loading..." : "↻ Refresh"}
                </button>
              </div>

              <div className="history-filters">
                {["All", "Pending", "Approved", "Rejected"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? "filter active" : "filter"}
                  >
                    {status}
                    {status === "All"
                      ? ` (${requests.length})`
                      : ` (${requests.filter((item) => (item.status || "").toLowerCase() === status.toLowerCase()).length})`}
                  </button>
                ))}
              </div>

              {requestsLoading ? (
                <div className="history-empty">
                  <div className="history-spinner"></div>
                  <p>Copyright requests load ho rahi hain...</p>
                </div>
              ) : requests.filter(
                  (item) =>
                    statusFilter === "All" ||
                    (item.status || "").toLowerCase() === statusFilter.toLowerCase()
                ).length === 0 ? (
                <div className="history-empty">
                  <div className="history-empty-icon">©️</div>
                  <h3>No Copyright Requests</h3>
                  <p>
                    {statusFilter === "All"
                      ? "Abhi tak aapne koi copyright request submit nahi ki hai."
                      : `${statusFilter} status ki koi request nahi hai.`}
                  </p>
                </div>
              ) : (
                <div className="history-list">
                  {requests
                    .filter(
                      (item) =>
                        statusFilter === "All" ||
                        (item.status || "").toLowerCase() === statusFilter.toLowerCase()
                    )
                    .map((request) => {
                      const normalizedStatus = (request.status || "Pending").toLowerCase();
                      const statusClass =
                        normalizedStatus === "approved"
                          ? "approved"
                          : normalizedStatus === "rejected"
                          ? "rejected"
                          : "pending";

                      return (
                        <div className="history-card" key={request.id}>
                          <div className="history-card-top">
                            <div>
                              <span className="request-id">Request #{request.id}</span>
                              <h3>{request.reason || "Copyright Request"}</h3>
                            </div>
                            <span className={`status-badge ${statusClass}`}>
                              {request.status || "Pending"}
                            </span>
                          </div>

                          <div className="request-date">
                            Submitted: {new Date(request.created_at).toLocaleString("en-IN")}
                          </div>

                          <div className="request-url">
                            <span>🔗</span>
                            <a href={request.video_url} target="_blank" rel="noreferrer">
                              {request.video_url}
                            </a>
                          </div>

                          <div className="request-details">
                            <strong>Details</strong>
                            <p>{request.details}</p>
                          </div>

                          {normalizedStatus === "rejected" && (
                            <div className="rejected-note">
                              ❌ Admin ne is request ko Reject kiya hai.
                            </div>
                          )}

                          {normalizedStatus === "approved" && (
                            <div className="approved-note">
                              ✅ Admin ne is request ko Approve kiya hai.
                            </div>
                          )}

                          {normalizedStatus === "pending" && (
                            <div className="pending-note">
                              ⏳ Request Admin review ka wait kar rahi hai.
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            <div className="copyright-footer-note">
              <span>ℹ️</span>

              <p>
                Request submit hone ke baad Admin Dashboard ke
                <strong> Copyright Requests </strong>
                section mein request dikhegi. Admin request ko
                review karke <b>Pending</b>, <b>Approved</b> ya{" "}
                <b>Rejected</b> status de sakta hai.
              </p>
            </div>

            <div className="page-footer">
              © {new Date().getFullYear()} SD Media Entertainment
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .dashboard-page {
          min-height: 100vh;
          background: #020b18;
          color: #fff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .dashboard-layout {
          min-height: 100vh;
          display: flex;
        }

        .sidebar {
          width: 235px;
          min-width: 235px;
          background: #061426;
          border-right: 1px solid #123252;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-bottom: 1px solid #123252;
        }

        .brand img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 10px;
        }

        .brand div {
          display: flex;
          flex-direction: column;
        }

        .brand strong {
          font-size: 17px;
        }

        .brand span {
          color: #6883a5;
          font-size: 11px;
          margin-top: 4px;
        }

        .welcome-user {
          margin: 18px 14px;
          padding: 14px;
          background: #0a1d35;
          border: 1px solid #14375d;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .big-avatar,
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #216ff3;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .welcome-user > div:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .welcome-user small {
          color: #5d7b9f;
          font-size: 10px;
        }

        .welcome-user strong {
          font-size: 13px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .welcome-user span {
          color: #6684a8;
          font-size: 10px;
          margin-top: 2px;
        }

        .menu-label {
          padding: 0 18px 8px;
          color: #46627f;
          font-size: 10px;
          font-weight: 700;
        }

        .menu {
          padding: 0 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .menu-item {
          width: 100%;
          border: none;
          background: transparent;
          color: #718ba9;
          text-align: left;
          padding: 12px 12px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 11px;
          transition: 0.2s;
        }

        .menu-item:hover {
          background: #0c2747;
          color: #fff;
        }

        .menu-item.active {
          background: #123c78;
          color: #fff;
          box-shadow: inset 3px 0 0 #2f80ff;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 12px;
          border-top: 1px solid #123252;
        }

        .logout-button {
          width: 100%;
          border: 1px solid #4d2028;
          background: #241016;
          color: #ff6e7c;
          border-radius: 9px;
          padding: 12px;
          cursor: pointer;
        }

        .main {
          margin-left: 235px;
          width: calc(100% - 235px);
          min-width: 0;
        }

        .header {
          min-height: 78px;
          border-bottom: 1px solid #102b48;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 28px;
          background: #03101f;
        }

        .header h1 {
          margin: 0;
          font-size: 22px;
        }

        .header p {
          margin: 6px 0 0;
          color: #6883a5;
          font-size: 12px;
        }

        .header-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .notification {
          width: 38px;
          height: 38px;
          border: 1px solid #17395e;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-user > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .header-user strong {
          font-size: 13px;
        }

        .header-user span {
          color: #6684a8;
          font-size: 10px;
          margin-top: 3px;
        }

        .content {
          padding: 28px;
          max-width: 1300px;
          margin: 0 auto;
        }

        .copyright-section {
          background: linear-gradient(
            135deg,
            rgba(18, 47, 79, 0.92),
            rgba(5, 20, 36, 0.96)
          );
          border: 1px solid #755f13;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }

        .copyright-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 24px;
          border-bottom: 1px solid #1a3a5c;
        }

        .copyright-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #382f0b;
          border: 1px solid #735e11;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
        }

        .copyright-header h2 {
          margin: 0;
          font-size: 19px;
        }

        .copyright-header p {
          margin: 5px 0 0;
          color: #7893b5;
          font-size: 11px;
        }

        .copyright-status {
          margin-left: auto;
          padding: 8px 12px;
          border-radius: 20px;
          color: #f3ca35;
          background: rgba(255, 201, 40, 0.08);
          border: 1px solid rgba(255, 201, 40, 0.2);
          font-size: 11px;
        }

        .copyright-body {
          padding: 18px 24px 0;
        }

        .copyright-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .info-box {
          border: 1px solid #163a5e;
          background: rgba(2, 14, 27, 0.55);
          border-radius: 12px;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .info-box strong {
          font-size: 12px;
        }

        .info-box span {
          color: #6883a5;
          font-size: 10px;
          line-height: 1.5;
        }

        .copyright-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-title h3 {
          margin: 0;
          font-size: 18px;
        }

        .form-title p {
          margin: 5px 0 0;
          color: #6f89a7;
          font-size: 11px;
        }

        .copyright-form label {
          color: #9ab0c9;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .copyright-form input,
        .copyright-form select,
        .copyright-form textarea {
          width: 100%;
          box-sizing: border-box;
          background: #020d1a;
          border: 1px solid #173b60;
          color: #fff;
          border-radius: 10px;
          padding: 13px 14px;
          outline: none;
          font-size: 12px;
        }

        .copyright-form input:focus,
        .copyright-form select:focus,
        .copyright-form textarea:focus {
          border-color: #2f80ff;
        }

        .copyright-form textarea {
          resize: vertical;
          min-height: 130px;
        }

        .copyright-form option {
          background: #071a31;
          color: #fff;
        }

        .copyright-note {
          border: 1px solid #514714;
          background: rgba(255, 201, 40, 0.05);
          color: #b89d37;
          border-radius: 10px;
          padding: 11px 13px;
          font-size: 10px;
          line-height: 1.5;
        }

        .submit-copyright {
          border: none;
          background: #216ff3;
          color: #fff;
          border-radius: 10px;
          padding: 13px 18px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .submit-copyright:hover {
          background: #2f80ff;
        }

        .submit-copyright:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .submitted-message {
          margin: 20px 24px 0;
          border-radius: 12px;
          padding: 15px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .success-message {
          border: 1px solid #12644d;
          background: rgba(18, 214, 160, 0.07);
        }

        .success-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: rgba(18, 214, 160, 0.12);
          color: #12d6a0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .submitted-message strong {
          color: #12d6a0;
          font-size: 12px;
        }

        .submitted-message p {
          color: #9bb09f;
          font-size: 11px;
          margin: 5px 0 3px;
        }

        .submitted-message small {
          color: #62816f;
          font-size: 10px;
        }


        /* =====================================================
           COPYRIGHT HISTORY
        ===================================================== */

        .history-section {
          margin-bottom: 16px;
          padding: 18px;
          border: 1px solid #123252;
          border-radius: 12px;
          background: linear-gradient(135deg, #071b31, #061426);
        }

        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .history-header h2 {
          margin: 0 0 5px;
          color: white;
          font-size: 17px;
        }

        .history-header p {
          margin: 0;
          color: #7893b5;
          font-size: 11px;
        }

        .refresh-button {
          border: 1px solid #174a80;
          background: #0a2340;
          color: #a9c7e8;
          padding: 9px 13px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 11px;
        }

        .refresh-button:hover {
          background: #10345b;
          color: white;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .history-filters {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .filter {
          border: 1px solid #173a60;
          background: #071a31;
          color: #7893b5;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 10px;
        }

        .filter.active {
          background: #1265ed;
          border-color: #1265ed;
          color: white;
        }

        .history-list {
          display: grid;
          gap: 12px;
        }

        .history-card {
          border: 1px solid #173a60;
          background: #061426;
          border-radius: 10px;
          padding: 14px;
        }

        .history-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .request-id {
          color: #63809e;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .history-card h3 {
          color: white;
          font-size: 13px;
          margin: 5px 0 0;
        }

        .status-badge {
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-badge.pending {
          color: #ffc928;
          background: #3a3215;
          border: 1px solid #80671c;
        }

        .status-badge.approved {
          color: #12d6a0;
          background: #092e28;
          border: 1px solid #0b715d;
        }

        .status-badge.rejected {
          color: #ff6b73;
          background: #35171b;
          border: 1px solid #7d2830;
        }

        .request-date {
          color: #63809e;
          font-size: 9px;
          margin-top: 9px;
        }

        .request-url {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 11px;
          padding: 9px;
          border-radius: 7px;
          background: #071a31;
          border: 1px solid #102f50;
        }

        .request-url a {
          color: #4d9aff;
          font-size: 10px;
          word-break: break-all;
          text-decoration: none;
        }

        .request-url a:hover {
          text-decoration: underline;
        }

        .request-details {
          margin-top: 11px;
        }

        .request-details strong {
          color: #a9bfd8;
          font-size: 10px;
        }

        .request-details p {
          margin: 5px 0 0;
          color: #7893b5;
          font-size: 10px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .pending-note,
        .approved-note,
        .rejected-note {
          margin-top: 11px;
          padding: 9px;
          border-radius: 7px;
          font-size: 10px;
        }

        .pending-note {
          color: #d9bd52;
          background: #28230f;
          border: 1px solid #554815;
        }

        .approved-note {
          color: #55d9bd;
          background: #09251f;
          border: 1px solid #0c5e4d;
        }

        .rejected-note {
          color: #ff858b;
          background: #291316;
          border: 1px solid #63232a;
        }

        .history-empty {
          text-align: center;
          padding: 35px 15px;
          border: 1px dashed #173a60;
          border-radius: 10px;
          background: #061426;
        }

        .history-empty-icon {
          font-size: 28px;
          margin-bottom: 10px;
        }

        .history-empty h3 {
          color: white;
          margin: 0 0 5px;
          font-size: 13px;
        }

        .history-empty p {
          color: #63809e;
          margin: 0;
          font-size: 10px;
        }

        .history-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #17355c;
          border-top-color: #2f80ff;
          border-radius: 50%;
          margin: 0 auto 12px;
          animation: spin 0.8s linear infinite;
        }

        @media (max-width: 700px) {
          .history-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .refresh-button {
            width: 100%;
          }

          .history-card-top {
            flex-direction: column;
          }
        }

        .copyright-footer-note {
          margin-top: 18px;
          border: 1px solid #15334f;
          background: #061426;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          gap: 10px;
          color: #718aa7;
          font-size: 10px;
          line-height: 1.6;
        }

        .copyright-footer-note p {
          margin: 0;
        }

        .copyright-footer-note strong {
          color: #b2c2d4;
        }

        .page-footer {
          text-align: center;
          padding: 25px 0 10px;
          color: #405974;
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 70px;
            min-width: 70px;
          }

          .brand {
            justify-content: center;
            padding: 12px 5px;
          }

          .brand img {
            width: 38px;
            height: 38px;
          }

          .brand div,
          .welcome-user > div:not(.big-avatar),
          .menu-label,
          .menu-item span:last-child,
          .logout-button {
            display: none;
          }

          .menu-item {
            justify-content: center;
            padding: 12px 5px;
          }

          .sidebar-bottom {
            display: flex;
            justify-content: center;
          }

          .main {
            margin-left: 70px;
            width: calc(100% - 70px);
          }

          .header {
            padding: 0 15px;
          }

          .content {
            padding: 15px;
          }

          .copyright-info {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .header-user > div:not(.avatar):not(.notification) {
            display: none;
          }

          .header h1 {
            font-size: 18px;
          }

          .copyright-header {
            align-items: flex-start;
          }

          .copyright-status {
            display: none;
          }

          .copyright-header,
          .copyright-body,
          .copyright-form {
            padding-left: 15px;
            padding-right: 15px;
          }

          .submitted-message {
            margin-left: 15px;
            margin-right: 15px;
          }
        }
      `}</style>
    </div>
  );
}
