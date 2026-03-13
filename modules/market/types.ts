/**
 * Market Module — Types
 */

export interface MarketItemRow {
  id: string;
  item_image: string | null;       // e.g. "113300.png"
  item_name: string;
  quality: string | null;          // "NotQuality" | "Normality" | "Elite" | "Super" | "Refined"
  plus_enchant: number;            // [+] enchant level
  minus_enchant: number;           // [-] bless level
  sockets: number;                 // 0 | 1 | 2
  seller: string;
  seller_x: number | null;         // market map X coord
  seller_y: number | null;         // market map Y coord
  price: number;
  currency: string;                // "CP" | "Gold"
  version: string;                 // "1.0" | "2.0"
  item_type: string | null;
  quantity: number;
  listed_at: string;
}
