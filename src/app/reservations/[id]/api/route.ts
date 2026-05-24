import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, sku: true, price: true, imageUrl: true } },
        warehouse: { select: { name: true, location: true } },
      },
    });
    if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    return NextResponse.json(reservation);
  } catch (error) {
    console.error("[GET /api/reservations/:id]", error);
    return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
  }
}