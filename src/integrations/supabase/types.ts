export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audio_purchases: {
        Row: {
          amount_cents: number | null
          audio_id: string
          id: string
          purchased_at: string | null
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          audio_id: string
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          audio_id?: string
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_purchases_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "book_audio"
            referencedColumns: ["id"]
          },
        ]
      }
      book_audio: {
        Row: {
          book_id: string
          created_at: string | null
          duration_seconds: number | null
          file_url: string
          id: string
          is_enabled: boolean | null
          price_cents: number | null
          sort_order: number | null
          title: string
          type: Database["public"]["Enums"]["audio_type"]
          updated_at: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          duration_seconds?: number | null
          file_url: string
          id?: string
          is_enabled?: boolean | null
          price_cents?: number | null
          sort_order?: number | null
          title: string
          type: Database["public"]["Enums"]["audio_type"]
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          file_url?: string
          id?: string
          is_enabled?: boolean | null
          price_cents?: number | null
          sort_order?: number | null
          title?: string
          type?: Database["public"]["Enums"]["audio_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_audio_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          chapter_id: string
          created_at: string | null
          id: string
          note: string | null
          position: number
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          position: number
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          metadata: Json | null
          preview_chapters: number | null
          price_cents: number
          published_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          preview_chapters?: number | null
          price_cents?: number
          published_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          preview_chapters?: number | null
          price_cents?: number
          published_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_id: string
          chapter_order: number
          content: string | null
          created_at: string | null
          id: string
          is_preview: boolean | null
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          book_id: string
          chapter_order: number
          content?: string | null
          created_at?: string | null
          id?: string
          is_preview?: boolean | null
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          book_id?: string
          chapter_order?: number
          content?: string | null
          created_at?: string | null
          id?: string
          is_preview?: boolean | null
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          chapter_id: string
          color: string | null
          created_at: string | null
          end_position: number
          id: string
          note: string | null
          start_position: number
          text_content: string | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          color?: string | null
          created_at?: string | null
          end_position: number
          id?: string
          note?: string | null
          start_position: number
          text_content?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          color?: string | null
          created_at?: string | null
          end_position?: number
          id?: string
          note?: string | null
          start_position?: number
          text_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["inquiry_status"] | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"] | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"] | null
          subject?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          referral_code: string | null
          referral_credits: number | null
          referred_by: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          referral_code?: string | null
          referral_credits?: number | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          referral_code?: string | null
          referral_credits?: number | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_cents: number | null
          book_id: string
          id: string
          purchased_at: string | null
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          book_id: string
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          book_id?: string
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          chapter_id: string | null
          id: string
          last_read_at: string | null
          progress_percent: number | null
          total_time_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id?: string | null
          id?: string
          last_read_at?: string | null
          progress_percent?: number | null
          total_time_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string | null
          id?: string
          last_read_at?: string | null
          progress_percent?: number | null
          total_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          credited_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: Database["public"]["Enums"]["referral_status"] | null
        }
        Insert: {
          created_at?: string | null
          credited_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: Database["public"]["Enums"]["referral_status"] | null
        }
        Update: {
          created_at?: string | null
          credited_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: Database["public"]["Enums"]["referral_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      audio_type: "audiobook" | "soundtrack"
      inquiry_status: "unread" | "read" | "replied" | "resolved"
      referral_status: "pending" | "credited" | "expired"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
      audio_type: ["audiobook", "soundtrack"],
      inquiry_status: ["unread", "read", "replied", "resolved"],
      referral_status: ["pending", "credited", "expired"],
    },
  },
} as const

