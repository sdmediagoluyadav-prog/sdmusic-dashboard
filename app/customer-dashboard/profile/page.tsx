"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    setEmail(session.user.email || "");

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
      <div className="loadingPage">
        Loading Profile...

        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f8fc;
            color: #334155;
            font-family: Arial, sans-serif;
            font-size: 18px;
          }
        `}</style>
      </div>
    );
  }

  const customerName = customer?.customer_name || "Customer";
  const labelName = customer?.label_name || "Label";

  return (
    <>
      <div className="page">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logoBox">
            <img
              src="/sd-logo.png"
              alt="SD Media"
              className="logo"
            />
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

            <button
              className="menuItem"
              onClick={() =>
                router.push("/customer-dashboard/royalty")
              }
            >
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

            <button className="menuItem active">
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
              <h1>Profile</h1>
              <p>View your account information</p>
            </div>

            <div className="userBox">
              <div className="userAvatar">
                {customerName.charAt(0).toUpperCase()}
              </div>

              <div className="userInfo">
                <strong>{customerName}</strong>
                <span>{labelName}</span>
              </div>
            </div>
          </header>

          <section className="content">
            {/* PROFILE HEADER */}
            <div className="profileHeader">
              <div className="bigAvatar">
                {customerName.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2>{customerName}</h2>
                <p>{labelName}</p>
                <span className="activeBadge">
                  ● Active Account
                </span>
              </div>
            </div>

            {/* ACCOUNT INFORMATION */}
            <div className="sectionCard">
              <div className="sectionHeader">
                <h2>Account Information</h2>
                <p>Your account details</p>
              </div>

              <div className="infoGrid">
                <div className="infoItem">
                  <span className="label">Customer Name</span>
                  <strong>{customerName}</strong>
                </div>

                <div className="infoItem">
                  <span className="label">Label Name</span>
                  <strong>{labelName}</strong>
                </div>

                <div className="infoItem">
                  <span className="label">Email Address</span>
                  <strong>{email || "Not available"}</strong>
                </div>

                <div className="infoItem">
                  <span className="label">Customer ID</span>
                  <strong>
                    {customer?.id ?? "Not available"}
                  </strong>
                </div>
              </div>
            </div>

            {/* ACCOUNT STATUS */}
            <div className="statusCard">
              <div className="statusIcon">✓</div>

              <div>
                <h3>Account Status</h3>
                <p>
                  Your customer account is currently active and
                  ready to use.
                </p>
              </div>

              <span className="statusBadge">Active</span>
            </div>

            {/* SECURITY */}
            <div className="sectionCard">
              <div className="sectionHeader">
                <h2>Account Security</h2>
                <p>Your login account information</p>
              </div>

              <div className="securityRow">
                <div>
                  <strong>Login Email</strong>
                  <span>
                    {email || "Not available"}
                  </span>
                </div>

                <span className="verifiedBadge">
                  ✓ Verified
                </span>
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

        .profileHeader {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 30px;
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .bigAvatar {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          font-weight: 700;
        }

        .profileHeader h2 {
          margin: 0 0 6px;
          font-size: 24px;
        }

        .profileHeader p {
          margin: 0 0 10px;
          color: #64748b;
          font-size: 14px;
        }

        .activeBadge {
          display: inline-block;
          padding: 6px 10px;
          background: #ecfdf5;
          color: #059669;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .sectionCard {
          margin-top: 22px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          overflow: hidden;
        }

        .sectionHeader {
          padding: 22px 24px;
          border-bottom: 1px solid #eef1f5;
        }

        .sectionHeader h2 {
          margin: 0 0 5px;
          font-size: 18px;
        }

        .sectionHeader p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .infoItem {
          padding: 22px 24px;
          border-bottom: 1px solid #eef1f5;
        }

        .infoItem:nth-child(odd) {
          border-right: 1px solid #eef1f5;
        }

        .infoItem .label {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .infoItem strong {
          display: block;
          font-size: 14px;
          word-break: break-word;
        }

        .statusCard {
          margin-top: 22px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          padding: 22px 24px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .statusIcon {
          width: 45px;
          height: 45px;
          border-radius: 12px;
          background: #ecfdf5;
          color: #059669;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .statusCard h3 {
          margin: 0 0 5px;
          font-size: 15px;
        }

        .statusCard p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .statusBadge {
          margin-left: auto;
          padding: 7px 12px;
          border-radius: 20px;
          background: #ecfdf5;
          color: #059669;
          font-size: 11px;
          font-weight: 700;
        }

        .securityRow {
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .securityRow strong {
          display: block;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .securityRow span {
          color: #64748b;
          font-size: 12px;
          word-break: break-word;
        }

        .securityRow .verifiedBadge {
          color: #059669;
          background: #ecfdf5;
          border-radius: 20px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 700;
        }

        .footer {
          padding: 25px 32px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        @media (max-width: 800px) {
          .sidebar {
            width: 220px;
          }

          .main {
            margin-left: 220px;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }

          .infoItem:nth-child(odd) {
            border-right: none;
          }
        }

        @media (max-width: 650px) {
          .sidebar {
            position: relative;
            width: 100%;
            height: auto;
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

          .profileHeader {
            padding: 22px;
          }

          .bigAvatar {
            width: 65px;
            height: 65px;
            font-size: 27px;
          }

          .profileHeader h2 {
            font-size: 20px;
          }

          .statusCard {
            align-items: flex-start;
          }

          .statusBadge {
            margin-left: auto;
          }
        }
      `}</style>
    </>
  );
}