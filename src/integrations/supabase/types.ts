export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          amount_usd: number
          bank_account: string | null
          bank_name: string | null
          bank_reference: string | null
          created_at: string
          credited_at: string | null
          crypto: Database["public"]["Enums"]["crypto_kind"]
          id: string
          note: string | null
          receipt_url: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          bank_account?: string | null
          bank_name?: string | null
          bank_reference?: string | null
          created_at?: string
          credited_at?: string | null
          crypto: Database["public"]["Enums"]["crypto_kind"]
          id?: string
          note?: string | null
          receipt_url?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          bank_account?: string | null
          bank_name?: string | null
          bank_reference?: string | null
          created_at?: string
          credited_at?: string | null
          crypto?: Database["public"]["Enums"]["crypto_kind"]
          id?: string
          note?: string | null
          receipt_url?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_stats: {
        Row: {
          biggest_payout: number
          id: string
          losses: number
          total_bets: number
          total_wagered: number
          total_won: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          biggest_payout?: number
          id?: string
          losses?: number
          total_bets?: number
          total_wagered?: number
          total_won?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          biggest_payout?: number
          id?: string
          losses?: number
          total_bets?: number
          total_wagered?: number
          total_won?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
      payment_wallets: {
        Row: {
          address: string
          created_at: string
          created_by: string | null
          crypto: Database["public"]["Enums"]["crypto_kind"]
          icon_url: string | null
          id: string
          is_active: boolean
          label: string
          network: string
          qr_url: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          created_by?: string | null
          crypto: Database["public"]["Enums"]["crypto_kind"]
          icon_url?: string | null
          id?: string
          is_active?: boolean
          label: string
          network: string
          qr_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string | null
          crypto?: Database["public"]["Enums"]["crypto_kind"]
          icon_url?: string | null
          id?: string
          is_active?: boolean
          label?: string
          network?: string
          qr_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_suspended: boolean
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_suspended?: boolean
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_suspended?: boolean
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_bets: {
        Row: {
          created_at: string
          id: string
          odds: number
          potential_payout: number
          prediction_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          stake: number
          status: Database["public"]["Enums"]["vip_bet_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          odds: number
          potential_payout: number
          prediction_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stake: number
          status?: Database["public"]["Enums"]["vip_bet_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          odds?: number
          potential_payout?: number
          prediction_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stake?: number
          status?: Database["public"]["Enums"]["vip_bet_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_bets_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "vip_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_history: {
        Row: {
          action: string
          created_at: string
          id: string
          months: number
          new_expires_at: string
          plan_id: string
          plan_label: string
          previous_expires_at: string | null
          price: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          months: number
          new_expires_at: string
          plan_id: string
          plan_label: string
          previous_expires_at?: string | null
          price: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          months?: number
          new_expires_at?: string
          plan_id?: string
          plan_label?: string
          previous_expires_at?: string | null
          price?: number
          user_id?: string
        }
        Relationships: []
      }
      vip_predictions: {
        Row: {
          analysis: string | null
          away_team: string
          confidence: number
          created_at: string
          created_by: string | null
          home_team: string
          id: string
          is_active: boolean
          kickoff: string
          league: string
          odds: number
          prediction: string
          section: string
          selection: string
          updated_at: string
        }
        Insert: {
          analysis?: string | null
          away_team: string
          confidence?: number
          created_at?: string
          created_by?: string | null
          home_team: string
          id?: string
          is_active?: boolean
          kickoff: string
          league: string
          odds: number
          prediction: string
          section: string
          selection?: string
          updated_at?: string
        }
        Update: {
          analysis?: string | null
          away_team?: string
          confidence?: number
          created_at?: string
          created_by?: string | null
          home_team?: string
          id?: string
          is_active?: boolean
          kickoff?: string
          league?: string
          odds?: number
          prediction?: string
          section?: string
          selection?: string
          updated_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount_usd: number
          bank_account: string | null
          bank_name: string | null
          bank_reference: string | null
          created_at: string
          crypto: Database["public"]["Enums"]["crypto_kind"]
          destination_address: string
          id: string
          note: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          bank_account?: string | null
          bank_name?: string | null
          bank_reference?: string | null
          created_at?: string
          crypto: Database["public"]["Enums"]["crypto_kind"]
          destination_address: string
          id?: string
          note?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          bank_account?: string | null
          bank_name?: string | null
          bank_reference?: string | null
          created_at?: string
          crypto?: Database["public"]["Enums"]["crypto_kind"]
          destination_address?: string
          id?: string
          note?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_credit_user: {
        Args: { _amount: number; _note?: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_vip: {
        Args: {
          _months: number
          _plan_id: string
          _plan_label: string
          _price: number
        }
        Returns: {
          action: string
          new_balance: number
          new_expires_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      crypto_kind: "BTC" | "ETH" | "USDT" | "BANK"
      request_status: "pending" | "approved" | "rejected"
      vip_bet_status: "pending" | "approved" | "rejected" | "won" | "lost"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      crypto_kind: ["BTC", "ETH", "USDT", "BANK"],
      request_status: ["pending", "approved", "rejected"],
      vip_bet_status: ["pending", "approved", "rejected", "won", "lost"],
    },
  },
} as const
