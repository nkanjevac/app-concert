import { prisma } from "../src/lib/prisma";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      baseCurrencyCode: "RSD",
      discountUntil: daysFromNow(7), 
    },
    create: {
      id: "singleton",
      baseCurrencyCode: "RSD",
      discountUntil: daysFromNow(7),
    },
  });

  await prisma.currency.upsert({
    where: { code: "RSD" },
    update: { isEnabled: true, name: "Dinar (RSD)" },
    create: { code: "RSD", name: "Dinar (RSD)", isEnabled: true },
  });

  await prisma.currency.upsert({
    where: { code: "EUR" },
    update: { isEnabled: true, name: "Euro (EUR)" },
    create: { code: "EUR", name: "Euro (EUR)", isEnabled: true },
  });

  const pop = await prisma.category.upsert({
    where: { name: "Pop" },
    update: {},
    create: { name: "Pop" },
  });

  const arena = await prisma.venue.upsert({
    where: { id: "arena-bg" },
    update: {},
    create: {
      id: "arena-bg",
      name: "Štark Arena",
      address: "Bulevar Arsenija Čarnojevića 58",
      city: "Beograd",
      country: "Serbia",
    },
  });

  const parter = await prisma.seatingRegion.upsert({
    where: { venueId_name: { venueId: arena.id, name: "Parter" } },
    update: { capacity: 2000 },
    create: { venueId: arena.id, name: "Parter", capacity: 2000 },
  });

  const tribine = await prisma.seatingRegion.upsert({
    where: { venueId_name: { venueId: arena.id, name: "Tribine" } },
    update: { capacity: 6000 },
    create: { venueId: arena.id, name: "Tribine", capacity: 6000 },
  });

  const vip = await prisma.seatingRegion.upsert({
    where: { venueId_name: { venueId: arena.id, name: "VIP" } },
    update: { capacity: 300 },
    create: { venueId: arena.id, name: "VIP", capacity: 300 },
  });

  async function createPrices(showId: string) {
    const prices = [
      { regionId: parter.id, priceRsd: 5500 },
      { regionId: tribine.id, priceRsd: 3800 },
      { regionId: vip.id, priceRsd: 12000 },
    ];

    for (const p of prices) {
      await prisma.showPrice.upsert({
        where: {
          showId_regionId: {
            showId,
            regionId: p.regionId,
          },
        },
        update: { priceRsd: p.priceRsd },
        create: {
          showId,
          regionId: p.regionId,
          priceRsd: p.priceRsd,
        },
      });
    }
  }

  const events = [
    {
      id: "billie-eilish",
      title: "Happier Than Ever Tour",
      artist: "Billie Eilish",
      description: "Svetska turneja Billie Eilish.",
      showDays: [10, 11],
    },
    {
      id: "taylor-swift",
      title: "The Eras Tour",
      artist: "Taylor Swift",
      description: "Najveća turneja decenije.",
      showDays: [20, 21, 22],
    },
    {
      id: "sabrina-carpenter",
      title: "Emails I Can’t Send Tour",
      artist: "Sabrina Carpenter",
      description: "Pop koncert sa najvećim hitovima.",
      showDays: [30],
    },
    {
      id: "gracie-abrams",
      title: "Good Riddance Tour",
      artist: "Gracie Abrams",
      description: "Intimni pop koncert.",
      showDays: [40, 41],
    },
  ];

  for (const e of events) {
    const event = await prisma.event.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        title: e.title,
        artist: e.artist,
        description: e.description,
        categoryId: pop.id,
      },
    });

    for (const d of e.showDays) {
      const show = await prisma.show.create({
        data: {
          eventId: event.id,
          venueId: arena.id,
          startsAt: daysFromNow(d),
        },
      });

      await createPrices(show.id);
    }
  }

  console.log("🎶 Seed uspešno završen (poznati koncerti ubačeni)");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
