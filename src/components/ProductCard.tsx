"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StockEntry {
  id: string;
  warehouseId: string;
  available: number;
  warehouse: { id: string; name: string; location: string };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  sku: string;
  stock: StockEntry[];
}

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(
    product.stock[0]?.warehouseId ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStock = product.stock.find((s) => s.warehouseId === selectedWarehouse);
  const available = selectedStock?.available ?? 0;

  async function handleReserve() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, warehouseId: selectedWarehouse, quantity }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError("Not enough stock available. Try a different warehouse or reduce quantity.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/reservation/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
      )}
      <div className="p-5 flex flex-col flex-1">
        <span className="text-xs font-mono text-gray-400">{product.sku}</span>
        <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{product.name}</h2>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        )}
        <p className="text-2xl font-bold text-gray-900 mt-2">
          ₹{product.price.toLocaleString("en-IN")}
        </p>

        <div className="mt-3 mb-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Warehouse
          </label>
          <select
            value={selectedWarehouse}
            onChange={(e) => { setSelectedWarehouse(e.target.value); setQuantity(1); setError(null); }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {product.stock.map((s) => (
              <option key={s.warehouseId} value={s.warehouseId}>
                {s.warehouse.name} — {s.available} available
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          {available === 0 ? (
            <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">Out of stock</span>
          ) : available <= 3 ? (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">Only {available} left!</span>
          ) : (
            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">{available} in stock</span>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</label>
          <input
            type="number" min={1} max={available} value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(available, Number(e.target.value))))}
            className="w-20 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={available === 0}
          />
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <button
          onClick={handleReserve}
          disabled={available === 0 || loading}
          className="mt-auto w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 transition-colors text-sm"
        >
          {loading ? "Reserving…" : available === 0 ? "Out of Stock" : "Reserve →"}
        </button>
      </div>
    </div>
  );
}