/**
 * Tickets Module — Types
 */

export type TicketStatus   = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory = "account" | "payment" | "bug" | "other";
export type SenderRole     = "player" | "admin";

export interface Ticket {
  id:              string;
  ticket_number:   number;
  created_at:      string;
  updated_at:      string;
  player_id:       string | null;
  player_username: string;
  title:           string;
  description:     string;
  status:          TicketStatus;
  priority:        TicketPriority;
  category:        TicketCategory;
  version:         string | null;
  evidence_url:    string | null;
  attachment_urls: string[];
  closed_at:       string | null;
}

export interface TicketMessage {
  id:              string;
  created_at:      string;
  ticket_id:       string;
  sender_id:       string | null;
  sender_username: string;
  sender_role:     SenderRole;
  body:            string;
  attachment_urls: string[];
}

export interface TicketFilters {
  status?:   TicketStatus | "all";
  priority?: TicketPriority | "all";
  category?: TicketCategory | "all";
  version?:  string | "all";
  search?:   string;
  page?:     number;
  pageSize?: number;
}

export interface TicketsPage {
  data:       Ticket[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open:        "Abierto",
  in_progress: "En progreso",
  resolved:    "Resuelto",
  closed:      "Cerrado",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low:      "Baja",
  medium:   "Media",
  high:     "Alta",
  critical: "Crítica",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  account: "Cuenta",
  payment: "Pago",
  bug:     "Bug",
  other:   "Otro",
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open:        "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  in_progress: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  resolved:    "bg-gray-700/40 text-gray-300 border-gray-600/40",
  closed:      "bg-gray-800/40 text-gray-500 border-gray-700/40",
};

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low:      "bg-gray-700/40 text-gray-400 border-gray-600/40",
  medium:   "bg-yellow-900/40 text-yellow-300 border-yellow-700/40",
  high:     "bg-orange-900/40 text-orange-300 border-orange-700/40",
  critical: "bg-red-900/40 text-red-300 border-red-700/40",
};
