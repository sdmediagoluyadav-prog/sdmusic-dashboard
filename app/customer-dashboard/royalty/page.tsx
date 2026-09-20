"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

export default function RoyaltyPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, []);

  async function loadCustomer() {
    setLoading(true);

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
      .single();

    if (!error && data) {
      setCustomer(data);
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f8fc",
          fontFamily: "Arial, sans-serif",
          color: "#334155",
          fontSize: 18,
        }}
      >
        Loading Royalty...
      </div>
    );
  }

  return (
    <>
      <div className="page">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logoBox">
            <img src="/sd-logo.png" alt="SD Media" className="logo" />
          </div>

          <div className="menuTitle">Music Content Management</div>

          <nav className="menu">
            <button
              className="menuItem"
              onClick={() => router.push("/customer-dashboard")}
            >
              <span className="icon">⌂</span>
              <span>Dashboard</span>
            </button>

            <button
              className="menuItem"
              onClick={() => router.push("/upload")}
            >
              <span className="icon">＋</span>
              <span>Upload Song</span>
            </button>

            <button
              className="menuItem"
              onClick={() =>
                router.push("/customer-dashboard/my-songs")
              }
            >
              <span className="icon">♫</span>
              <span>My Songs</span>
            </button>

            <button
              className="menuItem"
              onClick={() =>
                router.push("/customer-dashboard/artists")
              }
            >
              <span className="icon">♟</span>
              <span>Artists</span>
            </button>

            <button className="menuItem active">
              <span className="icon">₹</span>
              <span>Royalty</span>
            </button>

            <button
              className="menuItem"
              onClick={() =>
                router.push("/customer-dashboard/sub-labels")
              }
            >
              <span className="icon">♧</span>
              <span>Sub Labels</span>
            </button>

            <button
              className="menuItem"
              onClick={() =>
                router.push("/customer-dashboard/profile")
              }
            >
              <span className="icon">♙</span>
              <span>Profile</span>
            </button>
          </nav>

          <button className="logoutButton" onClick={logout}>
            <span>↪</span>
            <span>Logout</span>
          </button>
        </aside>

        {/* MAIN */}
        <main className="main">
          <header className="topbar">
            <div>
              <h1>Royalty</h1>
              <p>View your music royalty earnings</p>
            </div>

            <div className="userBox">
              <div className="userAvatar">
                {(customer?.customer_name || "C")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="userInfo">
                <strong>
                  {customer?.customer_name || "Customer"}
                </strong>
                <span>{customer?.label_name || "Label"}</span>
              </div>
            </div>
          </header>

          <section className="content">
            {/* ROYALTY CARD */}
            <div className="royaltyCard">
              <div className="royaltyIcon">₹</div>

              <div className="royaltyText">
                <span>Total Royalty</span>
                <h2>₹0</h2>
                <p>Your current royalty amount</p>
              </div>
            </div>

            {/* SUMMARY */}
            <div className="sectionTitle">
              <h2>Royalty Summary</h2>
              <p>Your royalty details will appear here.</p>
            </div>

            <div className="summaryGrid">
              <div className="summaryCard">
                <span className="summaryLabel">Total Royalty</span>
                <strong>₹0</strong>
              </div>

              <div className="summaryCard">
                <span className="summaryLabel">Pending Royalty</span>
                <strong>₹0</strong>
              </div>

              <div className="summaryCard">
                <span className="summaryLabel">Paid Royalty</span>
                <strong>₹0</strong>
              </div>
            </div>

            {/* INFORMATION */}
            <div className="infoCard">
              <div className="infoIcon">ℹ</div>

              <div>
                <h3>Royalty Information</h3>
                <p>
                  Your royalty earnings are currently <strong>₹0</strong>.
                  Royalty details will be updated here when earnings are
                  available.
                </p>
              </div>
            </div>
          </section>

          <footer className="footer">
            © 2026 SD Media Entertainment. All rights reserved.
          </footer>
        </main>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5f8fc;
          font-family: Arial, Helvetica, sans-serif;
          color: #172033;
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 250px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .logoBox {
          height: 95px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid #eef1f5;
          padding: 15px;
        }

        .logo {
          max-width: 165px;
          max-height: 65px;
          object-fit: contain;
        }

        .menuTitle {
          padding: 24px 20px 12px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .menu {
          padding: 0 12px;
        }

        .menuItem {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px 15px;
          margin-bottom: 5px;
          border-radius: 9px;
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
        }

        .menuItem:hover {
          background: #f1f5f9;
          color: #2563eb;
        }

        .menuItem.active {
          background: #2563eb;
          color: white;
        }

        .icon {
          width: 20px;
          text-align: center;
          font-size: 18px;
        }

        .logoutButton {
          margin: auto 12px 18px;
          border: none;
          background: #fff1f2;
          color: #e11d48;
          border-radius: 9px;
          padding: 13px 15px;
          display: flex;
          align-items: center;
          gap: 13px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .main {
          margin-left: 250px;
          min-height: 100vh;
        }

        .topbar {
          height: 82px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
        }

        .topbar h1 {
          margin: 0 0 5px;
          font-size: 24px;
          font-weight: 700;
        }

        .topbar p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .userBox {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .userAvatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .userInfo {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .userInfo strong {
          font-size: 13px;
        }

        .userInfo span {
          font-size: 11px;
          color: #64748b;
        }

        .content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 32px;
        }

        .royaltyCard {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-radius: 16px;
          padding: 32px;
          color: white;
          display: flex;
          align-items: center;
          gap: 24px;
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.18);
        }

        .royaltyIcon {
          width: 76px;
          height: 76px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          font-weight: 700;
        }

        .royaltyText span {
          font-size: 14px;
          opacity: 0.9;
        }

        .royaltyText h2 {
          margin: 6px 0;
          font-size: 38px;
        }

        .royaltyText p {
          margin: 0;
          font-size: 13px;
          opacity: 0.85;
        }

        .sectionTitle {
          margin-top: 32px;
          margin-bottom: 18px;
        }

        .sectionTitle h2 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .sectionTitle p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .summaryCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .summaryLabel {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .summaryCard strong {
          font-size: 27px;
          color: #172033;
        }

        .infoCard {
          margin-top: 22px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 22px;
          display: flex;
          gap: 15px;
          align-items: flex-start;
        }

        .infoIcon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .infoCard h3 {
          margin: 2px 0 7px;
          font-size: 15px;
        }

        .infoCard p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .footer {
          padding: 25px 32px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 220px;
          }

          .main {
            margin-left: 220px;
          }

          .summaryGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .sidebar {
            position: relative;
            width: 100%;
            height: auto;
          }

          .logoutButton {
            margin: 15px 12px;
          }

          .main {
            margin-left: 0;
          }

          .topbar {
            height: auto;
            padding: 18px;
            gap: 15px;
          }

          .userInfo {
            display: none;
          }

          .content {
            padding: 18px;
          }

          .royaltyCard {
            padding: 24px;
          }

          .royaltyIcon {
            width: 60px;
            height: 60px;
          }

          .royaltyText h2 {
            font-size: 30px;
          }
        }
      `}</style>
    </>
  );
}