import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expired = await prisma.reservation.findMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
    });

    if (expired.length === 0) return NextResponse.json({ released: 0 });

    let released = 0;
    for (const res of expired) {
      try {
        await prisma.$transaction(async (tx) => {
          const current = await tx.reservation.findUnique({ where: { id: res.id } });
          if (!current || current.status !== "PENDING") return;

          await tx.$executeRaw`
            UPDATE "Stock" SET reserved = reserved - ${res.quantity}
            WHERE "productId" = ${res.productId} AND "warehouseId" = ${res.warehouseId}
          `;
          await tx.reservation.update({ where: { id: res.id }, data: { status: "RELEASED" } });
        });
        released++;
      } catch (e) {
        console.error(`Failed to release ${res.id}:`, e);
      }
    }

    return NextResponse.json({ released, total: expired.length });
  } catch (error) {
    console.error("[cron/expire-reservations]", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}