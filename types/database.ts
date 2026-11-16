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
      accounting_settings: {
        Row: {
          aprobo_name: string
          company_name: string
          company_nit: string
          id: number
          reviso_name: string
          updated_at: string
        }
        Insert: {
          aprobo_name?: string
          company_name?: string
          company_nit?: string
          id?: number
          reviso_name?: string
          updated_at?: string
        }
        Update: {
          aprobo_name?: string
          company_name?: string
          company_nit?: string
          id?: number
          reviso_name?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      chart_of_accounts: {
        Row: {
          account_class: number
          code: string
          created_at: string
          default_tax_concept: string | null
          is_active: boolean
          is_postable: boolean
          keywords: string[]
          level: string
          name: string
          nature: string
          parent_code: string | null
          requires_cost_center: boolean
          requires_third_party: boolean
        }
        Insert: {
          account_class: number
          code: string
          created_at?: string
          default_tax_concept?: string | null
          is_active?: boolean
          is_postable?: boolean
          keywords?: string[]
          level: string
          name: string
          nature: string
          parent_code?: string | null
          requires_cost_center?: boolean
          requires_third_party?: boolean
        }
        Update: {
          account_class?: number
          code?: string
          created_at?: string
          default_tax_concept?: string | null
          is_active?: boolean
          is_postable?: boolean
          keywords?: string[]
          level?: string
          name?: string
          nature?: string
          parent_code?: string | null
          requires_cost_center?: boolean
          requires_third_party?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
      }
      classification_feedback: {
        Row: {
          concept: string
          confirmed_account_code: string
          corrected_by: string | null
          cost_center_id: string | null
          created_at: string
          created_rule_id: string | null
          entry_id: string | null
          id: string
          nit_normalized: string | null
          previous_account_code: string | null
          source_id: string | null
          source_table: string | null
          third_party_id: string | null
        }
        Insert: {
          concept: string
          confirmed_account_code: string
          corrected_by?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_rule_id?: string | null
          entry_id?: string | null
          id?: string
          nit_normalized?: string | null
          previous_account_code?: string | null
          source_id?: string | null
          source_table?: string | null
          third_party_id?: string | null
        }
        Update: {
          concept?: string
          confirmed_account_code?: string
          corrected_by?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_rule_id?: string | null
          entry_id?: string | null
          id?: string
          nit_normalized?: string | null
          previous_account_code?: string | null
          source_id?: string | null
          source_table?: string | null
          third_party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classification_feedback_confirmed_account_code_fkey"
            columns: ["confirmed_account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "classification_feedback_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_feedback_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_feedback_created_rule_id_fkey"
            columns: ["created_rule_id"]
            isOneToOne: false
            referencedRelation: "posting_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_feedback_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_feedback_previous_account_code_fkey"
            columns: ["previous_account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "classification_feedback_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          accounting_class: number
          center_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          accounting_class?: number
          center_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          accounting_class?: number
          center_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      document_ingestions: {
        Row: {
          cc_entry_id: string | null
          ce_entry_id: string | null
          concept: string | null
          confidence: number
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          cufe: string | null
          document_type: string
          extracted_data: Json
          id: string
          invoice_number: string | null
          issue_date: string | null
          purchase_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sha256: string
          source: string
          status: string
          storage_path: string
          subtotal: number
          suggested_account_code: string | null
          supplier_dv: string | null
          supplier_name: string | null
          supplier_nit: string | null
          tax_iva: number
          third_party_id: string | null
          total: number
          updated_at: string
          warnings: string[]
          withholding_tax: number
        }
        Insert: {
          cc_entry_id?: string | null
          ce_entry_id?: string | null
          concept?: string | null
          confidence?: number
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          cufe?: string | null
          document_type?: string
          extracted_data?: Json
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          purchase_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sha256: string
          source?: string
          status?: string
          storage_path: string
          subtotal?: number
          suggested_account_code?: string | null
          supplier_dv?: string | null
          supplier_name?: string | null
          supplier_nit?: string | null
          tax_iva?: number
          third_party_id?: string | null
          total?: number
          updated_at?: string
          warnings?: string[]
          withholding_tax?: number
        }
        Update: {
          cc_entry_id?: string | null
          ce_entry_id?: string | null
          concept?: string | null
          confidence?: number
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          cufe?: string | null
          document_type?: string
          extracted_data?: Json
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          purchase_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sha256?: string
          source?: string
          status?: string
          storage_path?: string
          subtotal?: number
          suggested_account_code?: string | null
          supplier_dv?: string | null
          supplier_name?: string | null
          supplier_nit?: string | null
          tax_iva?: number
          third_party_id?: string | null
          total?: number
          updated_at?: string
          warnings?: string[]
          withholding_tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_ingestions_cc_entry_id_fkey"
            columns: ["cc_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestions_ce_entry_id_fkey"
            columns: ["ce_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingestions_suggested_account_code_fkey"
            columns: ["suggested_account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "document_ingestions_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
        ]
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
      expense_categories: {
        Row: {
          ai_hint: string | null
          created_at: string
          id: string
          is_active: boolean
          is_deductible: boolean
          name: string
          obra_account: string | null
          office_account: string
          payable_account: string
          slug: string
          sort_order: number
          updated_at: string
          withholding_account: string
        }
        Insert: {
          ai_hint?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_deductible?: boolean
          name: string
          obra_account?: string | null
          office_account: string
          payable_account?: string
          slug: string
          sort_order?: number
          updated_at?: string
          withholding_account?: string
        }
        Update: {
          ai_hint?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_deductible?: boolean
          name?: string
          obra_account?: string | null
          office_account?: string
          payable_account?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          withholding_account?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_obra_account_fkey"
            columns: ["obra_account"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "expense_categories_office_account_fkey"
            columns: ["office_account"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "expense_categories_payable_account_fkey"
            columns: ["payable_account"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "expense_categories_withholding_account_fkey"
            columns: ["withholding_account"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
      }
      journal_entries: {
        Row: {
          ai_confidence: number
          ai_rationale: string | null
          aprobo_name: string
          concept: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          duplicate_of: string | null
          elaboro_name: string
          entry_date: string
          entry_number: string
          entry_type: string
          id: string
          is_personal_expense: boolean
          is_possible_asset: boolean
          is_third_party_support: boolean
          linked_entry_id: string | null
          missing_withholding: boolean
          needs_review: boolean
          posted_at: string | null
          posted_by: string | null
          reversed_entry_id: string | null
          reviso_name: string
          source_id: string
          source_table: string
          status: string
          support_url: string | null
          third_party_id: string | null
          total_credit: number
          total_debit: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          withholding_applied: number
          withholding_expected: number
        }
        Insert: {
          ai_confidence?: number
          ai_rationale?: string | null
          aprobo_name?: string
          concept: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_of?: string | null
          elaboro_name?: string
          entry_date: string
          entry_number: string
          entry_type: string
          id?: string
          is_personal_expense?: boolean
          is_possible_asset?: boolean
          is_third_party_support?: boolean
          linked_entry_id?: string | null
          missing_withholding?: boolean
          needs_review?: boolean
          posted_at?: string | null
          posted_by?: string | null
          reversed_entry_id?: string | null
          reviso_name?: string
          source_id: string
          source_table: string
          status?: string
          support_url?: string | null
          third_party_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withholding_applied?: number
          withholding_expected?: number
        }
        Update: {
          ai_confidence?: number
          ai_rationale?: string | null
          aprobo_name?: string
          concept?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_of?: string | null
          elaboro_name?: string
          entry_date?: string
          entry_number?: string
          entry_type?: string
          id?: string
          is_personal_expense?: boolean
          is_possible_asset?: boolean
          is_third_party_support?: boolean
          linked_entry_id?: string | null
          missing_withholding?: boolean
          needs_review?: boolean
          posted_at?: string | null
          posted_by?: string | null
          reversed_entry_id?: string | null
          reviso_name?: string
          source_id?: string
          source_table?: string
          status?: string
          support_url?: string | null
          third_party_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withholding_applied?: number
          withholding_expected?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_linked_entry_id_fkey"
            columns: ["linked_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_entry_id_fkey"
            columns: ["reversed_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_code: string
          base_amount: number
          cost_center_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
          is_deductible: boolean
          line_order: number
          third_party_id: string | null
        }
        Insert: {
          account_code: string
          base_amount?: number
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
          is_deductible?: boolean
          line_order?: number
          third_party_id?: string | null
        }
        Update: {
          account_code?: string
          base_amount?: number
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
          is_deductible?: boolean
          line_order?: number
          third_party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "journal_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
        ]
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
      payment_accounts: {
        Row: {
          account_code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
        }
        Insert: {
          account_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
        }
        Update: {
          account_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
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
          category_id: string | null
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
          third_party_id: string | null
          total_amount: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          box_id: string
          category_id?: string | null
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
          third_party_id?: string | null
          total_amount: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          box_id?: string
          category_id?: string | null
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
          third_party_id?: string | null
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
            foreignKeyName: "petty_cash_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
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
            foreignKeyName: "petty_cash_entries_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
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
      posting_rules: {
        Row: {
          account_class: number | null
          cost_center_id: string | null
          created_at: string
          credit_account_code: string | null
          debit_account_code: string
          id: string
          is_active: boolean
          is_deductible: boolean
          keyword_pattern: string
          mark_personal: boolean
          mark_possible_asset: boolean
          mark_third_party_support: boolean
          name: string
          nit_normalized: string | null
          priority: number
          source: string
          tax_concept: string | null
        }
        Insert: {
          account_class?: number | null
          cost_center_id?: string | null
          created_at?: string
          credit_account_code?: string | null
          debit_account_code: string
          id?: string
          is_active?: boolean
          is_deductible?: boolean
          keyword_pattern: string
          mark_personal?: boolean
          mark_possible_asset?: boolean
          mark_third_party_support?: boolean
          name: string
          nit_normalized?: string | null
          priority?: number
          source?: string
          tax_concept?: string | null
        }
        Update: {
          account_class?: number | null
          cost_center_id?: string | null
          created_at?: string
          credit_account_code?: string | null
          debit_account_code?: string
          id?: string
          is_active?: boolean
          is_deductible?: boolean
          keyword_pattern?: string
          mark_personal?: boolean
          mark_possible_asset?: boolean
          mark_third_party_support?: boolean
          name?: string
          nit_normalized?: string | null
          priority?: number
          source?: string
          tax_concept?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posting_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_rules_credit_account_code_fkey"
            columns: ["credit_account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "posting_rules_debit_account_code_fkey"
            columns: ["debit_account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
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
          category_id: string | null
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
          third_party_id: string | null
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
          category_id?: string | null
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
          third_party_id?: string | null
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
          category_id?: string | null
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
          third_party_id?: string | null
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
            foreignKeyName: "purchases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "purchases_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
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
          applies_iva: boolean
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
          third_party_id: string | null
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          withholding_tax: number
        }
        Insert: {
          applies_iva?: boolean
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
          third_party_id?: string | null
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withholding_tax?: number
        }
        Update: {
          applies_iva?: boolean
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
          third_party_id?: string | null
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withholding_tax?: number
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
            foreignKeyName: "sales_third_party_id_fkey"
            columns: ["third_party_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
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
      tax_parameters: {
        Row: {
          account_code: string
          concept: string
          created_at: string
          id: string
          is_active: boolean
          min_base_cop: number
          min_base_uvt: number
          notes: string | null
          rate_pct: number
          uvt_value: number
          valid_from: string
          valid_to: string
          year: number
        }
        Insert: {
          account_code: string
          concept: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_base_cop: number
          min_base_uvt: number
          notes?: string | null
          rate_pct: number
          uvt_value?: number
          valid_from: string
          valid_to: string
          year?: number
        }
        Update: {
          account_code?: string
          concept?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_base_cop?: number
          min_base_uvt?: number
          notes?: string | null
          rate_pct?: number
          uvt_value?: number
          valid_from?: string
          valid_to?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_parameters_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
      }
      third_parties: {
        Row: {
          address: string | null
          created_at: string
          default_account_code: string | null
          document_number: string | null
          document_type: string
          dv: string | null
          email: string | null
          has_rut: boolean
          id: string
          is_active: boolean
          is_billing_obligated: boolean
          is_dv_valid: boolean
          is_occasional: boolean
          legacy_supplier_id: string | null
          merged_supplier_ids: string[]
          name: string
          nit_normalized: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_account_code?: string | null
          document_number?: string | null
          document_type?: string
          dv?: string | null
          email?: string | null
          has_rut?: boolean
          id?: string
          is_active?: boolean
          is_billing_obligated?: boolean
          is_dv_valid?: boolean
          is_occasional?: boolean
          legacy_supplier_id?: string | null
          merged_supplier_ids?: string[]
          name: string
          nit_normalized?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          default_account_code?: string | null
          document_number?: string | null
          document_type?: string
          dv?: string | null
          email?: string | null
          has_rut?: boolean
          id?: string
          is_active?: boolean
          is_billing_obligated?: boolean
          is_dv_valid?: boolean
          is_occasional?: boolean
          legacy_supplier_id?: string | null
          merged_supplier_ids?: string[]
          name?: string
          nit_normalized?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "third_parties_default_account_code_fkey"
            columns: ["default_account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
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
      v_kc_operaciones: {
        Row: {
          aprobado_en: string | null
          base: number | null
          categoria: string | null
          category_id: string | null
          cc_id: string | null
          cc_number: string | null
          ce_id: string | null
          ce_number: string | null
          centro_costo: string | null
          concepto: string | null
          cost_center_id: string | null
          descuadrado: boolean | null
          estado: string | null
          estado_origen: string | null
          factura: string | null
          fecha: string | null
          fecha_revisar: boolean | null
          iva: number | null
          orden: string | null
          posible_duplicado: boolean | null
          referencia: string | null
          retencion: number | null
          sin_soporte: boolean | null
          soporte: string | null
          source_id: string | null
          source_table: string | null
          tercero: string | null
          tipo_caja: string | null
          total: number | null
        }
        Relationships: []
      }
      v_pendientes_legales: {
        Row: {
          amount: number | null
          concept: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          detalle: string | null
          document_ref: string | null
          motivo: string | null
          record_date: string | null
          source_id: string | null
          source_table: string | null
          third_party_id: string | null
          third_party_name: string | null
          third_party_nit: string | null
        }
        Relationships: []
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
      kc_approve_entries: { Args: { p_ids: string[] }; Returns: number }
      kc_balance_prueba: {
        Args: { p_from: string; p_only_approved?: boolean; p_to: string }
        Returns: {
          account_code: string
          account_name: string
          balance: number
          credit: number
          debit: number
        }[]
      }
      kc_category_account: {
        Args: { p_category: string; p_class: number }
        Returns: string
      }
      kc_ensure_third_party: { Args: { p_supplier: string }; Returns: string }
      kc_next_entry_number: { Args: { p_type: string }; Returns: string }
      kc_post_petty_cash: { Args: { p_entry: string }; Returns: undefined }
      kc_post_purchase: { Args: { p_purchase: string }; Returns: undefined }
      kc_post_sale: { Args: { p_sale: string }; Returns: undefined }
      kc_upsert_entry: {
        Args: {
          p_concept: string
          p_cost_center: string
          p_date: string
          p_lines: Json
          p_source_id: string
          p_source_table: string
          p_support: string
          p_third_party: string
          p_type: string
          p_user: string
        }
        Returns: string
      }
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

