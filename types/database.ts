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
      appointments: {
        Row: {
          assigned_advisor_id: string | null
          attended_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          lead_id: string
          notes: string | null
          reminder_sent: boolean
          scheduled_at: string
          service_type_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          assigned_advisor_id?: string | null
          attended_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id: string
          notes?: string | null
          reminder_sent?: boolean
          scheduled_at: string
          service_type_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          assigned_advisor_id?: string | null
          attended_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id?: string
          notes?: string | null
          reminder_sent?: boolean
          scheduled_at?: string
          service_type_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_assigned_advisor_id_fkey"
            columns: ["assigned_advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      document_sequences: {
        Row: {
          last_value: number
          padding: number
          period_year: number
          prefix: string
          updated_at: string
        }
        Insert: {
          last_value?: number
          padding?: number
          period_year: number
          prefix: string
          updated_at?: string
        }
        Update: {
          last_value?: number
          padding?: number
          period_year?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          created_by: string | null
          document_number: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_boxes: {
        Row: {
          box_number: number
          closed_at: string | null
          cost_center_id: string | null
          created_at: string
          id: string
          name: string | null
          notes: string | null
          opened_at: string
          opened_by: string
          reimbursed_at: string | null
          status: Database["public"]["Enums"]["petty_cash_status"]
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          box_number?: number
          closed_at?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          opened_at?: string
          opened_by?: string
          reimbursed_at?: string | null
          status?: Database["public"]["Enums"]["petty_cash_status"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          box_number?: number
          closed_at?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          opened_at?: string
          opened_by?: string
          reimbursed_at?: string | null
          status?: Database["public"]["Enums"]["petty_cash_status"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_boxes_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_boxes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_boxes_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_entries: {
        Row: {
          box_id: string
          concept: string
          created_at: string
          created_by: string
          entry_date: string
          entry_type: string | null
          id: string
          invoice_number: string | null
          legacy_drive_url: string | null
          receipt_url: string | null
          status: string
          supplier_document: string | null
          supplier_name: string
          support_sha256: string | null
          support_storage_path: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          box_id: string
          concept: string
          created_at?: string
          created_by?: string
          entry_date: string
          entry_type?: string | null
          id?: string
          invoice_number?: string | null
          legacy_drive_url?: string | null
          receipt_url?: string | null
          status?: string
          supplier_document?: string | null
          supplier_name: string
          support_sha256?: string | null
          support_storage_path?: string | null
          tax_amount?: number
          total_amount: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          box_id?: string
          concept?: string
          created_at?: string
          created_by?: string
          entry_date?: string
          entry_type?: string | null
          id?: string
          invoice_number?: string | null
          legacy_drive_url?: string | null
          receipt_url?: string | null
          status?: string
          supplier_document?: string | null
          supplier_name?: string
          support_sha256?: string | null
          support_storage_path?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_entries_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_box_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_entries_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_entries_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          concept: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          legacy_drive_url: string | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          purchase_number: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string | null
          supplier_name: string | null
          support_sha256: string | null
          support_storage_path: string | null
          tax_iva: number
          total: number
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          withholding_tax: number
        }
        Insert: {
          amount: number
          concept: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          legacy_drive_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          purchase_number?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          support_sha256?: string | null
          support_storage_path?: string | null
          tax_iva?: number
          total: number
          transaction_date: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withholding_tax?: number
        }
        Update: {
          amount?: number
          concept?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          legacy_drive_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          purchase_number?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          support_sha256?: string | null
          support_storage_path?: string | null
          tax_iva?: number
          total?: number
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withholding_tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          sale_id: string
          service_type_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          sale_id: string
          service_type_id?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sale_id?: string
          service_type_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          appointment_id: string | null
          closed_by: string | null
          created_at: string
          discount: number
          id: string
          lead_id: string
          legacy_drive_url: string | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_url: string | null
          sale_number: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          support_sha256: string | null
          support_storage_path: string | null
          tax: number
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          closed_by?: string | null
          created_at?: string
          discount?: number
          id?: string
          lead_id: string
          legacy_drive_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
          sale_number?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          support_sha256?: string | null
          support_storage_path?: string | null
          tax?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          closed_by?: string | null
          created_at?: string
          discount?: number
          id?: string
          lead_id?: string
          legacy_drive_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
          sale_number?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          support_sha256?: string | null
          support_storage_path?: string | null
          tax?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          base_price: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          document_number: string | null
          dv: string | null
          email: string | null
          has_rut: boolean
          id: string
          is_active: boolean
          is_billing_obligated: boolean
          is_occasional: boolean
          name: string
          nit_normalized: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          document_number?: string | null
          dv?: string | null
          email?: string | null
          has_rut?: boolean
          id?: string
          is_active?: boolean
          is_billing_obligated?: boolean
          is_occasional?: boolean
          name: string
          nit_normalized?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          document_number?: string | null
          dv?: string | null
          email?: string | null
          has_rut?: boolean
          id?: string
          is_active?: boolean
          is_billing_obligated?: boolean
          is_occasional?: boolean
          name?: string
          nit_normalized?: string | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      kpi_daily: {
        Row: {
          appointments_attended: number | null
          appointments_scheduled: number | null
          attendance_rate: number | null
          average_ticket: number | null
          conversion_rate: number | null
          date: string | null
          net_cashflow: number | null
          purchases_total: number | null
          sales_count: number | null
          sales_total: number | null
        }
        Relationships: []
      }
      petty_cash_box_summary: {
        Row: {
          balance: number | null
          box_number: number | null
          closed_at: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          id: string | null
          last_entry_date: string | null
          name: string | null
          opened_at: string | null
          opened_by: string | null
          opened_by_name: string | null
          reimbursed_at: string | null
          status: Database["public"]["Enums"]["petty_cash_status"] | null
          total_entries: number | null
          total_income: number | null
          total_spent: number | null
          total_tax: number | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_boxes_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_boxes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_entries_full: {
        Row: {
          box_id: string | null
          box_number: number | null
          concept: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          entry_date: string | null
          entry_type: string | null
          id: string | null
          invoice_number: string | null
          legacy_drive_url: string | null
          receipt_url: string | null
          status: string | null
          supplier_document: string | null
          supplier_name: string | null
          support_sha256: string | null
          support_storage_path: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_boxes_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_entries_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_box_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_entries_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_entries_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_dian_dv: { Args: { p_nit: string }; Returns: number }
      create_test_user: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: { allowed_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      kpi_for_date: {
        Args: { target_date: string }
        Returns: {
          appointments_attended: number
          appointments_scheduled: number
          attendance_rate: number
          average_ticket: number
          conversion_rate: number
          date: string
          net_cashflow: number
          purchases_total: number
          sales_count: number
          sales_total: number
        }[]
      }
      next_document_number: {
        Args: { p_padding?: number; p_prefix: string; p_year?: number }
        Returns: string
      }
      search_suppliers_smart: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          address: string
          document_number: string
          dv: string
          email: string
          id: string
          is_active: boolean
          is_occasional: boolean
          match_type: string
          name: string
          nit_normalized: string
          phone: string
          score: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      appointment_status:
        | "agendada"
        | "en_curso"
        | "reprogramada"
        | "cancelada"
        | "atendida"
      payment_method:
        | "efectivo"
        | "transferencia"
        | "tarjeta"
        | "nequi"
        | "daviplata"
        | "pse"
        | "otro"
      petty_cash_status: "abierta" | "cerrada" | "reembolsada" | "anulada"
      purchase_status: "pendiente_pago" | "pagado" | "anulado"
      sale_status: "cotizacion" | "pendiente_pago" | "pagada" | "anulada"
      transaction_type: "costo_gasto" | "inversion" | "otro"
      user_role: "admin" | "asesor" | "tesoreria"
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
      appointment_status: [
        "agendada",
        "en_curso",
        "reprogramada",
        "cancelada",
        "atendida",
      ],
      payment_method: [
        "efectivo",
        "transferencia",
        "tarjeta",
        "nequi",
        "daviplata",
        "pse",
        "otro",
      ],
      petty_cash_status: ["abierta", "cerrada", "reembolsada", "anulada"],
      purchase_status: ["pendiente_pago", "pagado", "anulado"],
      sale_status: ["cotizacion", "pendiente_pago", "pagada", "anulada"],
      transaction_type: ["costo_gasto", "inversion", "otro"],
      user_role: ["admin", "asesor", "tesoreria"],
    },
  },
} as const
