import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { stock: { include: { warehouse: true } } },
      orderBy: { name: "asc" },
    });
    const result = products.map((p) => ({
      ...p,
      stock: p.stock.map((s) => ({ ...s, available: s.total - s.reserved })),
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}