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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          category_id: number
          id: number
          name: string
        }
        Insert: {
          category_id: number
          id?: number
          name: string
        }
        Update: {
          category_id?: number
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      distributors: {
        Row: {
          credit_tier: string
          fulfillment_lead_days: number
          id: number
          latitude: number | null
          longitude: number | null
          name: string
          region: string
        }
        Insert: {
          credit_tier: string
          fulfillment_lead_days: number
          id?: number
          latitude?: number | null
          longitude?: number | null
          name: string
          region: string
        }
        Update: {
          credit_tier?: string
          fulfillment_lead_days?: number
          id?: number
          latitude?: number | null
          longitude?: number | null
          name?: string
          region?: string
        }
        Relationships: []
      }
      mother_warehouses: {
        Row: {
          capacity_pallets: number
          id: number
          latitude: number
          longitude: number
          name: string
          state: string
          zone: string
        }
        Insert: {
          capacity_pallets: number
          id?: number
          latitude: number
          longitude: number
          name: string
          state: string
          zone: string
        }
        Update: {
          capacity_pallets?: number
          id?: number
          latitude?: number
          longitude?: number
          name?: string
          state?: string
          zone?: string
        }
        Relationships: []
      }
      plants: {
        Row: {
          capacity_units: number
          id: number
          latitude: number
          longitude: number
          name: string
          operational_status: string
          state: string
        }
        Insert: {
          capacity_units: number
          id?: number
          latitude: number
          longitude: number
          name: string
          operational_status: string
          state: string
        }
        Update: {
          capacity_units?: number
          id?: number
          latitude?: number
          longitude?: number
          name?: string
          operational_status?: string
          state?: string
        }
        Relationships: []
      }
      skus: {
        Row: {
          base_price: number
          brand_id: number
          id: number
          sku_code: string
          sku_name: string
          weight_tier: string
        }
        Insert: {
          base_price: number
          brand_id: number
          id?: number
          sku_code: string
          sku_name: string
          weight_tier: string
        }
        Update: {
          base_price?: number
          brand_id?: number
          id?: number
          sku_code?: string
          sku_name?: string
          weight_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "skus_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          distributor_id: number
          id: number
          month_index: number
          mother_warehouse_id: number
          period_month: string
          period_quarter: string
          plant_id: number
          sales_inr: number
          sku_id: number
          transaction_rows: number
          units_sold: number
        }
        Insert: {
          created_at?: string
          distributor_id: number
          id?: number
          month_index: number
          mother_warehouse_id: number
          period_month: string
          period_quarter: string
          plant_id: number
          sales_inr: number
          sku_id: number
          transaction_rows: number
          units_sold: number
        }
        Update: {
          created_at?: string
          distributor_id?: number
          id?: number
          month_index?: number
          mother_warehouse_id?: number
          period_month?: string
          period_quarter?: string
          plant_id?: number
          sales_inr?: number
          sku_id?: number
          transaction_rows?: number
          units_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_mother_warehouse_id_fkey"
            columns: ["mother_warehouse_id"]
            isOneToOne: false
            referencedRelation: "mother_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      transaction_details: {
        Row: {
          brand: string | null
          category: string | null
          credit_tier: string | null
          distributor: string | null
          id: number | null
          month_index: number | null
          period_month: string | null
          period_quarter: string | null
          plant: string | null
          region: string | null
          sales_inr: number | null
          sku_code: string | null
          sku_name: string | null
          transaction_rows: number | null
          units_sold: number | null
          warehouse: string | null
          warehouse_zone: string | null
          weight_tier: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analytics_status: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
