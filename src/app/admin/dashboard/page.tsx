export default function AdminDashboardPage() {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Admin</h1>
      <ul style={{ lineHeight: 2 }}>
        <li><a href="/admin/venues">Lokacije + regioni + kapaciteti</a></li>
        <li><a href="/admin/categories">Kategorije</a></li>
        <li><a href="/admin/shows">Zakazivanje + cene po regionu</a></li>
        <li><a href="/admin/currencies">Valute (enable/disable)</a></li>
        <li><a href="/admin/settings">Popust 10% (discountUntil)</a></li>
      </ul>
    </div>
  );
}
