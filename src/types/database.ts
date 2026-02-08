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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_sources: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          last_scraped_at: string | null
          name: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          name: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          name?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      bulletin_analyses: {
        Row: {
          created_at: string
          extracted_data: Json
          file_name: string | null
          file_type: string
          file_url: string
          id: string
          semester: string
          student_id: string
        }
        Insert: {
          created_at?: string
          extracted_data: Json
          file_name?: string | null
          file_type: string
          file_url: string
          id?: string
          semester?: string
          student_id: string
        }
        Update: {
          created_at?: string
          extracted_data?: Json
          file_name?: string | null
          file_type?: string
          file_url?: string
          id?: string
          semester?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_analyses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          drawing_data: Json | null
          has_drawing: boolean
          id: string
          role: string
          session_id: string
          timestamp: string
        }
        Insert: {
          content: string
          drawing_data?: Json | null
          has_drawing?: boolean
          id?: string
          role: string
          session_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          drawing_data?: Json | null
          has_drawing?: boolean
          id?: string
          role?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum: {
        Row: {
          chapter_name: string
          created_at: string
          id: string
          order_index: number
          source: string
          status: string
          student_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          chapter_name: string
          created_at?: string
          id?: string
          order_index?: number
          source?: string
          status?: string
          student_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          chapter_name?: string
          created_at?: string
          id?: string
          order_index?: number
          source?: string
          status?: string
          student_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification: {
        Row: {
          artifacts_collected: Json
          avatar_equipment: Json
          created_at: string
          id: string
          rank: string
          student_id: string
          temple_evolution_stage: number
          updated_at: string
          xp: number
        }
        Insert: {
          artifacts_collected?: Json
          avatar_equipment?: Json
          created_at?: string
          id?: string
          rank?: string
          student_id: string
          temple_evolution_stage?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          artifacts_collected?: Json
          avatar_equipment?: Json
          created_at?: string
          id?: string
          rank?: string
          student_id?: string
          temple_evolution_stage?: number
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          objective: string | null
          parent_id: string
          student_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          objective?: string | null
          parent_id: string
          student_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          objective?: string | null
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning: {
        Row: {
          city_zone: string
          created_at: string
          id: string
          intensified_vacation_mode: boolean
          missed_sessions_count: number
          student_id: string
          updated_at: string
          weekly_slots: Json
        }
        Insert: {
          city_zone: string
          created_at?: string
          id?: string
          intensified_vacation_mode?: boolean
          missed_sessions_count?: number
          student_id: string
          updated_at?: string
          weekly_slots?: Json
        }
        Update: {
          city_zone?: string
          created_at?: string
          id?: string
          intensified_vacation_mode?: boolean
          missed_sessions_count?: number
          student_id?: string
          updated_at?: string
          weekly_slots?: Json
        }
        Relationships: [
          {
            foreignKeyName: "planning_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          classe: string | null
          created_at: string
          daily_time_limit: number
          email: string
          full_name: string | null
          id: string
          is_approved: boolean
          parent_email: string | null
          parent_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          classe?: string | null
          created_at?: string
          daily_time_limit?: number
          email: string
          full_name?: string | null
          id: string
          is_approved?: boolean
          parent_email?: string | null
          parent_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          classe?: string | null
          created_at?: string
          daily_time_limit?: number
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          parent_email?: string | null
          parent_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_college_global: {
        Row: {
          chapter_name: string
          classe: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          source_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          chapter_name: string
          classe: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          source_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          chapter_name?: string
          classe?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          source_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_college_global_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "admin_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_downloads: {
        Row: {
          downloaded_at: string
          downloaded_by_id: string
          downloaded_by_role: string
          id: string
          student_id: string
        }
        Insert: {
          downloaded_at?: string
          downloaded_by_id: string
          downloaded_by_role: string
          id?: string
          student_id: string
        }
        Update: {
          downloaded_at?: string
          downloaded_by_id?: string
          downloaded_by_role?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_downloads_downloaded_by_id_fkey"
            columns: ["downloaded_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_downloads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_officiel_importe: {
        Row: {
          contenu_url: string | null
          cycle: string
          descriptif: string
          discipline: string
          entre_en_vigueur: string | null
          id: string
          imported_at: string
          student_id: string
          texte_officiel: string | null
        }
        Insert: {
          contenu_url?: string | null
          cycle: string
          descriptif: string
          discipline: string
          entre_en_vigueur?: string | null
          id?: string
          imported_at?: string
          student_id: string
          texte_officiel?: string | null
        }
        Update: {
          contenu_url?: string | null
          cycle?: string
          descriptif?: string
          discipline?: string
          entre_en_vigueur?: string | null
          id?: string
          imported_at?: string
          student_id?: string
          texte_officiel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_officiel_importe_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          artifacts_found: string[]
          canvas_snapshot: Json | null
          chapter: string | null
          created_at: string
          duration_minutes: number | null
          end_at: string | null
          id: string
          start_at: string
          student_id: string
          subject: string | null
          xp_earned: number
        }
        Insert: {
          artifacts_found?: string[]
          canvas_snapshot?: Json | null
          chapter?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          start_at?: string
          student_id: string
          subject?: string | null
          xp_earned?: number
        }
        Update: {
          artifacts_found?: string[]
          canvas_snapshot?: Json | null
          chapter?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          start_at?: string
          student_id?: string
          subject?: string | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_super_admin: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
