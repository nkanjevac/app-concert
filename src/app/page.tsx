import { headers } from "next/headers";

type Category = {
  id: string;
  name: string;
  events: Event[];
};

type Event = {
  id: string;
  title: string;
  artist: string;
  shows: Show[];
};

type Show = {
  id: string;
  startsAt: string;
  venue: {
    name: string;
    city: string;
  };
};

async function getHomeData() {
  const h = await headers();

  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/home`, { cache: "no-store" });

    if (!res.ok) throw new Error("Neuspešno učitavanje početne.");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Greška pri učitavanju.");
    return data.categories as Category[];
  }

  const baseUrl = `${proto}://${host}`;

  const res = await fetch(`${baseUrl}/api/home`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Neuspešno učitavanje početne.");
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Greška pri učitavanju.");
  }

  return data.categories as Category[];
}

export default async function HomePage() {
  let categories: Category[] = [];

  try {
    categories = await getHomeData();
  } catch (e) {
    console.error("HOME LOAD ERROR:", e);
    return <div>Greška pri učitavanju koncerata.</div>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>🎟️ Koncerti</h1>
      <p>Izaberite koncert i termin za rezervaciju karata.</p>

      {categories.length === 0 && <p>Nema dostupnih koncerata.</p>}

      {categories.map((category) => (
        <section key={category.id} style={{ marginTop: 32 }}>
          <h2>{category.name}</h2>

          {category.events.map((event) => (
            <div
              key={event.id}
              style={{
                marginTop: 16,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <h3>
                {event.artist} – {event.title}
              </h3>

              {event.shows.length === 0 ? (
                <p>Nema dostupnih termina.</p>
              ) : (
                <ul>
                  {event.shows.map((show) => (
                    <li key={show.id}>
                      <a
                        href={`/reserve/${show.id}`}
                        style={{ textDecoration: "underline" }}
                      >
                        {new Date(show.startsAt).toLocaleDateString("sr-RS")} –{" "}
                        {show.venue.name}, {show.venue.city}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
