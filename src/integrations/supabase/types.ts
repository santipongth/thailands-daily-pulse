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
      daily_briefs: {
        Row: {
          body: string
          brief_date: string
          generated_at: string
          signature: string
        }
        Insert: {
          body: string
          brief_date: string
          generated_at?: string
          signature?: string
        }
        Update: {
          body?: string
          brief_date?: string
          generated_at?: string
          signature?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          cadence: string
          description: string
          emoji: string
          id: string
          is_live: boolean
          name_th: string
          sort: number
          source_name: string
          source_url: string | null
        }
        Insert: {
          cadence: string
          description: string
          emoji: string
          id: string
          is_live?: boolean
          name_th: string
          sort?: number
          source_name: string
          source_url?: string | null
        }
        Update: {
          cadence?: string
          description?: string
          emoji?: string
          id?: string
          is_live?: boolean
          name_th?: string
          sort?: number
          source_name?: string
          source_url?: string | null
        }
        Relationships: []
      }
      job_locks: {
        Row: {
          locked_until: string
          name: string
        }
        Insert: {
          locked_until: string
          name: string
        }
        Update: {
          locked_until?: string
          name?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          bands: number[] | null
          decimals: number
          family_id: string
          id: string
          kind: string
          name_th: string
          sort: number
          threshold_abs: number | null
          threshold_pct: number | null
          unit: string
        }
        Insert: {
          bands?: number[] | null
          decimals?: number
          family_id: string
          id: string
          kind?: string
          name_th: string
          sort?: number
          threshold_abs?: number | null
          threshold_pct?: number | null
          unit?: string
        }
        Update: {
          bands?: number[] | null
          decimals?: number
          family_id?: string
          id?: string
          kind?: string
          name_th?: string
          sort?: number
          threshold_abs?: number | null
          threshold_pct?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          created_at: string
          id: number
          is_demo: boolean
          metric_id: string
          observed_on: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: number
          is_demo?: boolean
          metric_id: string
          observed_on: string
          value: number
        }
        Update: {
          created_at?: string
          id?: number
          is_demo?: boolean
          metric_id?: string
          observed_on?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "observations_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      release_calendar: {
        Row: {
          family_id: string
          id: number
          release_date: string
          title: string
        }
        Insert: {
          family_id: string
          id?: number
          release_date: string
          title: string
        }
        Update: {
          family_id?: string
          id?: number
          release_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_calendar_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          change_abs: number | null
          change_pct: number | null
          created_at: string
          family_id: string
          id: string
          is_demo: boolean
          metric_id: string
          new_value: number
          prev_value: number | null
          severity: string
          signal_date: string
          title: string
        }
        Insert: {
          change_abs?: number | null
          change_pct?: number | null
          created_at?: string
          family_id: string
          id?: string
          is_demo?: boolean
          metric_id: string
          new_value: number
          prev_value?: number | null
          severity: string
          signal_date: string
          title: string
        }
        Update: {
          change_abs?: number | null
          change_pct?: number | null
          created_at?: string
          family_id?: string
          id?: string
          is_demo?: boolean
          metric_id?: string
          new_value?: number
          prev_value?: number | null
          severity?: string
          signal_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      detect_signals: { Args: { _d: string }; Returns: number }
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
