/**
 * Market Module — Types
 */

export interface MarketItemRow {
  id: string;
  item_image: string | null;       // e.g. "113300.png" — null when no PNG exists in public/images/market/
  item_id_raw?: number;            // raw itemid from game DB (independent of whether the sprite PNG exists)
  item_name: string;
  quality: string | null;          // "NotQuality" | "Normality" | "Elite" | "Super" | "Refined"
  plus_enchant: number;            // [+] enchant level
  minus_enchant: number;           // [-] bless level
  sockets: number;                 // 0 | 1 | 2
  /** Raw socket strings from marketlogs ("PhoenixGem", "NoSocket", etc.) — used to compute soc1/soc2 bytes for the listener */
  item_soc1?: string;
  item_soc2?: string;
  seller: string;
  seller_uid?: number;             // selleruid from marketlogs (needed by the C# listener to remove the listing)
  seller_x: number | null;         // market map X coord
  seller_y: number | null;         // market map Y coord
  item_uid?: number;               // unique instance UID from marketlogs (NOT the catalog item_id)
  price: number;
  currency: string;                // "CP" | "Gold"
  version: string;                 // "1.0" | "2.0"
  item_type: string | null;
  quantity: number;
  listed_at: string;
}
