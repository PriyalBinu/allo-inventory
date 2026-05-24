import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    include: {
      stock: { include: { warehouse: true } },
    },
    orderBy: { name: "asc" },
  });

  const productsWithAvailability = products.map((p) => ({
    ...p,
    stock: p.stock.map((s) => ({
      ...s,
      available: Math.max(0, s.total - s.reserved),
    })),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="mt-2 text-gray-500">
          Browse available inventory across all warehouses. Stock is held for 10 minutes after checkout.
        </p>
      </div>
      {productsWithAvailability.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No products found. Run the seed script.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productsWithAvailability.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}