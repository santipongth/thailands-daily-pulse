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
      api_rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      brief_images: {
        Row: {
          brief_date: string
          created_at: string
          family_id: string | null
          id: number
          prompt: string
          slot: string
          storage_path: string
        }
        Insert: {
          brief_date: string
          created_at?: string
          family_id?: string | null
          id?: number
          prompt: string
          slot: string
          storage_path: string
        }
        Update: {
          brief_date?: string
          created_at?: string
          family_id?: string | null
          id?: number
          prompt?: string
          slot?: string
          storage_path?: string
        }
        Relationships: []
      }
      brief_updates: {
        Row: {
          body: string | null
          brief_date: string
          created_at: string
          event_id: string | null
          id: number
          kind: string
          title: string
          version: number | null
        }
        Insert: {
          body?: string | null
          brief_date: string
          created_at?: string
          event_id?: string | null
          id?: number
          kind: string
          title: string
          version?: number | null
        }
        Update: {
          body?: string | null
          brief_date?: string
          created_at?: string
          event_id?: string | null
          id?: number
          kind?: string
          title?: string
          version?: number | null
        }
        Relationships: []
      }
      daily_briefs: {
        Row: {
          body: string
          brief_date: string
          completeness: Json | null
          cutoff_at: string | null
          data_window: Json | null
          edition: number
          generated_at: string
          items: Json | null
          published_at: string | null
          signature: string
        }
        Insert: {
          body: string
          brief_date: string
          completeness?: Json | null
          cutoff_at?: string | null
          data_window?: Json | null
          edition?: number
          generated_at?: string
          items?: Json | null
          published_at?: string | null
          signature?: string
        }
        Update: {
          body?: string
          brief_date?: string
          completeness?: Json | null
          cutoff_at?: string | null
          data_window?: Json | null
          edition?: number
          generated_at?: string
          items?: Json | null
          published_at?: string | null
          signature?: string
        }
        Relationships: []
      }
      dam_readings: {
        Row: {
          id: number
          metric_id: string
          observed_on: string
          read_at: string
          value: number
        }
        Insert: {
          id?: number
          metric_id: string
          observed_on: string
          read_at?: string
          value: number
        }
        Update: {
          id?: number
          metric_id?: string
          observed_on?: string
          read_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "dam_readings_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
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
      holidays: {
        Row: {
          created_at: string
          delete_hash: string
          holiday_date: string
          id: number
          is_bank: boolean
          is_gov: boolean
          kind: string
          name: string
          note: string | null
          source: string
          source_url: string | null
        }
        Insert: {
          created_at?: string
          delete_hash: string
          holiday_date: string
          id?: number
          is_bank?: boolean
          is_gov?: boolean
          kind: string
          name: string
          note?: string | null
          source?: string
          source_url?: string | null
        }
        Update: {
          created_at?: string
          delete_hash?: string
          holiday_date?: string
          id?: number
          is_bank?: boolean
          is_gov?: boolean
          kind?: string
          name?: string
          note?: string | null
          source?: string
          source_url?: string | null
        }
        Relationships: []
      }
      ingest_jobs: {
        Row: {
          attempts: number
          batch_id: string
          created_at: string
          error: string | null
          finished_at: string | null
          id: number
          job_type: string
          locked_until: string | null
          max_attempts: number
          rows: number
          run_after: string
          run_kind: string
          source: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          batch_id: string
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: number
          job_type: string
          locked_until?: string | null
          max_attempts?: number
          rows?: number
          run_after?: string
          run_kind?: string
          source: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          batch_id?: string
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: number
          job_type?: string
          locked_until?: string | null
          max_attempts?: number
          rows?: number
          run_after?: string
          run_kind?: string
          source?: string
          started_at?: string | null
          status?: string
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
          effective_from: string | null
          evidence_id: number | null
          id: number
          is_demo: boolean
          metric_id: string
          observed_on: string
          period_end: string | null
          period_start: string | null
          published_at: string | null
          received_at: string
          value: number
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          evidence_id?: number | null
          id?: number
          is_demo?: boolean
          metric_id: string
          observed_on: string
          period_end?: string | null
          period_start?: string | null
          published_at?: string | null
          received_at?: string
          value: number
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          evidence_id?: number | null
          id?: number
          is_demo?: boolean
          metric_id?: string
          observed_on?: string
          period_end?: string | null
          period_start?: string | null
          published_at?: string | null
          received_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "observations_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "raw_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_evidence: {
        Row: {
          bytes: number
          content_type: string | null
          fetched_at: string
          http_status: number | null
          id: number
          job_id: number | null
          last_job_id: number | null
          last_seen_at: string | null
          seen_count: number
          sha256: string
          source: string
          storage_path: string
          url: string
        }
        Insert: {
          bytes?: number
          content_type?: string | null
          fetched_at?: string
          http_status?: number | null
          id?: number
          job_id?: number | null
          last_job_id?: number | null
          last_seen_at?: string | null
          seen_count?: number
          sha256: string
          source: string
          storage_path: string
          url: string
        }
        Update: {
          bytes?: number
          content_type?: string | null
          fetched_at?: string
          http_status?: number | null
          id?: number
          job_id?: number | null
          last_job_id?: number | null
          last_seen_at?: string | null
          seen_count?: number
          sha256?: string
          source?: string
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_evidence_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ingest_jobs"
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
      signal_events: {
        Row: {
          area: string
          current_version: number
          event_id: string
          event_type: string
          family_id: string
          first_seen_at: string
          is_demo: boolean
          metric_id: string
          signal_date: string
          status: string
          updated_at: string
        }
        Insert: {
          area?: string
          current_version?: number
          event_id: string
          event_type: string
          family_id: string
          first_seen_at?: string
          is_demo?: boolean
          metric_id: string
          signal_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string
          current_version?: number
          event_id?: string
          event_type?: string
          family_id?: string
          first_seen_at?: string
          is_demo?: boolean
          metric_id?: string
          signal_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_events_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_versions: {
        Row: {
          advice: string | null
          change_kind: string
          created_at: string
          event_id: string
          evidence_ids: number[]
          id: number
          impact: Json | null
          new_date: string | null
          new_value: number | null
          prev_date: string | null
          prev_value: number | null
          quality: string
          reason: string | null
          rules: Json | null
          severity: string | null
          title: string | null
          version: number
        }
        Insert: {
          advice?: string | null
          change_kind: string
          created_at?: string
          event_id: string
          evidence_ids?: number[]
          id?: number
          impact?: Json | null
          new_date?: string | null
          new_value?: number | null
          prev_date?: string | null
          prev_value?: number | null
          quality: string
          reason?: string | null
          rules?: Json | null
          severity?: string | null
          title?: string | null
          version: number
        }
        Update: {
          advice?: string | null
          change_kind?: string
          created_at?: string
          event_id?: string
          evidence_ids?: number[]
          id?: number
          impact?: Json | null
          new_date?: string | null
          new_value?: number | null
          prev_date?: string | null
          prev_value?: number | null
          quality?: string
          reason?: string | null
          rules?: Json | null
          severity?: string | null
          title?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "signal_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "signal_events"
            referencedColumns: ["event_id"]
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
      social_posts: {
        Row: {
          ai_reason: string | null
          area: string | null
          evidence_id: number | null
          id: number
          is_bkk: boolean | null
          post_id: string
          posted_at: string
          received_at: string
          source: string
          summary: string | null
          text: string
          url: string
        }
        Insert: {
          ai_reason?: string | null
          area?: string | null
          evidence_id?: number | null
          id?: number
          is_bkk?: boolean | null
          post_id: string
          posted_at: string
          received_at?: string
          source: string
          summary?: string | null
          text: string
          url: string
        }
        Update: {
          ai_reason?: string | null
          area?: string | null
          evidence_id?: number | null
          id?: number
          is_bkk?: boolean | null
          post_id?: string
          posted_at?: string
          received_at?: string
          source?: string
          summary?: string | null
          text?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "raw_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      source_registry: {
        Row: {
          area: string
          cadence: string
          channel: string
          licence: string
          owner: string
          sort: number
          source: string
          stale_after_days: number
          unit: string
          url: string | null
        }
        Insert: {
          area?: string
          cadence: string
          channel: string
          licence?: string
          owner: string
          sort?: number
          source: string
          stale_after_days?: number
          unit?: string
          url?: string | null
        }
        Update: {
          area?: string
          cadence?: string
          channel?: string
          licence?: string
          owner?: string
          sort?: number
          source?: string
          stale_after_days?: number
          unit?: string
          url?: string | null
        }
        Relationships: []
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
      tax_deadlines: {
        Row: {
          channel: string
          due_date: string
          fetched_at: string
          id: number
          items: string[]
          source_url: string
        }
        Insert: {
          channel: string
          due_date: string
          fetched_at?: string
          id?: number
          items?: string[]
          source_url: string
        }
        Update: {
          channel?: string
          due_date?: string
          fetched_at?: string
          id?: number
          items?: string[]
          source_url?: string
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
      weather_station_obs: {
        Row: {
          descr: string | null
          dist_km: number | null
          id: number
          kind: string
          name: string
          obs_date: string
          obs_time: string | null
          rain_pct: number | null
          rain24: number | null
          received_at: string
          source_url: string
          station_id: string
          temp: number | null
          tmin: number | null
        }
        Insert: {
          descr?: string | null
          dist_km?: number | null
          id?: number
          kind: string
          name: string
          obs_date: string
          obs_time?: string | null
          rain_pct?: number | null
          rain24?: number | null
          received_at?: string
          source_url: string
          station_id: string
          temp?: number | null
          tmin?: number | null
        }
        Update: {
          descr?: string | null
          dist_km?: number | null
          id?: number
          kind?: string
          name?: string
          obs_date?: string
          obs_time?: string | null
          rain_pct?: number | null
          rain24?: number | null
          received_at?: string
          source_url?: string
          station_id?: string
          temp?: number | null
          tmin?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_ingest_job: {
        Args: never
        Returns: {
          attempts: number
          batch_id: string
          created_at: string
          error: string | null
          finished_at: string | null
          id: number
          job_type: string
          locked_until: string | null
          max_attempts: number
          rows: number
          run_after: string
          run_kind: string
          source: string
          started_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ingest_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      detect_core: {
        Args: { _cutoff?: string; _d: string }
        Returns: {
          change_abs: number
          change_pct: number
          checks: Json
          family_id: string
          has_obs: boolean
          is_demo: boolean
          metric_id: string
          new_value: number
          prev_value: number
          severity: string
          title: string
        }[]
      }
      detect_signals: { Args: { _d: string }; Returns: number }
      family_evidence_source: { Args: { _family: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hit_rate_limit: {
        Args: { _bucket: string; _limit: number }
        Returns: boolean
      }
      rank_signals: { Args: { _d: string }; Returns: number }
      replay_signals: {
        Args: { _d: string }
        Returns: {
          is_demo: boolean
          metric_id: string
          new_value: number
          prev_value: number
          severity: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
