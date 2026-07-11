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
      ai_queries: {
        Row: {
          created_at: string
          credits_used: number
          fair_id: string
          id: string
          input_text: string | null
          intent: string | null
          org_id: string
          visitor_session_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          fair_id: string
          id?: string
          input_text?: string | null
          intent?: string | null
          org_id: string
          visitor_session_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          fair_id?: string
          id?: string
          input_text?: string | null
          intent?: string | null
          org_id?: string
          visitor_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_queries_fair_id_fkey"
            columns: ["fair_id"]
            isOneToOne: false
            referencedRelation: "fairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          org_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          org_id: string
          reason: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          org_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_sales_contacts: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          exhibitor_id: string
          notes: string | null
          org_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          exhibitor_id: string
          notes?: string | null
          org_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          exhibitor_id?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_sales_contacts_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: true
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibitor_sales_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitors: {
        Row: {
          booth_code: string
          category: string | null
          company_name: string
          created_at: string
          description: string | null
          fair_id: string
          id: string
          logo_url: string | null
          org_id: string
          socials: Json
          updated_at: string
          website: string | null
        }
        Insert: {
          booth_code: string
          category?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          fair_id: string
          id?: string
          logo_url?: string | null
          org_id: string
          socials?: Json
          updated_at?: string
          website?: string | null
        }
        Update: {
          booth_code?: string
          category?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          fair_id?: string
          id?: string
          logo_url?: string | null
          org_id?: string
          socials?: Json
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitors_fair_id_fkey"
            columns: ["fair_id"]
            isOneToOne: false
            referencedRelation: "fairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibitors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fairs: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          org_id: string
          public_slug: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["fair_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          org_id: string
          public_slug?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["fair_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          org_id?: string
          public_slug?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["fair_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fairs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      map_assets: {
        Row: {
          created_at: string
          fair_id: string
          height: number
          id: string
          image_url: string
          org_id: string
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          fair_id: string
          height: number
          id?: string
          image_url: string
          org_id: string
          updated_at?: string
          width: number
        }
        Update: {
          created_at?: string
          fair_id?: string
          height?: number
          id?: string
          image_url?: string
          org_id?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_assets_fair_id_fkey"
            columns: ["fair_id"]
            isOneToOne: false
            referencedRelation: "fairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      map_hotspots: {
        Row: {
          booth_code: string
          created_at: string
          exhibitor_id: string | null
          id: string
          map_asset_id: string
          org_id: string
          polygon: Json
          updated_at: string
        }
        Insert: {
          booth_code: string
          created_at?: string
          exhibitor_id?: string | null
          id?: string
          map_asset_id: string
          org_id: string
          polygon: Json
          updated_at?: string
        }
        Update: {
          booth_code?: string
          created_at?: string
          exhibitor_id?: string | null
          id?: string
          map_asset_id?: string
          org_id?: string
          polygon?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_hotspots_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_hotspots_map_asset_id_fkey"
            columns: ["map_asset_id"]
            isOneToOne: false
            referencedRelation: "map_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_hotspots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          credit_balance: number
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_balance?: number
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_balance?: number
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_items: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          exhibitor_id: string | null
          fair_id: string
          id: string
          location: string | null
          org_id: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          exhibitor_id?: string | null
          fair_id: string
          id?: string
          location?: string | null
          org_id: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          exhibitor_id?: string | null
          fair_id?: string
          id?: string
          location?: string | null
          org_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_fair_id_fkey"
            columns: ["fair_id"]
            isOneToOne: false
            referencedRelation: "fairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fair_is_published: { Args: { _fair_id: string }; Returns: boolean }
      has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["org_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      fair_status: "draft" | "published"
      org_role: "owner" | "admin" | "staff"
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
      fair_status: ["draft", "published"],
      org_role: ["owner", "admin", "staff"],
    },
  },
} as const
