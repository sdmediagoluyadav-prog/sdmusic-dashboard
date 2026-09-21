"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

export default function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    checkCustomer();
  }, []);

  async function checkCustomer() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: customerData, error } = await supabase
        .from("customers")
        .select("id, customer_name, label_name")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      if (!customerData) {
        setCustomer(null);
        setLoading(false);
        return;
      }

      setCustomer(customerData);
      setLoading(false);
    } catch (error) {
      console.error(error);
      router.replace("/login");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function isActive(path: string) {
    if (path === "/customer-dashboard") {
      return pathname === "/customer-dashboard";
    }

    return pathname.startsWith(path);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="loading-spinner"></div>
          <h2>Loading Customer Dashboard...</h2>
          <p>Please wait...</p>
        </div>

        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f7fb;
            font-family: Arial, sans-serif;
          }

          .loading-box {
            background: white;
            padding: 40px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          }

          .loading-spinner {
            width: 42px;
            height: 42px;
            border: 4px solid #e5e7eb;
            border-top-color: #2563eb;
            border-radius: 50%;
            margin: 0 auto 20px;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .loading-box h2 {
            margin: 0 0 8px;
            color: #111827;
          }

          .loading-box p {
            margin: 0;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="error-screen">
        <div className="error-box">
          <div className="error-icon">❌</div>

          <h2>Customer account नहीं मिला</h2>

          <p>
            आपके login account से कोई customer account linked नहीं है।
          </p>

          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>

        <style jsx>{`
          .error-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f7fb;
            font-family: Arial, sans-serif;
          }

          .error-box {
            width: 90%;
            max-width: 450px;
            background: white;
            padding: 40px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          }

          .error-icon {
            font-size: 50px;
            margin-bottom: 15px;
          }

          .error-box h2 {
            color: #111827;
            margin-bottom: 10px;
          }

          .error-box p {
            color: #6b7280;
            line-height: 1.6;
          }

          .error-box button {
            margin-top: 20px;
            padding: 11px 25px;
            border: none;
            border-radius: 9px;
            background: #ef4444;
            color: white;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="customer-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-area">
          <img
            src="/sd-logo.png"
            alt="SD Media"
            className="logo"
          />
        </div>

        <div className="menu-title">MAIN MENU</div>

        <nav className="sidebar-menu">
          {/* DASHBOARD */}
          <button
            type="button"
            className={`menu-item ${
              isActive("/customer-dashboard") ? "active" : ""
            }`}
            onClick={() => {
              window.location.href = "/customer-dashboard";
            }}
          >
            <span className="menu-icon">🏠</span>
            <span>Dashboard</span>
          </button>

          {/* UPLOAD SONG */}
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              window.location.href = "/upload";
            }}
          >
            <span className="menu-icon">⬆️</span>
            <span>Upload Song</span>
          </button>

          {/* MY SONGS */}
          <button
            type="button"
            className={`menu-item ${
              isActive("/customer-dashboard/my-songs") ? "active" : ""
            }`}
            onClick={() => {
              alert("MY SONGS CLICK HO RAHA HAI");
            }}
          >
            <span className="menu-icon">🎵</span>
            <span>MY SONGS TEST</span>
          </button>

          {/* ARTISTS */}
          <button
            type="button"
            className={`menu-item ${
              isActive("/customer-dashboard/artists") ? "active" : ""
            }`}
            onClick={() => {
              window.location.href = "/customer-dashboard/artists";
            }}
          >
            <span className="menu-icon">👥</span>
            <span>Artists</span>
          </button>

          {/* ROYALTY */}
          <button
            type="button"
            className={`menu-item ${
              isActive("/customer-dashboard/royalty") ? "active" : ""
            }`}
            onClick={() => {
              window.location.href = "/customer-dashboard/royalty";
            }}
          >
            <span className="menu-icon">₹</span>
            <span>Royalty</span>
          </button>

          {/* SUB LABELS */}
          <button
            type="button"
            className={`menu-item ${
              isActive("/customer-dashboard/sub-labels") ? "active" : ""
            }`}
            onClick={() => {
              window.location.href = "/customer-dashboard/sub-labels";
            }}
          >
            <span className="menu-icon">🏷️</span>
            <span>Sub Labels</span>
          </button>

          {/* PROFILE */}
          <button
            type="button"
            className={`menu-item ${
              isActive("/customer-dashboard/profile") ? "active" : ""
            }`}
            onClick={() => {
              window.location.href = "/customer-dashboard/profile";
            }}
          >
            <span className="menu-icon">👤</span>
            <span>Profile</span>
          </button>
        </nav>

        {/* LOGOUT */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">
        <header className="top-header">
          <div>
            <h3>{customer.customer_name || "Customer"}</h3>

            {customer.label_name && (
              <span>{customer.label_name}</span>
            )}
          </div>

          <div className="user-area">
            <div className="user-avatar">
              {(customer.customer_name || "C")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="user-text">
              <strong>{customer.customer_name}</strong>
              <small>Customer</small>
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .customer-layout {
          min-height: 100vh;
          background: #f5f7fb;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 250px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .logo-area {
          height: 85px;
          display: flex;
          align-items: center;
          padding: 18px 25px;
          border-bottom: 1px solid #f0f0f0;
        }

        .logo {
          max-width: 150px;
          max-height: 52px;
          object-fit: contain;
        }

        .menu-title {
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          padding: 25px 25px 12px;
          letter-spacing: 1px;
        }

        .sidebar-menu {
          padding: 0 12px;
        }

        .menu-item {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px 14px;
          margin-bottom: 5px;
          border-radius: 10px;
          color: #4b5563;
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
        }

        .menu-item:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .menu-item.active {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 600;
        }

        .menu-icon {
          width: 25px;
          text-align: center;
          font-size: 17px;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 15px 12px 20px;
          border-top: 1px solid #f0f0f0;
        }

        .logout-button {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px 14px;
          border-radius: 10px;
          color: #ef4444;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
        }

        .logout-button:hover {
          background: #fef2f2;
        }

        .main-area {
          margin-left: 250px;
          min-height: 100vh;
        }

        .top-header {
          height: 75px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .top-header h3 {
          margin: 0 0 3px;
          font-size: 17px;
          color: #111827;
        }

        .top-header span {
          font-size: 12px;
          color: #6b7280;
        }

        .user-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar {
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

        .user-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .user-text strong {
          font-size: 13px;
        }

        .user-text small {
          color: #9ca3af;
          font-size: 11px;
        }

        .page-content {
          padding: 30px;
        }

        @media (max-width: 900px) {
          .sidebar {
            position: relative;
            width: 100%;
            height: auto;
          }

          .main-area {
            margin-left: 0;
          }

          .sidebar-menu {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }

          .sidebar-bottom {
            margin-top: 0;
          }

          .top-header {
            position: relative;
          }
        }

        @media (max-width: 600px) {
          .page-content {
            padding: 15px;
          }

          .top-header {
            padding: 0 15px;
          }

          .user-text {
            display: none;
          }

          .sidebar-menu {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}