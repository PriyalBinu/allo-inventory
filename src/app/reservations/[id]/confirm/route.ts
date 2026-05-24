import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const idempotencyKey = req.headers.get("idempotency-key");

  const { body: responseBody, statusCode } = await withIdempotency(idempotencyKey, async () => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({ where: { id: params.id } });

        if (!reservation) throw new Error("NOT_FOUND");
        if (reservation.status !== "PENDING") throw new Error(`WRONG_STATUS:${reservation.status}`);

        if (new Date() > reservation.expiresAt) {
          await tx.$executeRaw`
            UPDATE "Stock" SET reserved = reserved - ${reservation.quantity}
            WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
          `;
          await tx.reservation.update({ where: { id: params.id }, data: { status: "RELEASED" } });
          throw new Error("EXPIRED");
        }

        await tx.$executeRaw`
          UPDATE "Stock"
          SET reserved = reserved - ${reservation.quantity},
              total    = total    - ${reservation.quantity}
          WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
        `;

        return tx.reservation.update({
          where: { id: params.id },
          data: { status: "CONFIRMED" },
          include: {
            product: { select: { name: true, sku: true, price: true } },
            warehouse: { select: { name: true, location: true } },
          },
        });
      });

      return { body: result, statusCode: 200 };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") return { body: { error: "Reservation not found" }, statusCode: 404 };
        if (err.message === "EXPIRED") return { body: { error: "Reservation has expired" }, statusCode: 410 };
        if (err.message.startsWith("WRONG_STATUS:")) {
          const status = err.message.split(":")[1];
          return { body: { error: `Reservation is already ${status.toLowerCase()}` }, statusCode: 409 };
        }
      }
      console.error("[POST confirm]", err);
      return { body: { error: "Failed to confirm reservation" }, statusCode: 500 };
    }
  });

  return NextResponse.json(responseBody, { status: statusCode });
}