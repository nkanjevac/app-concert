import Link from "next/link";

export default function Navbar() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "white",
        borderBottom: "1px solid #e5e5e5",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ fontWeight: 700, textDecoration: "none", color: "black" }}>
          🎟️ app-concert
        </Link>

        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            Početna
          </Link>

          <Link href="/manage" style={{ textDecoration: "none" }}>
            Upravljaj kartom
          </Link>

          <Link href="/admin" style={{ textDecoration: "none" }}>
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
