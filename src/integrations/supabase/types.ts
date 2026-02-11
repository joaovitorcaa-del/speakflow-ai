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
      audio_recordings: {
        Row: {
          challenge_completion_id: string | null
          created_at: string
          duration_seconds: number
          id: string
          recording_type: string
          storage_path: string
          user_id: string
        }
        Insert: {
          challenge_completion_id?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          recording_type: string
          storage_path: string
          user_id: string
        }
        Update: {
          challenge_completion_id?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          recording_type?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_recordings_challenge_completion_id_fkey"
            columns: ["challenge_completion_id"]
            isOneToOne: false
            referencedRelation: "challenge_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_completions: {
        Row: {
          challenge_topic: string
          challenge_type: string
          clarity_score: number | null
          completed_at: string
          feedback_text: string | null
          fluency_score: number | null
          id: string
          pronunciation_score: number | null
          speaking_duration_seconds: number
          user_id: string
        }
        Insert: {
          challenge_topic: string
          challenge_type: string
          clarity_score?: number | null
          completed_at?: string
          feedback_text?: string | null
          fluency_score?: number | null
          id?: string
          pronunciation_score?: number | null
          speaking_duration_seconds?: number
          user_id: string
        }
        Update: {
          challenge_topic?: string
          challenge_type?: string
          clarity_score?: number | null
          completed_at?: string
          feedback_text?: string | null
          fluency_score?: number | null
          id?: string
          pronunciation_score?: number | null
          speaking_duration_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      challenge_sessions: {
        Row: {
          completed: boolean
          created_at: string
          current_index: number
          current_step: string
          date: string
          id: string
          speaking_seconds: number | null
          steps_completed: Json | null
          transcriptions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_index?: number
          current_step?: string
          date?: string
          id?: string
          speaking_seconds?: number | null
          steps_completed?: Json | null
          transcriptions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_index?: number
          current_step?: string
          date?: string
          id?: string
          speaking_seconds?: number | null
          steps_completed?: Json | null
          transcriptions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_progress: {
        Row: {
          challenge_completed: boolean
          clarity_score: number | null
          created_at: string
          date: string
          fluency_score: number | null
          id: string
          pronunciation_score: number | null
          speaking_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_completed?: boolean
          clarity_score?: number | null
          created_at?: string
          date?: string
          fluency_score?: number | null
          id?: string
          pronunciation_score?: number | null
          speaking_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_completed?: boolean
          clarity_score?: number | null
          created_at?: string
          date?: string
          fluency_score?: number | null
          id?: string
          pronunciation_score?: number | null
          speaking_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number
          display_name: string | null
          goal: string | null
          id: string
          level: string | null
          longest_streak: number
          total_challenges_completed: number
          total_speaking_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          goal?: string | null
          id?: string
          level?: string | null
          longest_streak?: number
          total_challenges_completed?: number
          total_speaking_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          goal?: string | null
          id?: string
          level?: string | null
          longest_streak?: number
          total_challenges_completed?: number
          total_speaking_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vocabulary_words: {
        Row: {
          context_theme: string | null
          created_at: string
          example_phrase: string
          explanation: string
          id: string
          is_confident: boolean
          learned_at: string | null
          pronunciation_url: string | null
          updated_at: string
          user_id: string
          word: string
        }
        Insert: {
          context_theme?: string | null
          created_at?: string
          example_phrase: string
          explanation: string
          id?: string
          is_confident?: boolean
          learned_at?: string | null
          pronunciation_url?: string | null
          updated_at?: string
          user_id: string
          word: string
        }
        Update: {
          context_theme?: string | null
          created_at?: string
          example_phrase?: string
          explanation?: string
          id?: string
          is_confident?: boolean
          learned_at?: string | null
          pronunciation_url?: string | null
          updated_at?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_user_streak: { Args: { p_user_id: string }; Returns: undefined }
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
