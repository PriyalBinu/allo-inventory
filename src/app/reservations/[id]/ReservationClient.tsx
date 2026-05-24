"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Reservation {
  id: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
  product: { name: string; sku: string; price: number; imageUrl: string | null; description: string | null };
  warehouse: { name: string; location: string };
}

function useCountdown(expiresAt: string, status: string) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  return { secondsLeft, minutes: Math.floor(secondsLeft / 60), seconds: secondsLeft % 60 };
}

export default function ReservationClient({ reservation: initial }: { reservation: Reservation }) {
  const [reservation, setReservation] = useState(initial);
  const [loading, setLoading] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { secondsLeft, minutes, seconds } = useCountdown(reservation.expiresAt, reservation.status);

  useEffect(() => {
    if (secondsLeft === 0 && reservation.status === "PENDING") {
      setReservation((r) => ({ ...r, status: "RELEASED" }));
    }
  }, [secondsLeft, reservation.status]);

  const handleConfirm = useCallback(async () => {
    setError(null);
    setLoading("confirm");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (res.status === 410) {
        setError("Your reservation has expired. The items have been released.");
        setReservation((r) => ({ ...r, status: "RELEASED" }));
        return;
      }
      if (!res.ok) { setError(data.error ?? "Failed to confirm."); return; }
      setReservation((r) => ({ ...r, status: "CONFIRMED" }));
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(null); }
  }, [reservation.id]);

  const handleCancel = useCallback(async () => {
    setError(null);
    setLoading("cancel");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to cancel."); return; }
      setReservation((r) => ({ ...r, status: "RELEASED" }));
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(null); }
  }, [reservation.id]);

  const isPending = reservation.status === "PENDING" && secondsLeft > 0;
  const total = reservation.product.price * reservation.quantity;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <a href="/" className="text-sm text-blue-600 hover:underline">← Back to products</a>
        <span className="text-gray-300">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex gap-4 p-6 border-b border-gray-100">
          {reservation.product.imageUrl && (
            <img src={reservation.product.imageUrl} alt={reservation.product.name}
              className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-xs font-mono text-gray-400">{reservation.product.sku}</p>
            <h2 className="text-lg font-semibold text-gray-900">{reservation.product.name}</h2>
            {reservation.product.description && (
              <p className="text-sm text-gray-500 mt-1">{reservation.product.description}</p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Warehouse</p>
              <p className="font-medium text-gray-900">{reservation.warehouse.name}</p>
              <p className="text-gray-400 text-xs">{reservation.warehouse.location}</p>
            </div>
            <div>
              <p className="text-gray-500">Quantity</p>
              <p className="font-medium text-gray-900">{reservation.quantity} unit(s)</p>
            </div>
            <div>
              <p className="text-gray-500">Unit price</p>
              <p className="font-medium text-gray-900">₹{reservation.product.price.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">₹{total.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            reservation.status === "CONFIRMED" ? "bg-green-50 border-green-200 text-green-800" :
            reservation.status === "RELEASED" ? "bg-gray-50 border-gray-200 text-gray-600" :
            "bg-blue-50 border-blue-200 text-blue-800"
          }`}>
            {reservation.status === "PENDING" && secondsLeft > 0 && "⏳ Reserved — complete your purchase below"}
            {reservation.status === "CONFIRMED" && "✅ Confirmed — payment successful! Order placed."}
            {(reservation.status === "RELEASED" || (reservation.status === "PENDING" && secondsLeft === 0)) && "❌ Released — items returned to inventory."}
          </div>

          {/* Countdown */}
          {isPending && (
            <div className={`rounded-lg border px-4 py-3 text-center ${secondsLeft <= 60 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
              <p className={`text-xs font-medium mb-1 ${secondsLeft <= 60 ? "text-red-500" : "text-amber-600"}`}>
                RESERVATION EXPIRES IN
              </p>
              <p className={`text-3xl font-mono font-bold ${secondsLeft <= 60 ? "text-red-700" : "text-amber-800"}`}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {isPending && (
            <div className="flex gap-3 pt-2">
              <button onClick={handleConfirm} disabled={!!loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition-colors">
                {loading === "confirm" ? "Processing…" : "Confirm Purchase"}
              </button>
              <button onClick={handleCancel} disabled={!!loading}
                className="flex-1 bg-white hover:bg-gray-50 disabled:cursor-not-allowed text-gray-700 font-semibold rounded-lg py-3 border border-gray-200 transition-colors">
                {loading === "cancel" ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          )}

          {reservation.status === "CONFIRMED" && (
            <a href="/" className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-3 transition-colors">
              Continue Shopping →
            </a>
          )}

          {(reservation.status === "RELEASED" || (reservation.status === "PENDING" && secondsLeft === 0)) && (
            <a href="/" className="block w-full text-center bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg py-3 transition-colors">
              ← Back to Products
            </a>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400 font-mono">Reservation ID: {reservation.id}</p>
    </div>
  );
}