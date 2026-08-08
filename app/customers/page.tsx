"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string;
  email: string | null;
  created_at: string;
};

export default function CustomersPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      await fetchCustomers();

      if (mounted) {
        setCheckingAuth(false);
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Customers fetch error:", error);
      alert("Customers load failed ❌");
      return;
    }

    setCustomers(data || []);
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim() || !labelName.trim()) {
      alert("Customer Name और Label Name भरना जरूरी है");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("customers").insert([
      {
        customer_name: customerName.trim(),
        label_name: labelName.trim(),
        email: email.trim() || null,
      },
    ]);

    if (error) {
      console.error("Customer add error:", error);
      alert("Customer Add Failed ❌");
      setLoading(false);
      return;
    }

    alert("Customer Added Successfully ✅");

    setCustomerName("");
    setLabelName("");
    setEmail("");

    await fetchCustomers();

    setLoading(false);
  }

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "22px",
        }}
      >
        Checking Login... 🔐
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: "35px",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#22c55e",
              fontSize: "32px",
            }}
          >
            👥 Customers
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "8px",
            }}
          >
            Manage your customers and music labels.
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "#22c55e",
            color: "white",
            border: "none",
            padding: "11px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🏠 Dashboard
        </button>
      </div>

      {/* ADD CUSTOMER */}
      <section
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "14px",
          padding: "25px",
          maxWidth: "700px",
          marginBottom: "35px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>➕ Add New Customer</h2>

        <form
          onSubmit={addCustomer}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          <input
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Label Name"
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            style={inputStyle}
          />

          <input
            type="email"
            placeholder="Customer Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#64748b" : "#22c55e",
              color: "white",
              border: "none",
              padding: "13px",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            {loading ? "Adding..." : "Add Customer"}
          </button>
        </form>
      </section>

      {/* CUSTOMER LIST */}
      <section
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "14px",
          padding: "25px",
          overflowX: "auto",
        }}
      >
        <h2 style={{ marginTop: 0 }}>📋 Customer List</h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "700px",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid #334155",
                color: "#94a3b8",
              }}
            >
              <th align="left" style={{ padding: "12px 8px" }}>
                ID
              </th>

              <th align="left" style={{ padding: "12px 8px" }}>
                Customer
              </th>

              <th align="left" style={{ padding: "12px 8px" }}>
                Label
              </th>

              <th align="left" style={{ padding: "12px 8px" }}>
                Email
              </th>

              <th align="left" style={{ padding: "12px 8px" }}>
                Created
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                style={{
                  borderBottom: "1px solid #273449",
                }}
              >
                <td style={{ padding: "14px 8px" }}>
                  {customer.id}
                </td>

                <td
                  style={{
                    padding: "14px 8px",
                    fontWeight: "bold",
                  }}
                >
                  {customer.customer_name}
                </td>

                <td style={{ padding: "14px 8px" }}>
                  <span
                    style={{
                      background: "#14532d",
                      color: "#86efac",
                      padding: "6px 10px",
                      borderRadius: "20px",
                      fontSize: "13px",
                    }}
                  >
                    🏷️ {customer.label_name}
                  </span>
                </td>

                <td style={{ padding: "14px 8px" }}>
                  {customer.email || "—"}
                </td>

                <td style={{ padding: "14px 8px" }}>
                  {new Date(customer.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}

            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  अभी कोई customer नहीं है।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  padding: "12px",
  borderRadius: "8px",
  outline: "none",
  fontSize: "15px",
};