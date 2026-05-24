import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateReservationSchema } from "@/lib/schemas";
import { withIdempotency } from "@/lib/idempotency";
import { RESERVATION_TTL_SECONDS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("idempotency-key");

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

  const { body: responseBody, statusCode } = await withIdempotency(idempotencyKey, async () => {
    try {
      const reservation = await prisma.$transaction(async (tx) => {
        // SELECT FOR UPDATE locks this row so concurrent requests serialize
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

      return { body: reservation, statusCode: 201 };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "INSUFFICIENT_STOCK")
          return { body: { error: "Not enough stock available for this product at this warehouse" }, statusCode: 409 };
        if (err.message === "STOCK_NOT_FOUND")
          return { body: { error: "Product not found at this warehouse" }, statusCode: 404 };
      }
      console.error("[POST /api/reservations]", err);
      return { body: { error: "Failed to create reservation" }, statusCode: 500 };
    }
  });

  return NextResponse.json(responseBody, { status: statusCode });
}