import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateReservationSchema } from "@/lib/schemas";
import { RESERVATION_TTL_SECONDS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const { productId, warehouseId, quantity } = parsed.data;

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const stock = await tx.$queryRaw<Array<{ id: string; total: number; reserved: number }>>`
        SELECT id, total, reserved
        FROM "Stock"
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (stock.length === 0) throw new Error("STOCK_NOT_FOUND");

      const { id: stockId, total, reserved } = stock[0];
      const available = total - reserved;

      if (available < quantity) throw new Error("INSUFFICIENT_STOCK");

      await tx.$executeRaw`
        UPDATE "Stock" SET reserved = reserved + ${quantity} WHERE id = ${stockId}
      `;

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_SECONDS * 1000);
      return tx.reservation.create({
        data: { productId, warehouseId, quantity, expiresAt, status: "PENDING" },
        include: {
          product: { select: { name: true, sku: true, price: true } },
          warehouse: { select: { name: true, location: true } },
        },
      });
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INSUFFICIENT_STOCK")
        return NextResponse.json({ error: "Not enough stock available" }, { status: 409 });
      if (err.message === "STOCK_NOT_FOUND")
        return NextResponse.json({ error: "Product not found at this warehouse" }, { status: 404 });
    }
    console.error("[POST /api/reservations]", err);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}