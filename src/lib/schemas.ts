import { z } from "zod";

export const CreateReservationSchema = z.object({
  productId: z.string().min(1, "Product ID required"),
  warehouseId: z.string().min(1, "Warehouse ID required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;