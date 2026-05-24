import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id: params.id } });

      if (!reservation) throw new Error("NOT_FOUND");
      if (reservation.status !== "PENDING") throw new Error(`WRONG_STATUS:${reservation.status}`);

      await tx.$executeRaw`
        UPDATE "Stock" SET reserved = reserved - ${reservation.quantity}
        WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
      `;

      return tx.reservation.update({
        where: { id: params.id },
        data: { status: "RELEASED" },
        include: {
          product: { select: { name: true, sku: true, price: true } },
          warehouse: { select: { name: true, location: true } },
        },
      });
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND")
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      if (err.message.startsWith("WRONG_STATUS:")) {
        const status = err.message.split(":")[1];
        return NextResponse.json({ error: `Cannot release — already ${status.toLowerCase()}` }, { status: 409 });
      }
    }
    console.error("[POST release]", err);
    return NextResponse.json({ error: "Failed to release reservation" }, { status: 500 });
  }
}