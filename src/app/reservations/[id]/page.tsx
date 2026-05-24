import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReservationClient from "./ReservationClient";

export const dynamic = "force-dynamic";

export default async function ReservationPage({ params }: { params: { id: string } }) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: {
      product: { select: { name: true, sku: true, price: true, imageUrl: true, description: true } },
      warehouse: { select: { name: true, location: true } },
    },
  });

  if (!reservation) notFound();

  return <ReservationClient reservation={JSON.parse(JSON.stringify(reservation))} />;
}