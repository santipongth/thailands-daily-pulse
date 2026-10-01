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
          items: Json | null
          published_at: string | null
          signature: string
        }
        Insert: {
          body: string
          brief_date: string
          generated_at?: string
          items?: Json | null
          published_at?: string | null
          signature?: string
        }
        Update: {
          body?: string
          brief_date?: string
          generated_at?: string
          items?: Json | null
          published_at?: string | null
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
          reach: number
          sort: number
          source_name: string
          source_url: string | null
          trust: string
        }
        Insert: {
          cadence: string
          description: string
          emoji: string
          id: string
          is_live?: boolean
          name_th: string
          reach?: number
          sort?: number
          source_name: string
          source_url?: string | null
          trust?: string
        }
        Update: {
          cadence?: string
          description?: string
          emoji?: string
          id?: string
          is_live?: boolean
          name_th?: string
          reach?: number
          sort?: number
          source_name?: string
          source_url?: string | null
          trust?: string
        }
        Relationships: []
      }
      gov_changes: {
        Row: {
          after_text: string | null
          agency: string
          before_text: string | null
          change_date: string
          created_at: string
          dataset_id: string
          id: number
          kind: string
          pct: number | null
          reason_th: string
        }
        Insert: {
          after_text?: string | null
          agency: string
          before_text?: string | null
          change_date: string
          created_at?: string
          dataset_id: string
          id?: number
          kind: string
          pct?: number | null
          reason_th: string
        }
        Update: {
          after_text?: string | null
          agency?: string
          before_text?: string | null
          change_date?: string
          created_at?: string
          dataset_id?: string
          id?: number
          kind?: string
          pct?: number | null
          reason_th?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_changes_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "gov_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_datasets: {
        Row: {
          agency: string
          first_seen: string
          id: string
          org: string | null
          title: string
          url: string
        }
        Insert: {
          agency: string
          first_seen?: string
          id: string
          org?: string | null
          title: string
          url: string
        }
        Update: {
          agency?: string
          first_seen?: string
          id?: string
          org?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      gov_snapshots: {
        Row: {
          csv_url: string | null
          dataset_id: string
          metadata_modified: string | null
          numeric_total: number | null
          resource_hash: string | null
          row_count: number | null
          snap_date: string
        }
        Insert: {
          csv_url?: string | null
          dataset_id: string
          metadata_modified?: string | null
          numeric_total?: number | null
          resource_hash?: string | null
          row_count?: number | null
          snap_date: string
        }
        Update: {
          csv_url?: string | null
          dataset_id?: string
          metadata_modified?: string | null
          numeric_total?: number | null
          resource_hash?: string | null
          row_count?: number | null
          snap_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_snapshots_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "gov_datasets"
            referencedColumns: ["id"]
          },
        ]
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
      lottery_draws: {
        Row: {
          back3: string[] | null
          draw_date: string
          fetched_at: string
          first: string
          front3: string[] | null
          last2: string | null
          pdf_url: string | null
          verified: boolean
          video_url: string | null
        }
        Insert: {
          back3?: string[] | null
          draw_date: string
          fetched_at?: string
          first: string
          front3?: string[] | null
          last2?: string | null
          pdf_url?: string | null
          verified?: boolean
          video_url?: string | null
        }
        Update: {
          back3?: string[] | null
          draw_date?: string
          fetched_at?: string
          first?: string
          front3?: string[] | null
          last2?: string | null
          pdf_url?: string | null
          verified?: boolean
          video_url?: string | null
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
          max_gap_days: number
          min_pct: number | null
          name_th: string
          sort: number
          threshold_abs: number | null
          threshold_pct: number | null
          unit: string
          vol_k: number
        }
        Insert: {
          bands?: number[] | null
          decimals?: number
          family_id: string
          id: string
          kind?: string
          max_gap_days?: number
          min_pct?: number | null
          name_th: string
          sort?: number
          threshold_abs?: number | null
          threshold_pct?: number | null
          unit?: string
          vol_k?: number
        }
        Update: {
          bands?: number[] | null
          decimals?: number
          family_id?: string
          id?: string
          kind?: string
          max_gap_days?: number
          min_pct?: number | null
          name_th?: string
          sort?: number
          threshold_abs?: number | null
          threshold_pct?: number | null
          unit?: string
          vol_k?: number
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
      news_items: {
        Row: {
          agency: string | null
          created_at: string
          family_id: string | null
          id: number
          link: string
          published_at: string
          source: string
          title: string
        }
        Insert: {
          agency?: string | null
          created_at?: string
          family_id?: string | null
          id?: number
          link: string
          published_at: string
          source: string
          title: string
        }
        Update: {
          agency?: string | null
          created_at?: string
          family_id?: string | null
          id?: number
          link?: string
          published_at?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_family_id_fkey"
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
          checks: Json | null
          created_at: string
          family_id: string
          id: string
          is_demo: boolean
          metric_id: string
          new_value: number
          prev_value: number | null
          score: number | null
          severity: string
          signal_date: string
          title: string
        }
        Insert: {
          change_abs?: number | null
          change_pct?: number | null
          checks?: Json | null
          created_at?: string
          family_id: string
          id?: string
          is_demo?: boolean
          metric_id: string
          new_value: number
          prev_value?: number | null
          score?: number | null
          severity: string
          signal_date: string
          title: string
        }
        Update: {
          change_abs?: number | null
          change_pct?: number | null
          checks?: Json | null
          created_at?: string
          family_id?: string
          id?: string
          is_demo?: boolean
          metric_id?: string
          new_value?: number
          prev_value?: number | null
          score?: number | null
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
      source_run_history: {
        Row: {
          error: string | null
          id: number
          ok: boolean
          ran_at: string
          rows: number
          run_kind: string
          source: string
        }
        Insert: {
          error?: string | null
          id?: number
          ok: boolean
          ran_at?: string
          rows?: number
          run_kind?: string
          source: string
        }
        Update: {
          error?: string | null
          id?: number
          ok?: boolean
          ran_at?: string
          rows?: number
          run_kind?: string
          source?: string
        }
        Relationships: []
      }
      source_runs: {
        Row: {
          error: string | null
          kind: string
          last_ok_at: string | null
          ok: boolean
          ran_at: string
          rows: number
          run_kind: string
          sample: string | null
          source: string
          url: string | null
        }
        Insert: {
          error?: string | null
          kind?: string
          last_ok_at?: string | null
          ok: boolean
          ran_at?: string
          rows?: number
          run_kind?: string
          sample?: string | null
          source: string
          url?: string | null
        }
        Update: {
          error?: string | null
          kind?: string
          last_ok_at?: string | null
          ok?: boolean
          ran_at?: string
          rows?: number
          run_kind?: string
          sample?: string | null
          source?: string
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      detect_signals: { Args: { _d: string }; Returns: number }
      rank_signals: { Args: { _d: string }; Returns: number }
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
