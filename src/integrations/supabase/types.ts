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
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_ngn: number
          created_at: string
          created_by: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          description: string | null
          due_date: string | null
          id: string
          issue_date: string
          job_id: string | null
          number: string
          paid_at: string | null
          paid_ngn: number
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount_ngn?: number
          created_at?: string
          created_by: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          job_id?: string | null
          number?: string
          paid_at?: string | null
          paid_ngn?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount_ngn?: number
          created_at?: string
          created_by?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          job_id?: string | null
          number?: string
          paid_at?: string | null
          paid_ngn?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_updates: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          job_id: string
          photo_data: string | null
          photo_mime: string | null
          photo_path: string | null
          status: Database["public"]["Enums"]["job_status"] | null
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          job_id: string
          photo_data?: string | null
          photo_mime?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string
          photo_data?: string | null
          photo_mime?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_updates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          assigned_to: string | null
          city: string | null
          code: string
          created_at: string
          created_by: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          parts_used: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service: Database["public"]["Enums"]["job_service"]
          signoff_at: string | null
          signoff_name: string | null
          signoff_note: string | null
          site_address: string
          state: string | null
          status: Database["public"]["Enums"]["job_status"]
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          code?: string
          created_at?: string
          created_by: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          parts_used?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service?: Database["public"]["Enums"]["job_service"]
          signoff_at?: string | null
          signoff_name?: string | null
          signoff_note?: string | null
          site_address: string
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          code?: string
          created_at?: string
          created_by?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          parts_used?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service?: Database["public"]["Enums"]["job_service"]
          signoff_at?: string | null
          signoff_name?: string | null
          signoff_note?: string | null
          site_address?: string
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          closed_at: string | null
          company: string | null
          created_at: string
          created_by: string
          customer_name: string
          email: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          service: Database["public"]["Enums"]["job_service"]
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
          value_ngn: number
        }
        Insert: {
          city?: string | null
          closed_at?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          customer_name: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          service?: Database["public"]["Enums"]["job_service"]
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          value_ngn?: number
        }
        Update: {
          city?: string | null
          closed_at?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          service?: Database["public"]["Enums"]["job_service"]
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          value_ngn?: number
        }
        Relationships: [
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          job_title: string | null
          phone: string | null
          policy_accepted_at: string | null
          status: Database["public"]["Enums"]["agent_status"]
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name?: string
          id: string
          job_title?: string | null
          phone?: string | null
          policy_accepted_at?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
          policy_accepted_at?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      bootstrap_profile: { Args: { _full_name: string }; Returns: undefined }
      can_see_job: { Args: { _job_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_auditor: { Args: { _user_id: string }; Returns: boolean }
      is_finance: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_action: {
        Args: { _action: string; _target: string }
        Returns: undefined
      }
      set_member_access: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _status: Database["public"]["Enums"]["agent_status"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      agent_status: "pending" | "active" | "suspended"
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "finance"
        | "hr"
        | "agent"
        | "auditor"
      invoice_status: "draft" | "sent" | "part_paid" | "paid" | "cancelled"
      job_service:
        | "survey"
        | "solar_install"
        | "iot_install"
        | "security_install"
        | "maintenance"
        | "repair"
        | "other"
      job_status:
        | "scheduled"
        | "en_route"
        | "on_site"
        | "blocked"
        | "completed"
        | "signed_off"
        | "cancelled"
      lead_stage: "new" | "contacted" | "quoted" | "won" | "lost"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "done"
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
      agent_status: ["pending", "active", "suspended"],
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "finance",
        "hr",
        "agent",
        "auditor",
      ],
      invoice_status: ["draft", "sent", "part_paid", "paid", "cancelled"],
      job_service: [
        "survey",
        "solar_install",
        "iot_install",
        "security_install",
        "maintenance",
        "repair",
        "other",
      ],
      job_status: [
        "scheduled",
        "en_route",
        "on_site",
        "blocked",
        "completed",
        "signed_off",
        "cancelled",
      ],
      lead_stage: ["new", "contacted", "quoted", "won", "lost"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "done"],
    },
  },
} as const
