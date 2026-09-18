"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Customer = {
  id: number;
  customer_name: string | null;
  label_name: string | null;
  email: string | null;
  auth_user_id: string | null;
  is_active: boolean | null;
  songCount: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadCustomers() {
    try {
      setLoading(true);

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id, customer_name, label_name, email, auth_user_id, is_active"
        )
        .order("id", { ascending: false });

      if (customerError) {
        console.error(customerError);
        alert("Customers load nahi ho paaye ❌");
        return;
      }

      if (!customerData) {
        setCustomers([]);
        return;
      }

      const customerIds = customerData.map(
        (customer) => customer.id
      );

      let songCounts: Record<number, number> = {};

      if (customerIds.length > 0) {
        const {
          data: customerSongs,
          error: songsError,
        } = await supabase
          .from("customer_songs")
          .select("customer_id")
          .in("customer_id", customerIds);

        if (!songsError && customerSongs) {
          songCounts = customerSongs.reduce(
            (
              acc: Record<number, number>,
              row: { customer_id: number }
            ) => {
              acc[row.customer_id] =
                (acc[row.customer_id] || 0) + 1;

              return acc;
            },
            {}
          );
        }
      }

      const finalCustomers: Customer[] =
        customerData.map((customer) => ({
          ...customer,
          is_active:
            customer.is_active === null
              ? true
              : customer.is_active,
          songCount:
            songCounts[customer.id] || 0,
        }));

      setCustomers(finalCustomers);
    } catch (error) {
      console.error(error);
      alert("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // =========================
  // ACTIVE / INACTIVE
  // =========================

  async function toggleCustomer(
    customer: Customer
  ) {
    const nextStatus = !customer.is_active;

    const confirmMessage = nextStatus
      ? `${
          customer.customer_name || "Customer"
        } ko Active karna hai?`
      : `${
          customer.customer_name || "Customer"
        } ko Inactive karna hai?`;

    const confirmed =
      window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(customer.id);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert(
          "Session expire ho gaya. Please login again."
        );
        return;
      }

      const response = await fetch(
        "/api/customers/toggle-active",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            customer_id: customer.id,
            is_active: nextStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            "Customer status update nahi hua ❌"
        );
        return;
      }

      alert(
        nextStatus
          ? "Customer Active ho gaya ✅"
          : "Customer Inactive ho gaya 🔴"
      );

      await loadCustomers();
    } catch (error) {
      console.error(error);
      alert("Something went wrong ❌");
    } finally {
      setUpdatingId(null);
    }
  }

  // =========================
  // DELETE CUSTOMER
  // =========================

  async function deleteCustomer(
    customer: Customer
  ) {
    const firstConfirm = window.confirm(
      `⚠️ WARNING\n\n` +
        `Customer: ${
          customer.customer_name || "-"
        }\n` +
        `Email: ${customer.email || "-"}\n\n` +
        `Kya aap is customer ko permanently delete karna chahte hain?\n\n` +
        `Customer account aur login permanently delete ho jayega.`
    );

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.confirm(
      "⚠️ FINAL CONFIRMATION\n\n" +
        "Ye action undo nahi kiya ja sakta.\n\n" +
        "Kya aap DELETE karna chahte hain?"
    );

    if (!secondConfirm) {
      return;
    }

    try {
      setUpdatingId(customer.id);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert(
          "Session expire ho gaya. Please login again."
        );
        return;
      }

      const response = await fetch(
        "/api/customers/delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            customer_id: customer.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            "Customer delete nahi hua ❌"
        );
        return;
      }

      alert(
        "Customer successfully delete ho gaya ✅"
      );

      await loadCustomers();
    } catch (error) {
      console.error(error);

      alert(
        "Customer delete karte time error aa gaya ❌"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // =========================
  // SEARCH
  // =========================

  const filteredCustomers =
    customers.filter((customer) => {
      const searchText =
        search.toLowerCase();

      return (
        customer.customer_name
          ?.toLowerCase()
          .includes(searchText) ||
        customer.label_name
          ?.toLowerCase()
          .includes(searchText) ||
        customer.email
          ?.toLowerCase()
          .includes(searchText)
      );
    });

  // =========================
  // STATS
  // =========================

  const totalCustomers =
    customers.length;

  const activeCustomers =
    customers.filter(
      (customer) => customer.is_active
    ).length;

  const inactiveCustomers =
    customers.filter(
      (customer) => !customer.is_active
    ).length;

  const totalSongs =
    customers.reduce(
      (total, customer) =>
        total + customer.songCount,
      0
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      {/* =========================
          SIDEBAR
      ========================= */}

      <aside
        style={{
          width: "240px",
          background: "#111827",
          padding: "25px 15px",
          borderRight:
            "1px solid #1f2937",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <img
            src="/sd-logo.png"
            alt="SD Media Entertainment"
            style={{
              width: "110px",
              height: "110px",
              objectFit: "contain",
            }}
          />

          <p
            style={{
              color: "#9ca3af",
              fontSize: "12px",
              marginTop: "8px",
            }}
          >
            Music Content Management
          </p>
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <Link
            href="/dashboard"
            style={navStyle}
          >
            🏠 Dashboard
          </Link>

          <Link
            href="/songs"
            style={navStyle}
          >
            🎵 All Songs
          </Link>

          <Link
            href="/upload"
            style={navStyle}
          >
            ⬆️ Upload Song
          </Link>

          <Link
            href="/customers"
            style={{
              ...navStyle,
              background: "#2563eb",
            }}
          >
            👥 Customers
          </Link>

          <Link
            href="/customer-dashboard"
            style={navStyle}
          >
            👤 Customer Dashboard
          </Link>

          <button
            onClick={loadCustomers}
            style={{
              ...navStyle,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            🔄 Refresh
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href =
                "/login";
            }}
            style={{
              ...navStyle,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "#fca5a5",
            }}
          >
            🚪 Logout
          </button>
        </nav>
      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <main
        style={{
          flex: 1,
          padding: "30px",
          overflowX: "auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "30px",
                margin: 0,
              }}
            >
              Customers
            </h1>

            <p
              style={{
                color: "#9ca3af",
                marginTop: "8px",
              }}
            >
              Manage your music
              distribution customers
            </p>
          </div>
        </div>

        {/* =========================
            STATS
        ========================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <StatCard
            title="Total Customers"
            value={totalCustomers}
            icon="👥"
          />

          <StatCard
            title="Active Customers"
            value={activeCustomers}
            icon="🟢"
          />

          <StatCard
            title="Inactive Customers"
            value={inactiveCustomers}
            icon="🔴"
          />

          <StatCard
            title="Total Songs"
            value={totalSongs}
            icon="🎵"
          />
        </div>

        {/* =========================
            SEARCH
        ========================= */}

        <div
          style={{
            background: "#111827",
            padding: "18px",
            borderRadius: "12px",
            marginBottom: "20px",
            border:
              "1px solid #1f2937",
          }}
        >
          <input
            type="text"
            placeholder="Search customer, label or email..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              width: "100%",
              padding: "13px",
              background: "#0f172a",
              border:
                "1px solid #374151",
              borderRadius: "8px",
              color: "white",
              outline: "none",
              boxSizing:
                "border-box",
            }}
          />
        </div>

        {/* =========================
            TABLE
        ========================= */}

        <div
          style={{
            background: "#111827",
            borderRadius: "12px",
            border:
              "1px solid #1f2937",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth: "1000px",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#1f2937",
                }}
              >
                <th style={thStyle}>
                  Customer
                </th>

                <th style={thStyle}>
                  Label
                </th>

                <th style={thStyle}>
                  Email
                </th>

                <th style={thStyle}>
                  Songs
                </th>

                <th style={thStyle}>
                  Status
                </th>

                <th style={thStyle}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding:
                        "40px",
                      textAlign:
                        "center",
                      color:
                        "#9ca3af",
                    }}
                  >
                    Loading
                    customers...
                  </td>
                </tr>
              ) : filteredCustomers.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding:
                        "40px",
                      textAlign:
                        "center",
                      color:
                        "#9ca3af",
                    }}
                  >
                    No customers
                    found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(
                  (customer) => (
                    <tr
                      key={
                        customer.id
                      }
                      style={{
                        borderTop:
                          "1px solid #1f2937",
                      }}
                    >
                      {/* CUSTOMER */}

                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight:
                              "bold",
                          }}
                        >
                          {customer.customer_name ||
                            "-"}
                        </div>

                        <div
                          style={{
                            color:
                              "#6b7280",
                            fontSize:
                              "12px",
                            marginTop:
                              "4px",
                          }}
                        >
                          ID:{" "}
                          {
                            customer.id
                          }
                        </div>
                      </td>

                      {/* LABEL */}

                      <td style={tdStyle}>
                        {customer.label_name ||
                          "-"}
                      </td>

                      {/* EMAIL */}

                      <td style={tdStyle}>
                        {customer.email ||
                          "-"}
                      </td>

                      {/* SONGS */}

                      <td style={tdStyle}>
                        🎵{" "}
                        {
                          customer.songCount
                        }
                      </td>

                      {/* STATUS */}

                      <td style={tdStyle}>
                        {customer.is_active ? (
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "6px 10px",
                              borderRadius:
                                "20px",
                              background:
                                "rgba(34,197,94,0.15)",
                              color:
                                "#4ade80",
                              fontSize:
                                "12px",
                              fontWeight:
                                "bold",
                            }}
                          >
                            🟢 Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "6px 10px",
                              borderRadius:
                                "20px",
                              background:
                                "rgba(239,68,68,0.15)",
                              color:
                                "#f87171",
                              fontSize:
                                "12px",
                              fontWeight:
                                "bold",
                            }}
                          >
                            🔴 Inactive
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}

                      <td style={tdStyle}>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: "8px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          {/* VIEW */}

                          <Link
                            href={`/customers/${customer.id}`}
                            style={{
                              background:
                                "#374151",
                              color:
                                "white",
                              textDecoration:
                                "none",
                              padding:
                                "8px 12px",
                              borderRadius:
                                "7px",
                              fontSize:
                                "13px",
                            }}
                          >
                            👁️ View
                          </Link>

                          {/* ACTIVE / INACTIVE */}

                          <button
                            onClick={() =>
                              toggleCustomer(
                                customer
                              )
                            }
                            disabled={
                              updatingId ===
                              customer.id
                            }
                            style={{
                              background:
                                customer.is_active
                                  ? "#7f1d1d"
                                  : "#166534",
                              color:
                                "white",
                              border:
                                "none",
                              padding:
                                "8px 12px",
                              borderRadius:
                                "7px",
                              cursor:
                                updatingId ===
                                customer.id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                updatingId ===
                                customer.id
                                  ? 0.6
                                  : 1,
                              fontSize:
                                "13px",
                            }}
                          >
                            {updatingId ===
                            customer.id
                              ? "Updating..."
                              : customer.is_active
                              ? "🔴 Deactivate"
                              : "🟢 Activate"}
                          </button>

                          {/* DELETE */}

                          <button
                            onClick={() =>
                              deleteCustomer(
                                customer
                              )
                            }
                            disabled={
                              updatingId ===
                              customer.id
                            }
                            style={{
                              background:
                                "#991b1b",
                              color:
                                "white",
                              border:
                                "none",
                              padding:
                                "8px 12px",
                              borderRadius:
                                "7px",
                              cursor:
                                updatingId ===
                                customer.id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                updatingId ===
                                customer.id
                                  ? 0.6
                                  : 1,
                              fontSize:
                                "13px",
                            }}
                          >
                            {updatingId ===
                            customer.id
                              ? "Deleting..."
                              : "🗑️ Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

// =========================
// STAT CARD
// =========================

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border:
          "1px solid #1f2937",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          marginBottom: "8px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#9ca3af",
          fontSize: "13px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          marginTop: "5px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// =========================
// STYLES
// =========================

const navStyle: React.CSSProperties =
  {
    display: "block",
    padding: "11px 13px",
    borderRadius: "8px",
    color: "#d1d5db",
    textDecoration: "none",
    background: "transparent",
    fontSize: "14px",
  };

const thStyle: React.CSSProperties =
  {
    textAlign: "left",
    padding: "14px",
    color: "#9ca3af",
    fontSize: "13px",
    fontWeight: "600",
  };

const tdStyle: React.CSSProperties =
  {
    padding: "15px 14px",
    color: "#e5e7eb",
    fontSize: "14px",
    verticalAlign: "middle",
  };