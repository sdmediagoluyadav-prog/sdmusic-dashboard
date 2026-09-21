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

export default function YouTubeCopyrightPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        console.error("Customer error:", error);
        alert("Customer account load nahi hua ❌");
        return;
      }

      setCustomer(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function submitCopyrightRequest(
    event: React.FormEvent
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
      alert("Copyright issue का reason डालें ❌");
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
        .from("youtube_copyright_requests")
        .insert({
          customer_id: customer.id,
          video_url: copyrightRequest.videoUrl.trim(),
          reason: copyrightRequest.reason.trim(),
          details: copyrightRequest.details.trim(),
          status: "Pending",
        });

      if (error) {
        console.error(
          "Copyright request error:",
          error
        );

        alert(
          "Copyright request submit nahi hua ❌\n\n" +
            error.message
        );

        return;
      }

      setSubmitted(true);

      setCopyrightRequest({
        videoUrl: "",
        reason: "",
        details: "",
      });

      alert(
        "Copyright request successfully submit ho gaya ✅"
      );
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
          Loading YouTube Copyright...
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background: #07152f;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: Arial, sans-serif;
          }

          .loading-box {
            background: #0d2145;
            border: 1px solid #173968;
            padding: 25px 35px;
            border-radius: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-box">SD</div>

          <div>
            <div className="logo-title">
              SD Media
            </div>

            <div className="logo-subtitle">
              Customer Dashboard
            </div>
          </div>
        </div>

        <nav className="menu">
          <button
            onClick={() =>
              router.push("/customer-dashboard")
            }
          >
            <span>🏠</span>
            Dashboard
          </button>

          <button
            onClick={() => router.push("/upload")}
          >
            <span>⬆️</span>
            Upload Song
          </button>

          <button
            onClick={() =>
              router.push(
                "/customer-dashboard/my-songs"
              )
            }
          >
            <span>🎵</span>
            My Songs
          </button>

          <button
            onClick={() =>
              router.push(
                "/customer-dashboard/artists"
              )
            }
          >
            <span>🎤</span>
            Artists
          </button>

          <button
            onClick={() =>
              router.push(
                "/customer-dashboard/royalty"
              )
            }
          >
            <span>💰</span>
            Royalty
          </button>

          <button
            onClick={() =>
              router.push(
                "/customer-dashboard/sub-labels"
              )
            }
          >
            <span>🏷️</span>
            Sub Labels
          </button>

          <button className="active">
            <span>©️</span>
            YouTube Copyright
          </button>

          <button
            onClick={() =>
              router.push(
                "/customer-dashboard/profile"
              )
            }
          >
            <span>👤</span>
            Profile
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className="logout"
            onClick={logout}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="header">
          <div>
            <h1>YouTube Copyright</h1>

            <p>
              Submit your YouTube copyright issue
              for review
            </p>
          </div>

          <button
            className="back-button"
            onClick={() =>
              router.push("/customer-dashboard")
            }
          >
            ← Dashboard
          </button>
        </header>

        {/* CUSTOMER INFO */}
        {customer && (
          <div className="customer-bar">
            <div>
              <span>Customer</span>
              <strong>
                {customer.customer_name}
              </strong>
            </div>

            {customer.label_name && (
              <div>
                <span>Label</span>
                <strong>
                  {customer.label_name}
                </strong>
              </div>
            )}

            <div>
              <span>Status</span>
              <strong className="status">
                Active
              </strong>
            </div>
          </div>
        )}

        {/* COPYRIGHT HERO */}
        <section className="hero-card">
          <div className="hero-icon">©️</div>

          <div className="hero-content">
            <h2>
              YouTube Copyright Protection
            </h2>

            <p>
              Agar kisi YouTube video par aapke
              song/content ka unauthorized use hua
              hai, to yahan se copyright request
              submit kar sakte hain.
            </p>

            <button
              className="start-button"
              onClick={() =>
                setShowForm(!showForm)
              }
            >
              {showForm
                ? "Close Request Form"
                : "Submit Copyright Request"}
            </button>
          </div>
        </section>

        {/* INFO CARDS */}
        <section className="info-grid">
          <div className="info-card">
            <div className="info-icon">🔗</div>

            <h3>YouTube Video URL</h3>

            <p>
              Jis YouTube video par copyright issue
              hai uska exact URL submit karein.
            </p>
          </div>

          <div className="info-card">
            <div className="info-icon">📝</div>

            <h3>Issue Details</h3>

            <p>
              Copyright issue ka reason aur
              complete details provide karein.
            </p>
          </div>

          <div className="info-card">
            <div className="info-icon">⏳</div>

            <h3>Review Process</h3>

            <p>
              Submit hone ke baad request review
              ke liye Pending status me rahegi.
            </p>
          </div>
        </section>

        {/* SUCCESS MESSAGE */}
        {submitted && (
          <div className="submitted-message">
            <div className="success-icon">
              ✓
            </div>

            <div>
              <strong>
                Copyright request successfully
                submitted.
              </strong>

              <p>
                Your request has been saved and is
                now <b>Pending</b> review.
              </p>
            </div>
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <section className="form-card">
            <div className="form-header">
              <div>
                <h2>
                  Submit Copyright Request
                </h2>

                <p>
                  Neeche complete information
                  carefully fill karein.
                </p>
              </div>

              <span className="pending-badge">
                Pending Review
              </span>
            </div>

            <form
              onSubmit={submitCopyrightRequest}
            >
              <div className="form-group">
                <label>
                  YouTube Video URL
                  <span>*</span>
                </label>

                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={
                    copyrightRequest.videoUrl
                  }
                  onChange={(e) =>
                    setCopyrightRequest({
                      ...copyrightRequest,
                      videoUrl:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Copyright Issue
                  <span>*</span>
                </label>

                <select
                  value={
                    copyrightRequest.reason
                  }
                  onChange={(e) =>
                    setCopyrightRequest({
                      ...copyrightRequest,
                      reason:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    Select copyright issue
                  </option>

                  <option value="Unauthorized use of song">
                    Unauthorized use of song
                  </option>

                  <option value="Unauthorized upload">
                    Unauthorized upload
                  </option>

                  <option value="Music copyright infringement">
                    Music copyright infringement
                  </option>

                  <option value="Audio used without permission">
                    Audio used without permission
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Copyright Details
                  <span>*</span>
                </label>

                <textarea
                  placeholder="Copyright issue ke baare me complete details likhein..."
                  value={
                    copyrightRequest.details
                  }
                  onChange={(e) =>
                    setCopyrightRequest({
                      ...copyrightRequest,
                      details:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div className="warning-box">
                <div>⚠️</div>

                <div>
                  <strong>
                    Important
                  </strong>

                  <p>
                    Sirf genuine copyright issues
                    ke liye request submit karein.
                    Request submit hone ke baad
                    review ki jayegi.
                  </p>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Copyright Request"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* FOOTER */}
        <footer>
          <div>
            © {new Date().getFullYear()} SD Media
            Entertainment
          </div>

          <div>
            YouTube Copyright Request System
          </div>
        </footer>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .dashboard {
          min-height: 100vh;
          background: #07152f;
          color: #ffffff;
          font-family: Arial, Helvetica,
            sans-serif;
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 214px;
          background: #091a38;
          border-right: 1px solid #173968;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px 24px;
          border-bottom: 1px solid #173968;
        }

        .logo-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #1473ff,
            #0646aa
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 17px;
        }

        .logo-title {
          font-size: 15px;
          font-weight: 800;
        }

        .logo-subtitle {
          color: #7e96bd;
          font-size: 10px;
          margin-top: 3px;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 20px;
        }

        .menu button,
        .logout {
          width: 100%;
          border: 0;
          background: transparent;
          color: #9db2d3;
          padding: 11px 12px;
          border-radius: 9px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 11px;
          font-size: 13px;
        }

        .menu button:hover,
        .menu button.active {
          background: #102c58;
          color: #ffffff;
        }

        .menu button.active {
          border: 1px solid #1d5ba9;
        }

        .menu button span,
        .logout span {
          width: 20px;
          text-align: center;
        }

        .sidebar-bottom {
          margin-top: auto;
        }

        .logout {
          border-top: 1px solid #173968;
          border-radius: 0;
          padding-top: 16px;
          color: #ff8f8f;
        }

        .main {
          margin-left: 214px;
          min-height: 100vh;
          padding: 30px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .header h1 {
          margin: 0;
          font-size: 28px;
        }

        .header p {
          margin: 7px 0 0;
          color: #8198bb;
          font-size: 13px;
        }

        .back-button {
          border: 1px solid #24518d;
          background: #0d2145;
          color: #dceaff;
          border-radius: 9px;
          padding: 11px 17px;
          cursor: pointer;
        }

        .back-button:hover {
          background: #14345f;
        }

        .customer-bar {
          display: flex;
          gap: 45px;
          flex-wrap: wrap;
          background: #0b1d3c;
          border: 1px solid #183d6d;
          border-radius: 14px;
          padding: 17px 20px;
          margin-bottom: 22px;
        }

        .customer-bar span {
          display: block;
          color: #7089ae;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .customer-bar strong {
          font-size: 14px;
        }

        .customer-bar .status {
          color: #48d69a;
        }

        .hero-card {
          background: linear-gradient(
            135deg,
            #0d2852,
            #0b1d3c
          );
          border: 1px solid #235a9e;
          border-radius: 18px;
          padding: 30px;
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .hero-icon {
          min-width: 76px;
          height: 76px;
          border-radius: 18px;
          background: #173d72;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 35px;
        }

        .hero-content h2 {
          margin: 0 0 9px;
          font-size: 22px;
        }

        .hero-content p {
          color: #9bb0d0;
          line-height: 1.7;
          margin: 0 0 18px;
          max-width: 750px;
          font-size: 13px;
        }

        .start-button,
        .submit-button {
          background: #1473ff;
          color: white;
          border: 0;
          border-radius: 9px;
          padding: 12px 18px;
          font-weight: 700;
          cursor: pointer;
        }

        .start-button:hover,
        .submit-button:hover {
          background: #0d62df;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 16px;
          margin-top: 20px;
        }

        .info-card {
          background: #0b1d3c;
          border: 1px solid #173968;
          border-radius: 14px;
          padding: 21px;
        }

        .info-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #122d55;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          margin-bottom: 14px;
        }

        .info-card h3 {
          margin: 0 0 7px;
          font-size: 15px;
        }

        .info-card p {
          margin: 0;
          color: #7f96b8;
          line-height: 1.6;
          font-size: 12px;
        }

        .submitted-message {
          margin-top: 20px;
          background: #092f29;
          border: 1px solid #176d5b;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          color: #b8ffe9;
        }

        .submitted-message p {
          margin: 5px 0 0;
          color: #83c9b8;
          font-size: 12px;
        }

        .success-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #15956f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .form-card {
          margin-top: 20px;
          background: #0b1d3c;
          border: 1px solid #24518d;
          border-radius: 16px;
          padding: 25px;
        }

        .form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 22px;
        }

        .form-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .form-header p {
          margin: 6px 0 0;
          color: #7f96b8;
          font-size: 12px;
        }

        .pending-badge {
          background: #3a2c09;
          color: #ffc94d;
          border: 1px solid #74570b;
          padding: 7px 11px;
          border-radius: 20px;
          font-size: 11px;
          white-space: nowrap;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          color: #dce8fa;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .form-group label span {
          color: #ff7070;
          margin-left: 4px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          background: #07152f;
          color: white;
          border: 1px solid #1b477d;
          border-radius: 9px;
          padding: 12px 13px;
          outline: none;
          font-size: 13px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #2681ff;
        }

        .form-group textarea {
          min-height: 135px;
          resize: vertical;
        }

        .form-group select option {
          background: #0b1d3c;
          color: white;
        }

        .warning-box {
          display: flex;
          gap: 12px;
          background: #2b230d;
          border: 1px solid #68520c;
          border-radius: 10px;
          padding: 14px;
          margin-top: 5px;
        }

        .warning-box strong {
          color: #ffd45b;
          font-size: 12px;
        }

        .warning-box p {
          margin: 5px 0 0;
          color: #bcae7b;
          font-size: 11px;
          line-height: 1.6;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .cancel-button {
          background: #152b4e;
          border: 1px solid #284b78;
          color: #a9bfdf;
          padding: 11px 18px;
          border-radius: 9px;
          cursor: pointer;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        footer {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          color: #526b91;
          font-size: 11px;
          border-top: 1px solid #142f54;
          margin-top: 35px;
          padding: 20px 0 5px;
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 190px;
          }

          .main {
            margin-left: 190px;
            padding: 20px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .sidebar {
            position: relative;
            width: 100%;
            height: auto;
          }

          .menu {
            display: grid;
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .sidebar-bottom {
            margin-top: 10px;
          }

          .main {
            margin-left: 0;
          }

          .header,
          .hero-card,
          .form-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .hero-icon {
            min-width: 60px;
            height: 60px;
          }

          .customer-bar {
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
}