/**
 * Game Accounts Module — Types
 */

export interface GameAccountRow {
  EntityID: number;
  Username: string;
  Email: string;
  BannedID: number;
  State: number;
  Creation?: Date | null;
}

export interface GameAccountFilters {
  search?: string;
  version: 1 | 2;
  banned?: boolean;
  page: number;
  pageSize: number;
}

export interface GameAccountsPage {
  data: GameAccountRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AccountActionLog {
  id: string;
  created_at: string;
  admin_id: string | null;
  admin_username: string | null;
  action: "recovery_sent" | "email_changed";
  username: string;
  version: number;
  before_value: string | null;
  after_value: string | null;
  metadata: Record<string, unknown> | null;
}
