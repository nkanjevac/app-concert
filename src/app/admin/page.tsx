"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    formData.append("code", code);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      body: formData,
      credentials: "include", 
    });

    if (!res.ok) {
      setError("Pogrešan kod.");
      return;
    }

    window.location.href = "/admin/dashboard";
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Admin pristup</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Unesite admin kod"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit">Prijavi se</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
