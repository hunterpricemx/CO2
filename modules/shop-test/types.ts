export type TestPurchaseStatus = "pending" | "completed" | "failed" | "refunded";

export interface TestPurchase {
  id:                 string;
  created_at:         string;
  admin_email:        string;
  uid:                number;
  item_id:            number;
  cp_amount:          number;
  player_ip:          string | null;
  status:             TestPurchaseStatus;
  delivery_attempts:  number;
  delivery_error:     string | null;
  delivered_at:       string | null;
  request_payload:    unknown;
  response_body:      unknown;
}

export interface TestPurchaseInput {
  uid:       number;
  itemId:    number;
  cpAmount:  number;
}

export interface TestPurchaseResult {
  purchaseId:        string;
  status:            TestPurchaseStatus;
  delivered:         boolean;
  alreadyDelivered:  boolean;
  refunded:          boolean;
  newBalance:        number | null;
  error?:            string;
}
