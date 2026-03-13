/**
 * Donations Module — Types
 * @module modules/donations/types
 */

import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export type DonationRow = Database["public"]["Tables"]["donations"]["Row"];

export const donationSchema = z.object({
  player_name: z.string().min(1, "Nombre del jugador requerido"),
  amount: z.number().positive("El monto debe ser positivo"),
  currency: z.string().default("USD"),
  platform: z.string().default("manual"),
  status: z.enum(["pending", "completed", "refunded"]).default("pending"),
  notes: z.string().optional().nullable(),
});

export type CreateDonationInput = z.infer<typeof donationSchema>;

export interface DonationFilters {
  status?: "pending" | "completed" | "refunded";
  search?: string;
}
