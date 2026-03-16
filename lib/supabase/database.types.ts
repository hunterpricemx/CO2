/**
 * Supabase Database Types â€” Auto-generated from schema
 *
 * This file represents the TypeScript types for the Supabase database schema.
 * In production, generate this file automatically with:
 *
 *   npx supabase gen types typescript --project-id fjvadikuvcshwxikebhv > lib/supabase/database.types.ts
 *
 * For now it is maintained manually in sync with the SQL migrations in `sql/`.
 *
 * @module lib/supabase/database.types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GameVersion = "1.0" | "2.0" | "both";
export type ContentStatus = "draft" | "published" | "archived";
export type UserRole = "admin" | "player";
export type DonationStatus = "pending" | "completed" | "refunded";
export type RankingType = "pk" | "ko";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: UserRole;
          panel_permissions: Json;
          in_game_name: string | null;
          version: GameVersion | null;
          banned: boolean;
          ban_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          role?: UserRole;
          panel_permissions?: Json;
          in_game_name?: string | null;
          version?: GameVersion | null;
          banned?: boolean;
          ban_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          role?: UserRole;
          panel_permissions?: Json;
          in_game_name?: string | null;
          version?: GameVersion | null;
          banned?: boolean;
          ban_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title_es: string;
          title_en: string;
          title_pt: string;
          schedule: Json;
          description_es: string | null;
          description_en: string | null;
          description_pt: string | null;
          rewards_es: string | null;
          rewards_en: string | null;
          rewards_pt: string | null;
          featured_image: string | null;
          status: ContentStatus;
          version: GameVersion;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title_es: string;
          title_en: string;
          title_pt: string;
          schedule: Json;
          description_es?: string | null;
          description_en?: string | null;
          description_pt?: string | null;
          rewards_es?: string | null;
          rewards_en?: string | null;
          rewards_pt?: string | null;
          featured_image?: string | null;
          status?: ContentStatus;
          version?: GameVersion;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title_es?: string;
          title_en?: string;
          title_pt?: string;
          schedule?: Json;
          description_es?: string | null;
          description_en?: string | null;
          description_pt?: string | null;
          rewards_es?: string | null;
          rewards_en?: string | null;
          rewards_pt?: string | null;
          featured_image?: string | null;
          status?: ContentStatus;
          version?: GameVersion;
          view_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      guide_categories: {
        Row: {
          id: string;
          slug: string;
          name_es: string;
          name_en: string;
          name_pt: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_es: string;
          name_en: string;
          name_pt: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name_es?: string;
          name_en?: string;
          name_pt?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      guides: {
        Row: {
          id: string;
          slug: string;
          title_es: string;
          title_en: string;
          title_pt: string;
          content_es: string | null;
          content_en: string | null;
          content_pt: string | null;
          video_url: string | null;
          category_id: string | null;
          featured_image: string | null;
          status: ContentStatus;
          version: GameVersion;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title_es: string;
          title_en: string;
          title_pt: string;
          content_es?: string | null;
          content_en?: string | null;
          content_pt?: string | null;
          video_url?: string | null;
          category_id?: string | null;
          featured_image?: string | null;
          status?: ContentStatus;
          version?: GameVersion;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title_es?: string;
          title_en?: string;
          title_pt?: string;
          content_es?: string | null;
          content_en?: string | null;
          content_pt?: string | null;
          video_url?: string | null;
          category_id?: string | null;
          featured_image?: string | null;
          status?: ContentStatus;
          version?: GameVersion;
          view_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guides_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "guide_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      fix_categories: {
        Row: {
          id: string;
          slug: string;
          name_es: string;
          name_en: string;
          name_pt: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_es: string;
          name_en: string;
          name_pt: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name_es?: string;
          name_en?: string;
          name_pt?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      fixes: {
        Row: {
          id: string;
          slug: string;
          title_es: string;
          title_en: string;
          title_pt: string;
          content_es: string | null;
          content_en: string | null;
          content_pt: string | null;
          video_url: string | null;
          category_id: string | null;
          featured_image: string | null;
          status: ContentStatus;
          version: GameVersion;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title_es: string;
          title_en: string;
          title_pt: string;
          content_es?: string | null;
          content_en?: string | null;
          content_pt?: string | null;
          video_url?: string | null;
          category_id?: string | null;
          featured_image?: string | null;
          status?: ContentStatus;
          version?: GameVersion;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title_es?: string;
          title_en?: string;
          title_pt?: string;
          content_es?: string | null;
          content_en?: string | null;
          content_pt?: string | null;
          video_url?: string | null;
          category_id?: string | null;
          featured_image?: string | null;
          status?: ContentStatus;
          version?: GameVersion;
          view_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fixes_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "fix_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      donations: {
        Row: {
          id: string;
          player_name: string;
          amount: number;
          currency: string;
          platform: string;
          status: DonationStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_name: string;
          amount: number;
          currency?: string;
          platform?: string;
          status?: DonationStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_name?: string;
          amount?: number;
          currency?: string;
          platform?: string;
          status?: DonationStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      payment_logs: {
        Row: {
          id: string;
          created_at: string;
          source: string;
          level: string;
          event: string;
          username: string | null;
          product: string | null;
          amount: number | null;
          donation_id: string | null;
          txn_id: string | null;
          basket_ident: string | null;
          message: string;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          source: string;
          level?: string;
          event: string;
          username?: string | null;
          product?: string | null;
          amount?: number | null;
          donation_id?: string | null;
          txn_id?: string | null;
          basket_ident?: string | null;
          message: string;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          source?: string;
          level?: string;
          event?: string;
          username?: string | null;
          product?: string | null;
          amount?: number | null;
          donation_id?: string | null;
          txn_id?: string | null;
          basket_ident?: string | null;
          message?: string;
          metadata?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      rankings: {
        Row: {
          id: string;
          player_name: string;
          points: number;
          ranking_type: RankingType;
          version: GameVersion;
          season: string;
          rank_position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_name: string;
          points: number;
          ranking_type: RankingType;
          version: GameVersion;
          season?: string;
          rank_position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_name?: string;
          points?: number;
          ranking_type?: RankingType;
          version?: GameVersion;
          season?: string;
          rank_position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      market_items: {
        Row: {
          id: string;
          item_name: string;
          seller: string;
          price: number;
          currency: string;
          version: GameVersion;
          item_type: string | null;
          quantity: number;
          listed_at: string;
        };
        Insert: {
          id?: string;
          item_name: string;
          seller: string;
          price: number;
          currency?: string;
          version: GameVersion;
          item_type?: string | null;
          quantity?: number;
          listed_at?: string;
        };
        Update: {
          id?: string;
          item_name?: string;
          seller?: string;
          price?: number;
          currency?: string;
          version?: GameVersion;
          item_type?: string | null;
          quantity?: number;
        };
        Relationships: [];
      };
      server_config: {
        Row: {
          id: number;
          db_host: string | null;
          db_port: number;
          db_name: string | null;
          db_user: string | null;
          db_pass: string | null;
          table_accounts: string;
          table_characters_v1: string;
          table_characters_v2: string;
          last_sync: string | null;
          sync_accounts_count: number;
          sync_characters_count: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          db_host?: string | null;
          db_port?: number;
          db_name?: string | null;
          db_user?: string | null;
          db_pass?: string | null;
          table_accounts?: string;
          table_characters_v1?: string;
          table_characters_v2?: string;
          last_sync?: string | null;
          sync_accounts_count?: number;
          sync_characters_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          db_host?: string | null;
          db_port?: number;
          db_name?: string | null;
          db_user?: string | null;
          db_pass?: string | null;
          table_accounts?: string;
          table_characters_v1?: string;
          table_characters_v2?: string;
          last_sync?: string | null;
          sync_accounts_count?: number;
          sync_characters_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_accounts: {
        Row: {
          entity_id: number;
          username: string;
          email: string;
          earth_id: string;
          ip: string | null;
          banned_id: number;
          creation: string | null;
          hwid: string | null;
          state: number;
          synced_at: string;
        };
        Insert: {
          entity_id: number;
          username: string;
          email?: string;
          earth_id?: string;
          ip?: string | null;
          banned_id?: number;
          creation?: string | null;
          hwid?: string | null;
          state?: number;
          synced_at?: string;
        };
        Update: {
          entity_id?: number;
          username?: string;
          email?: string;
          earth_id?: string;
          ip?: string | null;
          banned_id?: number;
          creation?: string | null;
          hwid?: string | null;
          state?: number;
          synced_at?: string;
        };
        Relationships: [];
      };
      game_characters: {
        Row: {
          entity_id: number;
          version: string;
          name: string;
          money: number;
          cps: number;
          guild_name: string | null;
          money_save: number;
          mesh: number;
          avatar: number;
          genesis_coin: number;
          auto_hunting: number;
          pk_points: number;
          reborn: number;
          strength: number;
          agility: number;
          vitality: number;
          spirit: number;
          additional: number;
          spouse: string | null;
          level: number;
          status: number;
          met_scrolls: number;
          synced_at: string;
        };
        Insert: {
          entity_id: number;
          version?: string;
          name: string;
          money?: number;
          cps?: number;
          guild_name?: string | null;
          money_save?: number;
          mesh?: number;
          avatar?: number;
          genesis_coin?: number;
          auto_hunting?: number;
          pk_points?: number;
          reborn?: number;
          strength?: number;
          agility?: number;
          vitality?: number;
          spirit?: number;
          additional?: number;
          spouse?: string | null;
          level?: number;
          status?: number;
          met_scrolls?: number;
          synced_at?: string;
        };
        Update: {
          entity_id?: number;
          version?: string;
          name?: string;
          money?: number;
          cps?: number;
          guild_name?: string | null;
          money_save?: number;
          mesh?: number;
          avatar?: number;
          genesis_coin?: number;
          auto_hunting?: number;
          pk_points?: number;
          reborn?: number;
          strength?: number;
          agility?: number;
          vitality?: number;
          spirit?: number;
          additional?: number;
          spouse?: string | null;
          level?: number;
          status?: number;
          met_scrolls?: number;
          synced_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: {
      game_version: GameVersion;
      content_status: ContentStatus;
      user_role: UserRole;
      donation_status: DonationStatus;
      ranking_type: RankingType;
    };
  };
}
