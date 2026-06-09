import { PrismaClient } from "@prisma/client";
import { suppliers, officeItems } from "../src/lib/mock-price-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding suppliers...");
  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        location: s.location,
        contact: s.contact,
        rating: s.rating,
      },
      create: {
        id: s.id,
        name: s.name,
        location: s.location,
        contact: s.contact,
        rating: s.rating,
      },
    });
  }

  console.log("Seeding items and quotes...");
  for (const item of officeItems) {
    await prisma.officeItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        unit: item.unit,
        category: item.category,
        description: item.description,
      },
      create: {
        id: item.id,
        name: item.name,
        unit: item.unit,
        category: item.category,
        description: item.description,
      },
    });

    for (const quote of item.quotes) {
      await prisma.priceQuote.upsert({
        where: {
          supplierId_itemId: {
            supplierId: quote.supplierId,
            itemId: item.id,
          },
        },
        update: {
          unitPrice: quote.unitPrice,
          availability: quote.availability,
          deliveryDays: quote.deliveryDays,
          notes: quote.notes || null,
        },
        create: {
          supplierId: quote.supplierId,
          itemId: item.id,
          unitPrice: quote.unitPrice,
          availability: quote.availability,
          deliveryDays: quote.deliveryDays,
          notes: quote.notes || null,
        },
      });
    }
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
