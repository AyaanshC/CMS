
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_logs": {
                  Row: {
                    "actor_id": string | null,"client_id": string | null,"created_at": string,"description": string,"id": string,"project_id": string | null,"title": string,"type": Database["public"]['Enums']["activity_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"project_id"?: string | null,"title": string,"type": Database["public"]['Enums']["activity_type"]
                  }
                  Update: {
                    "actor_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"project_id"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["activity_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_logs_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_logs_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"alerts": {
                  Row: {
                    "acknowledged_at": string | null,"acknowledged_by": string | null,"body": string,"created_at": string,"dedupe_key": string,"email_error": string | null,"email_status": string,"id": string,"invoice_id": string | null,"kind": string,"link": string | null,"project_id": string | null,"recipient_email": string | null,"recipient_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"acknowledged_by"?: string | null,"body": string,"created_at"?: string,"dedupe_key": string,"email_error"?: string | null,"email_status"?: string,"id"?: string,"invoice_id"?: string | null,"kind": string,"link"?: string | null,"project_id"?: string | null,"recipient_email"?: string | null,"recipient_id"?: string | null,"title": string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"acknowledged_by"?: string | null,"body"?: string,"created_at"?: string,"dedupe_key"?: string,"email_error"?: string | null,"email_status"?: string,"id"?: string,"invoice_id"?: string | null,"kind"?: string,"link"?: string | null,"project_id"?: string | null,"recipient_email"?: string | null,"recipient_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_acknowledged_by_fkey"
      columns: ["acknowledged_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoice_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"row_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: number,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: number,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"boq_line_items": {
                  Row: {
                    "description": string,"id": string,"quantity": number,"remarks": string | null,"section_id": string,"sort_order": number,"specifications": string | null,"unit": string,"unit_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"id"?: string,"quantity": number,"remarks"?: string | null,"section_id": string,"sort_order"?: number,"specifications"?: string | null,"unit": string,"unit_rate": number
                  }
                  Update: {
                    "description"?: string,"id"?: string,"quantity"?: number,"remarks"?: string | null,"section_id"?: string,"sort_order"?: number,"specifications"?: string | null,"unit"?: string,"unit_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "boq_line_items_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "boq_sections"
      referencedColumns: ["id"]
    }
                  ]
                },"boq_sections": {
                  Row: {
                    "boq_version_id": string,"category": string,"id": string,"name": string | null,"room_id": string | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "boq_version_id": string,"category"?: string,"id"?: string,"name"?: string | null,"room_id"?: string | null,"sort_order"?: number
                  }
                  Update: {
                    "boq_version_id"?: string,"category"?: string,"id"?: string,"name"?: string | null,"room_id"?: string | null,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "boq_sections_boq_version_id_fkey"
      columns: ["boq_version_id"]
isOneToOne: false
      referencedRelation: "boq_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "boq_sections_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "project_rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"boq_templates": {
                  Row: {
                    "category": string | null,"description": string,"id": string,"name": string,"sections": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"description"?: string,"id"?: string,"name": string,"sections"?: NonNullable<Json>
                  }
                  Update: {
                    "category"?: string | null,"description"?: string,"id"?: string,"name"?: string,"sections"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"boq_versions": {
                  Row: {
                    "approval_note": string | null,"approved_at": string | null,"approved_by": string | null,"created_at": string,"created_by": string | null,"designer_fee": number,"discount_amount": number,"gst_percent": number,"id": string,"is_active": boolean,"project_id": string,"status": Database["public"]['Enums']["boq_status"],"submitted_at": string | null,"version_label": string | null,"version_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approval_note"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"designer_fee"?: number,"discount_amount"?: number,"gst_percent"?: number,"id"?: string,"is_active"?: boolean,"project_id": string,"status"?: Database["public"]['Enums']["boq_status"],"submitted_at"?: string | null,"version_label"?: string | null,"version_number": number
                  }
                  Update: {
                    "approval_note"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"designer_fee"?: number,"discount_amount"?: number,"gst_percent"?: number,"id"?: string,"is_active"?: boolean,"project_id"?: string,"status"?: Database["public"]['Enums']["boq_status"],"submitted_at"?: string | null,"version_label"?: string | null,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "boq_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "boq_versions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"change_orders": {
                  Row: {
                    "cost_impact": number,"created_at": string,"created_by": string | null,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"description": string | null,"fee_impact": number,"id": string,"number": string,"project_id": string,"reason": Database["public"]['Enums']["change_order_reason"],"schedule_impact_days": number,"status": Database["public"]['Enums']["change_order_status"],"submitted_at": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_impact"?: number,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"description"?: string | null,"fee_impact"?: number,"id"?: string,"number": string,"project_id": string,"reason": Database["public"]['Enums']["change_order_reason"],"schedule_impact_days"?: number,"status"?: Database["public"]['Enums']["change_order_status"],"submitted_at"?: string | null,"title": string
                  }
                  Update: {
                    "cost_impact"?: number,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"description"?: string | null,"fee_impact"?: number,"id"?: string,"number"?: string,"project_id"?: string,"reason"?: Database["public"]['Enums']["change_order_reason"],"schedule_impact_days"?: number,"status"?: Database["public"]['Enums']["change_order_status"],"submitted_at"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "change_orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "change_orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "address": string | null,"archived_at": string | null,"budget_max": number | null,"budget_min": number | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"notes": string | null,"payment_terms_days": number,"phone": string,"source": Database["public"]['Enums']["client_source"] | null,"style_preferences": Json | null,"tags": (string)[],"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"archived_at"?: string | null,"budget_max"?: number | null,"budget_min"?: number | null,"created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"notes"?: string | null,"payment_terms_days"?: number,"phone": string,"source"?: Database["public"]['Enums']["client_source"] | null,"style_preferences"?: Json | null,"tags"?: (string)[],"whatsapp"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"archived_at"?: string | null,"budget_max"?: number | null,"budget_min"?: number | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"notes"?: string | null,"payment_terms_days"?: number,"phone"?: string,"source"?: Database["public"]['Enums']["client_source"] | null,"style_preferences"?: Json | null,"tags"?: (string)[],"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"credit_notes": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"id": string,"invoice_id": string,"issued_at": string,"number": string | null,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"invoice_id": string,"issued_at"?: string,"number"?: string | null,"reason": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"invoice_id"?: string,"issued_at"?: string,"number"?: string | null,"reason"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "credit_notes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "credit_notes_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoice_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "credit_notes_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount": number,"category": string,"created_at": string,"created_by": string | null,"description": string,"expense_date": string,"id": string,"project_id": string,"receipt_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": string,"created_at"?: string,"created_by"?: string | null,"description": string,"expense_date": string,"id"?: string,"project_id": string,"receipt_url"?: string | null
                  }
                  Update: {
                    "amount"?: number,"category"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"expense_date"?: string,"id"?: string,"project_id"?: string,"receipt_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"fee_templates": {
                  Row: {
                    "discipline": Database["public"]['Enums']["discipline"],"id": string,"kind": Database["public"]['Enums']["fee_stage_kind"],"name": string,"stages": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "discipline": Database["public"]['Enums']["discipline"],"id"?: string,"kind": Database["public"]['Enums']["fee_stage_kind"],"name": string,"stages": NonNullable<Json>
                  }
                  Update: {
                    "discipline"?: Database["public"]['Enums']["discipline"],"id"?: string,"kind"?: Database["public"]['Enums']["fee_stage_kind"],"name"?: string,"stages"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"firm_settings": {
                  Row: {
                    "address": string,"alert_preferences": NonNullable<Json>,"bank_details": NonNullable<Json>,"brand_color": string,"email": string,"gst_rate": number,"gstin": string | null,"id": boolean,"invoice_prefix": string,"logo_url": string,"monthly_billing_target": number | null,"name": string,"pan": string | null,"phone": string,"risk_weights": NonNullable<Json>,"tagline": string,"terms_and_conditions": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"alert_preferences"?: NonNullable<Json>,"bank_details"?: NonNullable<Json>,"brand_color"?: string,"email"?: string,"gst_rate"?: number,"gstin"?: string | null,"id"?: boolean,"invoice_prefix"?: string,"logo_url"?: string,"monthly_billing_target"?: number | null,"name": string,"pan"?: string | null,"phone"?: string,"risk_weights"?: NonNullable<Json>,"tagline"?: string,"terms_and_conditions"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"alert_preferences"?: NonNullable<Json>,"bank_details"?: NonNullable<Json>,"brand_color"?: string,"email"?: string,"gst_rate"?: number,"gstin"?: string | null,"id"?: boolean,"invoice_prefix"?: string,"logo_url"?: string,"monthly_billing_target"?: number | null,"name"?: string,"pan"?: string | null,"phone"?: string,"risk_weights"?: NonNullable<Json>,"tagline"?: string,"terms_and_conditions"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invoice_counters": {
                  Row: {
                    "fy": string,"last_no": number
                  }
                  ComputedFields: never
                  Insert: {
                    "fy": string,"last_no": number
                  }
                  Update: {
                    "fy"?: string,"last_no"?: number
                  }
                  Relationships: [
                    
                  ]
                },"invoice_items": {
                  Row: {
                    "amount": number | null,"description": string,"id": string,"invoice_id": string,"quantity": number,"unit_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: never,"description": string,"id"?: string,"invoice_id": string,"quantity": number,"unit_rate": number
                  }
                  Update: {
                    "amount"?: never,"description"?: string,"id"?: string,"invoice_id"?: string,"quantity"?: number,"unit_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoice_items_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoice_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoice_items_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "change_order_id": string | null,"created_at": string,"discount": number,"due_date": string | null,"fee_stage_id": string | null,"gst_amount": number | null,"gst_rate": number,"id": string,"invoice_number": string | null,"issue_date": string | null,"notes": string | null,"project_id": string,"retention_amount": number,"retention_released_at": string | null,"status": Database["public"]['Enums']["invoice_status"],"subtotal": number,"total_amount": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "change_order_id"?: string | null,"created_at"?: string,"discount"?: number,"due_date"?: string | null,"fee_stage_id"?: string | null,"gst_amount"?: never,"gst_rate": number,"id"?: string,"invoice_number"?: string | null,"issue_date"?: string | null,"notes"?: string | null,"project_id": string,"retention_amount"?: number,"retention_released_at"?: string | null,"status"?: Database["public"]['Enums']["invoice_status"],"subtotal": number,"total_amount"?: never
                  }
                  Update: {
                    "change_order_id"?: string | null,"created_at"?: string,"discount"?: number,"due_date"?: string | null,"fee_stage_id"?: string | null,"gst_amount"?: never,"gst_rate"?: number,"id"?: string,"invoice_number"?: string | null,"issue_date"?: string | null,"notes"?: string | null,"project_id"?: string,"retention_amount"?: number,"retention_released_at"?: string | null,"status"?: Database["public"]['Enums']["invoice_status"],"subtotal"?: number,"total_amount"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_change_order_id_fkey"
      columns: ["change_order_id"]
isOneToOne: false
      referencedRelation: "change_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_fee_stage_id_fkey"
      columns: ["fee_stage_id"]
isOneToOne: false
      referencedRelation: "fee_stage_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_fee_stage_id_fkey"
      columns: ["fee_stage_id"]
isOneToOne: false
      referencedRelation: "project_fee_stages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"item_library": {
                  Row: {
                    "category": string,"created_at": string,"description": string | null,"id": string,"item_name": string,"specifications": string | null,"standard_rate": number,"unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"description"?: string | null,"id"?: string,"item_name": string,"specifications"?: string | null,"standard_rate"?: number,"unit": string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"item_name"?: string,"specifications"?: string | null,"standard_rate"?: number,"unit"?: string
                  }
                  Relationships: [
                    
                  ]
                },"material_options": {
                  Row: {
                    "approx_cost": number,"brand": string,"category": Database["public"]['Enums']["material_category"],"description": string | null,"id": string,"image_url": string,"is_selected": boolean,"product_name": string,"project_id": string,"room_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approx_cost"?: number,"brand"?: string,"category": Database["public"]['Enums']["material_category"],"description"?: string | null,"id"?: string,"image_url"?: string,"is_selected"?: boolean,"product_name": string,"project_id": string,"room_name": string
                  }
                  Update: {
                    "approx_cost"?: number,"brand"?: string,"category"?: Database["public"]['Enums']["material_category"],"description"?: string | null,"id"?: string,"image_url"?: string,"is_selected"?: boolean,"product_name"?: string,"project_id"?: string,"room_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_options_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "content": string | null,"created_at": string,"file_name": string | null,"file_url": string | null,"id": string,"project_id": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string | null,"created_at"?: string,"file_name"?: string | null,"file_url"?: string | null,"id"?: string,"project_id": string,"sender_id"?: string
                  }
                  Update: {
                    "content"?: string | null,"created_at"?: string,"file_name"?: string | null,"file_url"?: string | null,"id"?: string,"project_id"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"is_read": boolean,"link": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"is_read"?: boolean,"link"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"is_read"?: boolean,"link"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"invoice_id": string,"mode": Database["public"]['Enums']["payment_mode"],"notes": string | null,"payment_date": string,"recorded_by": string | null,"reference": string | null,"tds_amount": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"invoice_id": string,"mode": Database["public"]['Enums']["payment_mode"],"notes"?: string | null,"payment_date": string,"recorded_by"?: string | null,"reference"?: string | null,"tds_amount"?: number
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"invoice_id"?: string,"mode"?: Database["public"]['Enums']["payment_mode"],"notes"?: string | null,"payment_date"?: string,"recorded_by"?: string | null,"reference"?: string | null,"tds_amount"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoice_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"avatar_url": string | null,"billable_target_percent": number,"client_id": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"kind": Database["public"]['Enums']["profile_kind"],"phone": string | null,"rate_band_id": string | null,"title": string | null,"weekly_capacity_hours": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"avatar_url"?: string | null,"billable_target_percent"?: number,"client_id"?: string | null,"created_at"?: string,"email": string,"full_name": string,"id": string,"kind"?: Database["public"]['Enums']["profile_kind"],"phone"?: string | null,"rate_band_id"?: string | null,"title"?: string | null,"weekly_capacity_hours"?: number
                  }
                  Update: {
                    "active"?: boolean,"avatar_url"?: string | null,"billable_target_percent"?: number,"client_id"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["profile_kind"],"phone"?: string | null,"rate_band_id"?: string | null,"title"?: string | null,"weekly_capacity_hours"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_rate_band_id_fkey"
      columns: ["rate_band_id"]
isOneToOne: false
      referencedRelation: "rate_bands"
      referencedColumns: ["id"]
    }
                  ]
                },"project_fee_stages": {
                  Row: {
                    "checklist": NonNullable<Json>,"completed_at": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["fee_stage_kind"],"name": string,"percent": number,"percent_complete": number,"planned_end": string | null,"planned_start": string | null,"project_id": string,"sort_order": number,"status": Database["public"]['Enums']["fee_stage_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "checklist"?: NonNullable<Json>,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["fee_stage_kind"],"name": string,"percent": number,"percent_complete"?: number,"planned_end"?: string | null,"planned_start"?: string | null,"project_id": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["fee_stage_status"]
                  }
                  Update: {
                    "checklist"?: NonNullable<Json>,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["fee_stage_kind"],"name"?: string,"percent"?: number,"percent_complete"?: number,"planned_end"?: string | null,"planned_start"?: string | null,"project_id"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["fee_stage_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_fee_stages_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_files": {
                  Row: {
                    "category": string,"created_at": string,"file_name": string,"file_size_bytes": number | null,"file_type": string,"folder": string | null,"id": string,"is_client_visible": boolean,"project_id": string,"room_id": string | null,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"created_at"?: string,"file_name": string,"file_size_bytes"?: number | null,"file_type": string,"folder"?: string | null,"id"?: string,"is_client_visible"?: boolean,"project_id": string,"room_id"?: string | null,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"file_name"?: string,"file_size_bytes"?: number | null,"file_type"?: string,"folder"?: string | null,"id"?: string,"is_client_visible"?: boolean,"project_id"?: string,"room_id"?: string | null,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_files_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_files_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "project_rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_files_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"project_members": {
                  Row: {
                    "profile_id": string,"project_id": string,"role_on_project": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "profile_id": string,"project_id": string,"role_on_project"?: string | null
                  }
                  Update: {
                    "profile_id"?: string,"project_id"?: string,"role_on_project"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_milestones": {
                  Row: {
                    "completed_at": string | null,"due_date": string | null,"id": string,"project_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"due_date"?: string | null,"id"?: string,"project_id": string,"title": string
                  }
                  Update: {
                    "completed_at"?: string | null,"due_date"?: string | null,"id"?: string,"project_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_milestones_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_rooms": {
                  Row: {
                    "area_sqft": number | null,"id": string,"name": string,"project_id": string,"room_type": string | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_sqft"?: number | null,"id"?: string,"name": string,"project_id": string,"room_type"?: string | null,"sort_order"?: number
                  }
                  Update: {
                    "area_sqft"?: number | null,"id"?: string,"name"?: string,"project_id"?: string,"room_type"?: string | null,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_rooms_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_updates": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"likes": number,"loved": number,"milestone_id": string | null,"photos": (string)[],"posted_by": string,"project_id": string,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"likes"?: number,"loved"?: number,"milestone_id"?: string | null,"photos"?: (string)[],"posted_by"?: string,"project_id": string,"title"?: string | null
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"likes"?: number,"loved"?: number,"milestone_id"?: string | null,"photos"?: (string)[],"posted_by"?: string,"project_id"?: string,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_updates_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "project_milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_updates_posted_by_fkey"
      columns: ["posted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_updates_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "actual_end_date": string | null,"archived_at": string | null,"area_sqft": number | null,"client_id": string,"created_at": string,"director_id": string | null,"discipline": Database["public"]['Enums']["discipline"] | null,"engagement_type": Database["public"]['Enums']["engagement_type"] | null,"estimated_construction_cost": number | null,"estimated_end_date": string | null,"fee_amount": number | null,"fee_basis": Database["public"]['Enums']["fee_basis"] | null,"fee_rate": number | null,"id": string,"manager_id": string | null,"name": string,"portal_token": string,"progress_percent": number,"property_address": string | null,"property_type": string | null,"reference_number": string,"start_date": string | null,"status": Database["public"]['Enums']["project_status"],"total_budget": number | null,"type": Database["public"]['Enums']["project_type"] | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_end_date"?: string | null,"archived_at"?: string | null,"area_sqft"?: number | null,"client_id": string,"created_at"?: string,"director_id"?: string | null,"discipline"?: Database["public"]['Enums']["discipline"] | null,"engagement_type"?: Database["public"]['Enums']["engagement_type"] | null,"estimated_construction_cost"?: number | null,"estimated_end_date"?: string | null,"fee_amount"?: number | null,"fee_basis"?: Database["public"]['Enums']["fee_basis"] | null,"fee_rate"?: number | null,"id"?: string,"manager_id"?: string | null,"name": string,"portal_token"?: string,"progress_percent"?: number,"property_address"?: string | null,"property_type"?: string | null,"reference_number"?: string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"total_budget"?: number | null,"type"?: Database["public"]['Enums']["project_type"] | null,"updated_at"?: string
                  }
                  Update: {
                    "actual_end_date"?: string | null,"archived_at"?: string | null,"area_sqft"?: number | null,"client_id"?: string,"created_at"?: string,"director_id"?: string | null,"discipline"?: Database["public"]['Enums']["discipline"] | null,"engagement_type"?: Database["public"]['Enums']["engagement_type"] | null,"estimated_construction_cost"?: number | null,"estimated_end_date"?: string | null,"fee_amount"?: number | null,"fee_basis"?: Database["public"]['Enums']["fee_basis"] | null,"fee_rate"?: number | null,"id"?: string,"manager_id"?: string | null,"name"?: string,"portal_token"?: string,"progress_percent"?: number,"property_address"?: string | null,"property_type"?: string | null,"reference_number"?: string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"total_budget"?: number | null,"type"?: Database["public"]['Enums']["project_type"] | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_director_id_fkey"
      columns: ["director_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_bands": {
                  Row: {
                    "blended_rate": number,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blended_rate": number,"id"?: string,"name": string
                  }
                  Update: {
                    "blended_rate"?: number,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"snag_comments": {
                  Row: {
                    "author_id": string,"content": string | null,"created_at": string,"id": string,"photo_url": string | null,"snag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string,"content"?: string | null,"created_at"?: string,"id"?: string,"photo_url"?: string | null,"snag_id": string
                  }
                  Update: {
                    "author_id"?: string,"content"?: string | null,"created_at"?: string,"id"?: string,"photo_url"?: string | null,"snag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "snag_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "snag_comments_snag_id_fkey"
      columns: ["snag_id"]
isOneToOne: false
      referencedRelation: "snags"
      referencedColumns: ["id"]
    }
                  ]
                },"snags": {
                  Row: {
                    "after_photo_url": string | null,"assigned_to": string | null,"before_photo_url": string | null,"client_closed_at": string | null,"created_at": string,"description": string | null,"designer_verified_at": string | null,"due_date": string | null,"fixed_at": string | null,"id": string,"location_detail": string | null,"priority": Database["public"]['Enums']["snag_priority"],"project_id": string,"raised_by": string | null,"room_id": string | null,"status": Database["public"]['Enums']["snag_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "after_photo_url"?: string | null,"assigned_to"?: string | null,"before_photo_url"?: string | null,"client_closed_at"?: string | null,"created_at"?: string,"description"?: string | null,"designer_verified_at"?: string | null,"due_date"?: string | null,"fixed_at"?: string | null,"id"?: string,"location_detail"?: string | null,"priority"?: Database["public"]['Enums']["snag_priority"],"project_id": string,"raised_by"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["snag_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "after_photo_url"?: string | null,"assigned_to"?: string | null,"before_photo_url"?: string | null,"client_closed_at"?: string | null,"created_at"?: string,"description"?: string | null,"designer_verified_at"?: string | null,"due_date"?: string | null,"fixed_at"?: string | null,"id"?: string,"location_detail"?: string | null,"priority"?: Database["public"]['Enums']["snag_priority"],"project_id"?: string,"raised_by"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["snag_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "snags_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "snags_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "snags_raised_by_fkey"
      columns: ["raised_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "snags_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "project_rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_cost_rates": {
                  Row: {
                    "cost_rate": number,"effective_from": string,"id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_rate": number,"effective_from": string,"id"?: string,"profile_id": string
                  }
                  Update: {
                    "cost_rate"?: number,"effective_from"?: string,"id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_cost_rates_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"created_by": string | null,"description": string | null,"due_date": string | null,"id": string,"is_internal": boolean,"priority": Database["public"]['Enums']["task_priority"],"project_id": string,"room_id": string | null,"status": Database["public"]['Enums']["task_status"],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"is_internal"?: boolean,"priority"?: Database["public"]['Enums']["task_priority"],"project_id": string,"room_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"title": string
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"is_internal"?: boolean,"priority"?: Database["public"]['Enums']["task_priority"],"project_id"?: string,"room_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "project_rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"timesheet_entries": {
                  Row: {
                    "activity": Database["public"]['Enums']["timesheet_activity"],"billable": boolean,"created_at": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"fee_stage_id": string | null,"hours": number,"id": string,"notes": string | null,"profile_id": string,"project_id": string | null,"status": Database["public"]['Enums']["timesheet_status"],"submitted_at": string | null,"work_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity": Database["public"]['Enums']["timesheet_activity"],"billable"?: boolean,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"fee_stage_id"?: string | null,"hours": number,"id"?: string,"notes"?: string | null,"profile_id"?: string,"project_id"?: string | null,"status"?: Database["public"]['Enums']["timesheet_status"],"submitted_at"?: string | null,"work_date": string
                  }
                  Update: {
                    "activity"?: Database["public"]['Enums']["timesheet_activity"],"billable"?: boolean,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"fee_stage_id"?: string | null,"hours"?: number,"id"?: string,"notes"?: string | null,"profile_id"?: string,"project_id"?: string | null,"status"?: Database["public"]['Enums']["timesheet_status"],"submitted_at"?: string | null,"work_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "timesheet_entries_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timesheet_entries_fee_stage_id_fkey"
      columns: ["fee_stage_id"]
isOneToOne: false
      referencedRelation: "fee_stage_summary"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timesheet_entries_fee_stage_id_fkey"
      columns: ["fee_stage_id"]
isOneToOne: false
      referencedRelation: "project_fee_stages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timesheet_entries_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timesheet_entries_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "fee_stage_summary": {
                  Row: {
                    "amount": number | null,"checklist": Json | null,"completed_at": string | null,"earned": number | null,"id": string | null,"invoiced": number | null,"kind": Database["public"]['Enums']["fee_stage_kind"] | null,"name": string | null,"percent": number | null,"percent_complete": number | null,"planned_end": string | null,"planned_start": string | null,"project_id": string | null,"sort_order": number | null,"status": Database["public"]['Enums']["fee_stage_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "amount"?: never,"checklist"?: Json | null,"completed_at"?: string | null,"earned"?: never,"id"?: string | null,"invoiced"?: never,"kind"?: Database["public"]['Enums']["fee_stage_kind"] | null,"name"?: string | null,"percent"?: number | null,"percent_complete"?: number | null,"planned_end"?: string | null,"planned_start"?: string | null,"project_id"?: string | null,"sort_order"?: number | null,"status"?: Database["public"]['Enums']["fee_stage_status"] | null
                         }
                        Update: {
                           "amount"?: never,"checklist"?: Json | null,"completed_at"?: string | null,"earned"?: never,"id"?: string | null,"invoiced"?: never,"kind"?: Database["public"]['Enums']["fee_stage_kind"] | null,"name"?: string | null,"percent"?: number | null,"percent_complete"?: number | null,"planned_end"?: string | null,"planned_start"?: string | null,"project_id"?: string | null,"sort_order"?: number | null,"status"?: Database["public"]['Enums']["fee_stage_status"] | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "project_fee_stages_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"invoice_summary": {
                  Row: {
                    "amount_due": number | null,"amount_paid": number | null,"credited": number | null,"effective_status": string | null,"id": string | null,"last_payment_date": string | null,"project_id": string | null,"retention_held": number | null,"tds_amount": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "acknowledge_alert":
{ Args: { "p_alert": string }; Returns: undefined
                           },
"apply_fee_template":
{ Args: { "p_project": string,"p_template": string }; Returns: number
                           },
"boq_version_project":
{ Args: { "v": string }; Returns: string
                           },
"boq_version_status":
{ Args: { "v": string }; Returns: Database["public"]['Enums']["boq_status"]
                           },
"can_approve_entry":
{ Args: { "p_entry": string }; Returns: boolean
                           },
"can_bill_project":
{ Args: { "p": string }; Returns: boolean
                           },
"can_manage_project":
{ Args: { "p": string }; Returns: boolean
                           },
"can_see_project":
{ Args: { "p": string }; Returns: boolean
                           },
"can_see_project_finance":
{ Args: { "p": string }; Returns: boolean
                           },
"client_close_snag":
{ Args: { "p_snag": string }; Returns: undefined
                           },
"client_decide_boq":
{ Args: { "p_approve": boolean,"p_boq": string,"p_note": string,"p_signer": string }; Returns: undefined
                           },
"client_decide_change_order":
{ Args: { "p_approve": boolean,"p_co": string,"p_note": string,"p_signer": string }; Returns: undefined
                           },
"complete_fee_stage":
{ Args: { "p_stage": string }; Returns: string
                           },
"cost_rate_on":
{ Args: { "p_date": string,"p_profile": string }; Returns: number
                           },
"create_boq_version":
{ Args: { "p": Json }; Returns: string
                           },
"decide_timesheet_entries":
{ Args: { "p_approve": boolean,"p_ids": (string)[],"p_note": string }; Returns: number
                           },
"execution_base":
{ Args: { "p": string }; Returns: number
                           },
"fee_percent_total":
{ Args: { "k": Database["public"]['Enums']["fee_stage_kind"],"p": string }; Returns: number
                           },
"financial_year":
{ Args: { "d": string }; Returns: string
                           },
"generate_alerts":
{ Args: { "p_today"?: string }; Returns: number
                           },
"generate_delivery_alerts":
{ Args: { "p_today"?: string }; Returns: number
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"invoice_project":
{ Args: { "i": string }; Returns: string
                           },
"is_project_client":
{ Args: { "p": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_activity":
{ Args: { "p_client": string,"p_desc": string,"p_project": string,"p_title": string,"p_type": Database["public"]['Enums']["activity_type"] }; Returns: undefined
                           },
"manages_project":
{ Args: { "p": string }; Returns: boolean
                           },
"my_client_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"next_project_reference":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"notify_project_clients":
{ Args: { "p_body": string,"p_link": string,"p_project": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"notify_project_staff":
{ Args: { "p_body": string,"p_link": string,"p_project": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"project_cost_rollup":
{ Args: Record<PropertyKey, never>; Returns: {
              "actual_cost": number,"billable_hours": number,"blended_cost": number,"fee_stage_id": string,"hours": number,"project_id": string,"unrated_hours": number
            }[]
                           },
"project_fee_value":
{ Args: { "p": string }; Returns: number
                           },
"react_to_update":
{ Args: { "p_kind": string,"p_update": string }; Returns: undefined
                           },
"reopen_fee_stage":
{ Args: { "p_stage": string }; Returns: undefined
                           },
"save_timesheet_week":
{ Args: { "p_rows": Json,"p_week": string }; Returns: number
                           },
"section_version":
{ Args: { "s": string }; Returns: string
                           },
"sees_all_projects":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"snag_project":
{ Args: { "s": string }; Returns: string
                           },
"staff_week_hours":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "billable_hours": number,"profile_id": string,"submitted": boolean,"total_hours": number,"week_start": string
            }[]
                           },
"storage_project_id":
{ Args: { "object_name": string }; Returns: string
                           },
"submit_onboarding":
{ Args: { "p": Json }; Returns: string
                           },
"submit_timesheet_week":
{ Args: { "p_week": string }; Returns: number
                           },
"toggle_milestone":
{ Args: { "p_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "activity_type": "stage_change"|"boq_submit"|"boq_approve"|"snag_raised"|"snag_closed"|"payment_received"|"note","app_role": "owner"|"director"|"project_manager"|"architect"|"site_supervisor"|"finance"|"admin"|"procurement","boq_status": "draft"|"submitted"|"approved"|"rejected","change_order_reason": "client_request"|"site_condition"|"regulatory"|"design_error","change_order_status": "draft"|"submitted"|"approved"|"rejected","client_source": "referral"|"instagram"|"website"|"walk-in"|"other","discipline": "architecture"|"interiors"|"both","engagement_type": "design_only"|"design_and_execution","fee_basis": "percent_of_cost"|"lump_sum"|"per_sqft"|"hourly","fee_stage_kind": "design_fee"|"execution","fee_stage_status": "not_started"|"in_progress"|"complete","invoice_status": "draft"|"sent"|"cancelled","material_category": "Flooring"|"Walls"|"Ceiling"|"Furniture"|"Lighting"|"Hardware","payment_mode": "bank_transfer"|"upi"|"cheque"|"cash","profile_kind": "staff"|"client"|"vendor","project_status": "lead"|"consultation"|"design"|"boq_approval"|"execution"|"snag"|"handover"|"closed","project_type": "residential"|"commercial"|"office","snag_priority": "critical"|"major"|"minor","snag_status": "raised"|"assigned"|"in_progress"|"fixed"|"verified"|"closed","task_priority": "low"|"medium"|"high"|"urgent","task_status": "todo"|"in_progress"|"done","timesheet_activity": "design"|"drafting"|"visualisation"|"site_visit"|"client_meeting"|"coordination"|"approvals"|"admin"|"business_development"|"training"|"leave","timesheet_status": "draft"|"submitted"|"approved"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_type": ["stage_change", "boq_submit", "boq_approve", "snag_raised", "snag_closed", "payment_received", "note"],"app_role": ["owner", "director", "project_manager", "architect", "site_supervisor", "finance", "admin", "procurement"],"boq_status": ["draft", "submitted", "approved", "rejected"],"change_order_reason": ["client_request", "site_condition", "regulatory", "design_error"],"change_order_status": ["draft", "submitted", "approved", "rejected"],"client_source": ["referral", "instagram", "website", "walk-in", "other"],"discipline": ["architecture", "interiors", "both"],"engagement_type": ["design_only", "design_and_execution"],"fee_basis": ["percent_of_cost", "lump_sum", "per_sqft", "hourly"],"fee_stage_kind": ["design_fee", "execution"],"fee_stage_status": ["not_started", "in_progress", "complete"],"invoice_status": ["draft", "sent", "cancelled"],"material_category": ["Flooring", "Walls", "Ceiling", "Furniture", "Lighting", "Hardware"],"payment_mode": ["bank_transfer", "upi", "cheque", "cash"],"profile_kind": ["staff", "client", "vendor"],"project_status": ["lead", "consultation", "design", "boq_approval", "execution", "snag", "handover", "closed"],"project_type": ["residential", "commercial", "office"],"snag_priority": ["critical", "major", "minor"],"snag_status": ["raised", "assigned", "in_progress", "fixed", "verified", "closed"],"task_priority": ["low", "medium", "high", "urgent"],"task_status": ["todo", "in_progress", "done"],"timesheet_activity": ["design", "drafting", "visualisation", "site_visit", "client_meeting", "coordination", "approvals", "admin", "business_development", "training", "leave"],"timesheet_status": ["draft", "submitted", "approved", "rejected"]
          }
        }
} as const
