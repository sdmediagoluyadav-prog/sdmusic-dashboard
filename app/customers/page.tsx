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

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Customers fetch error:", error);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
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

          <p style={{ color: "#94a3b8" }}>
            Manage Customers and Labels
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

      <section
        style={{
          background: "#1e293b",
          padding: "25px",
          borderRadius: "14px",
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
            placeholder="Customer Email"
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
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {loading ? "Adding..." : "Add Customer"}
          </button>
        </form>
      </section>

      <section
        style={{
          background: "#1e293b",
          padding: "25px",
          borderRadius: "14px",
          overflowX: "auto",
        }}
      >
        <h2 style={{ marginTop: 0 }}>📋 Customer List</h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "700px",
          }}
        >
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Customer</th>
              <th align="left">Label</th>
              <th align="left">Email</th>
              <th align="left">Created</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td style={{ padding: "12px 5px" }}>
                  {customer.id}
                </td>

                <td style={{ padding: "12px 5px" }}>
                  {customer.customer_name}
                </td>

                <td style={{ padding: "12px 5px" }}>
                  🏷️ {customer.label_name}
                </td>

                <td style={{ padding: "12px 5px" }}>
                  {customer.email || "—"}
                </td>

                <td style={{ padding: "12px 5px" }}>
                  {customer.created_at
                    ? new Date(
                        customer.created_at
                      ).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}

            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "35px",
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