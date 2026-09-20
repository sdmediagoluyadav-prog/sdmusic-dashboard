"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

type SubLabel = {
  id: number;
  customer_id: number;
  sub_label_name: string;
  email: string;
  auth_user_id: string | null;
  is_active: boolean;
  created_at?: string;
};

export default function SubLabelsPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subLabels, setSubLabels] = useState<SubLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [subLabelName, setSubLabelName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("id, customer_name, label_name")
      .eq("auth_user_id", session.user.id)
      .single();

    if (customerError || !customerData) {
      setLoading(false);
      return;
    }

    setCustomer(customerData);

    const { data: subLabelData } = await supabase
      .from("sub_labels")
      .select(
        "id, customer_id, sub_label_name, email, auth_user_id, is_active, created_at"
      )
      .eq("customer_id", customerData.id)
      .order("id", { ascending: false });

    setSubLabels(subLabelData || []);
    setLoading(false);
  }

  async function addSubLabel() {
    if (!subLabelName.trim() || !email.trim()) {
      alert("Sub Label Name aur Email dono bhariye.");
      return;
    }

    try {
      setAdding(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Session expire ho gaya. Dobara login karein.");
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/sub-labels/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subLabelName: subLabelName.trim(),
          email: email.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.error || "Sub Label create nahi hua.");
        return;
      }

      alert("Sub Label successfully add ho gaya.");

      setSubLabelName("");
      setEmail("");
      setShowAdd(false);

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Sub Label add karte waqt error aaya.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteSubLabel(id: number) {
    const confirmDelete = window.confirm(
      "Kya aap is Sub Label ko delete karna chahte hain?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("sub_labels")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Delete nahi hua.");
      console.error(error);
      return;
    }

    setSubLabels((prev) => prev.filter((item) => item.id !== id));
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="loadingPage">
        <div>Loading Sub Labels...</div>

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

            <button className="menuItem active">
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
              <h1>Sub Labels</h1>
              <p>Manage your Sub Labels</p>
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

                <span>
                  {customer?.label_name || "Label"}
                </span>
              </div>
            </div>
          </header>

          <section className="content">
            {/* TOP CARD */}
            <div className="topCard">
              <div>
                <h2>Sub Labels</h2>
                <p>
                  Create and manage your Sub Labels from here.
                </p>
              </div>

              <button
                className="addButton"
                onClick={() => setShowAdd(!showAdd)}
              >
                {showAdd ? "✕ Close" : "＋ Add Sub Label"}
              </button>
            </div>

            {/* ADD FORM */}
            {showAdd && (
              <div className="addCard">
                <h3>Add New Sub Label</h3>

                <div className="formGrid">
                  <div className="field">
                    <label>Sub Label Name</label>

                    <input
                      type="text"
                      placeholder="Enter Sub Label Name"
                      value={subLabelName}
                      onChange={(e) =>
                        setSubLabelName(e.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Email</label>

                    <input
                      type="email"
                      placeholder="Enter Email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                    />
                  </div>
                </div>

                <button
                  className="createButton"
                  onClick={addSubLabel}
                  disabled={adding}
                >
                  {adding ? "Creating..." : "Create Sub Label"}
                </button>
              </div>
            )}

            {/* STATS */}
            <div className="statsGrid">
              <div className="statCard">
                <div className="statIcon blue">♧</div>

                <div>
                  <span>Total Sub Labels</span>
                  <strong>{subLabels.length}</strong>
                </div>
              </div>

              <div className="statCard">
                <div className="statIcon green">✓</div>

                <div>
                  <span>Active</span>
                  <strong>
                    {
                      subLabels.filter(
                        (item) => item.is_active
                      ).length
                    }
                  </strong>
                </div>
              </div>

              <div className="statCard">
                <div className="statIcon red">×</div>

                <div>
                  <span>Inactive</span>
                  <strong>
                    {
                      subLabels.filter(
                        (item) => !item.is_active
                      ).length
                    }
                  </strong>
                </div>
              </div>
            </div>

            {/* LIST */}
            <div className="listCard">
              <div className="listHeader">
                <div>
                  <h2>Your Sub Labels</h2>
                  <p>
                    {subLabels.length === 0
                      ? "No Sub Labels added yet."
                      : `${subLabels.length} Sub Label${
                          subLabels.length > 1 ? "s" : ""
                        }`}
                  </p>
                </div>
              </div>

              {subLabels.length === 0 ? (
                <div className="empty">
                  <div className="emptyIcon">♧</div>

                  <h3>No Sub Labels Yet</h3>

                  <p>
                    Add your first Sub Label using the button
                    above.
                  </p>

                  <button
                    className="emptyButton"
                    onClick={() => setShowAdd(true)}
                  >
                    ＋ Add Sub Label
                  </button>
                </div>
              ) : (
                <div className="tableWrap">
                  <div className="tableHead">
                    <div>Sub Label</div>
                    <div>Email</div>
                    <div>Status</div>
                    <div>Action</div>
                  </div>

                  {subLabels.map((item) => (
                    <div
                      className="tableRow"
                      key={item.id}
                    >
                      <div className="labelCell">
                        <div className="labelAvatar">
                          {item.sub_label_name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {item.sub_label_name}
                          </strong>

                          <span>
                            Sub Label
                          </span>
                        </div>
                      </div>

                      <div className="emailCell">
                        {item.email}
                      </div>

                      <div>
                        <span
                          className={
                            item.is_active
                              ? "status active"
                              : "status inactive"
                          }
                        >
                          {item.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <div>
                        <button
                          className="deleteButton"
                          onClick={() =>
                            deleteSubLabel(item.id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        .topCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .topCard h2 {
          margin: 0 0 6px;
          font-size: 21px;
        }

        .topCard p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .addButton,
        .createButton,
        .emptyButton {
          border: none;
          background: #2563eb;
          color: white;
          border-radius: 9px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .addButton:hover,
        .createButton:hover,
        .emptyButton:hover {
          background: #1d4ed8;
        }

        .addCard {
          margin-top: 18px;
          background: white;
          border: 1px solid #dbeafe;
          border-radius: 15px;
          padding: 24px;
        }

        .addCard h3 {
          margin: 0 0 20px;
          font-size: 17px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .field input {
          width: 100%;
          border: 1px solid #dbe2ea;
          border-radius: 8px;
          padding: 12px 13px;
          outline: none;
          font-size: 13px;
        }

        .field input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px #dbeafe;
        }

        .createButton {
          margin-top: 20px;
        }

        .createButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .statsGrid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .statCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .statIcon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          font-weight: 700;
        }

        .statIcon.blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .statIcon.green {
          background: #ecfdf5;
          color: #059669;
        }

        .statIcon.red {
          background: #fff1f2;
          color: #e11d48;
        }

        .statCard span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .statCard strong {
          font-size: 24px;
        }

        .listCard {
          margin-top: 22px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          overflow: hidden;
        }

        .listHeader {
          padding: 22px 24px;
          border-bottom: 1px solid #eef1f5;
        }

        .listHeader h2 {
          margin: 0 0 5px;
          font-size: 18px;
        }

        .listHeader p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .tableWrap {
          width: 100%;
        }

        .tableHead,
        .tableRow {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 0.8fr;
          align-items: center;
          gap: 18px;
          padding: 17px 24px;
        }

        .tableHead {
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .tableRow {
          border-top: 1px solid #eef1f5;
          font-size: 13px;
        }

        .labelCell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .labelAvatar {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
        }

        .labelCell strong {
          display: block;
          margin-bottom: 4px;
        }

        .labelCell span {
          color: #94a3b8;
          font-size: 11px;
        }

        .emailCell {
          color: #475569;
          word-break: break-word;
        }

        .status {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .status.active {
          background: #ecfdf5;
          color: #059669;
        }

        .status.inactive {
          background: #fff1f2;
          color: #e11d48;
        }

        .deleteButton {
          border: none;
          background: #fff1f2;
          color: #e11d48;
          border-radius: 7px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .deleteButton:hover {
          background: #ffe4e6;
        }

        .empty {
          text-align: center;
          padding: 55px 20px;
        }

        .emptyIcon {
          width: 60px;
          height: 60px;
          margin: 0 auto 15px;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        }

        .empty h3 {
          margin: 0 0 7px;
          font-size: 17px;
        }

        .empty p {
          margin: 0 0 18px;
          color: #64748b;
          font-size: 13px;
        }

        .footer {
          padding: 25px 32px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        @media (max-width: 1000px) {
          .sidebar {
            width: 220px;
          }

          .main {
            margin-left: 220px;
          }

          .tableHead,
          .tableRow {
            grid-template-columns: 1.5fr 1.5fr 1fr 0.7fr;
          }
        }

        @media (max-width: 800px) {
          .formGrid,
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .topCard {
            align-items: flex-start;
            flex-direction: column;
          }

          .tableWrap {
            overflow-x: auto;
          }

          .tableHead,
          .tableRow {
            min-width: 750px;
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
        }
      `}</style>
    </>
  );
}