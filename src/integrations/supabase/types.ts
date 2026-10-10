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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_assignments: {
        Row: {
          asset_id: string
          assignment_date: string
          created_at: string
          created_by: string | null
          department_id: string | null
          employee_id: string | null
          expected_return_date: string | null
          id: string
          location_id: string | null
          organization_id: string
          remarks: string | null
          returned_at: string | null
        }
        Insert: {
          asset_id: string
          assignment_date?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          expected_return_date?: string | null
          id?: string
          location_id?: string | null
          organization_id: string
          remarks?: string | null
          returned_at?: string | null
        }
        Update: {
          asset_id?: string
          assignment_date?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          expected_return_date?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string
          remarks?: string | null
          returned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_events: {
        Row: {
          actor_id: string | null
          asset_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          summary: string
        }
        Insert: {
          actor_id?: string | null
          asset_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          summary: string
        }
        Update: {
          actor_id?: string | null
          asset_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_qr_codes: {
        Row: {
          active: boolean
          asset_id: string
          generated_at: string
          generated_by: string | null
          id: string
          organization_id: string
          token: string
        }
        Insert: {
          active?: boolean
          asset_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id: string
          token?: string
        }
        Update: {
          active?: boolean
          asset_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_qr_codes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_qr_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transfers: {
        Row: {
          approved_by: string | null
          asset_id: string
          created_at: string
          created_by: string | null
          from_employee_id: string | null
          from_location_id: string | null
          id: string
          organization_id: string
          reason: string
          remarks: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          to_employee_id: string | null
          to_location_id: string | null
          transfer_date: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          asset_id: string
          created_at?: string
          created_by?: string | null
          from_employee_id?: string | null
          from_location_id?: string | null
          id?: string
          organization_id: string
          reason: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          to_employee_id?: string | null
          to_location_id?: string | null
          transfer_date?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          created_by?: string | null
          from_employee_id?: string | null
          from_location_id?: string | null
          id?: string
          organization_id?: string
          reason?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          to_employee_id?: string | null
          to_location_id?: string | null
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_verifications: {
        Row: {
          asset_id: string
          campaign_id: string | null
          confirmed_condition:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          confirmed_location_id: string | null
          id: string
          organization_id: string
          photo_url: string | null
          remarks: string | null
          status: string
          verified_at: string
          verified_by: string | null
        }
        Insert: {
          asset_id: string
          campaign_id?: string | null
          confirmed_condition?:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          confirmed_location_id?: string | null
          id?: string
          organization_id: string
          photo_url?: string | null
          remarks?: string | null
          status: string
          verified_at?: string
          verified_by?: string | null
        }
        Update: {
          asset_id?: string
          campaign_id?: string | null
          confirmed_condition?:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          confirmed_location_id?: string | null
          id?: string
          organization_id?: string
          photo_url?: string | null
          remarks?: string | null
          status?: string
          verified_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_verifications_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_verifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "verification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_verifications_confirmed_location_id_fkey"
            columns: ["confirmed_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_id: string
          asset_type: string | null
          assigned_employee_id: string | null
          business_unit: string | null
          capitalization_date: string | null
          category_id: string | null
          company: string | null
          company_code: string | null
          condition: Database["public"]["Enums"]["asset_condition"]
          cost_center: string | null
          created_at: string
          created_by: string | null
          criticality: string
          current_value: number | null
          department_id: string | null
          description: string | null
          floor: string | null
          id: string
          image_url: string | null
          invoice_number: string | null
          location_id: string | null
          manufacturer: string | null
          model: string | null
          name: string
          organization_id: string
          plant: string | null
          profit_center: string | null
          purchase_date: string | null
          purchase_value: number | null
          remarks: string | null
          room: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          subcategory: string | null
          supplier: string | null
          updated_at: string
          updated_by: string | null
          useful_life_months: number | null
          warranty_end: string | null
          warranty_start: string | null
        }
        Insert: {
          asset_id: string
          asset_type?: string | null
          assigned_employee_id?: string | null
          business_unit?: string | null
          capitalization_date?: string | null
          category_id?: string | null
          company?: string | null
          company_code?: string | null
          condition?: Database["public"]["Enums"]["asset_condition"]
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: string
          current_value?: number | null
          department_id?: string | null
          description?: string | null
          floor?: string | null
          id?: string
          image_url?: string | null
          invoice_number?: string | null
          location_id?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          organization_id: string
          plant?: string | null
          profit_center?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          remarks?: string | null
          room?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          subcategory?: string | null
          supplier?: string | null
          updated_at?: string
          updated_by?: string | null
          useful_life_months?: number | null
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Update: {
          asset_id?: string
          asset_type?: string | null
          assigned_employee_id?: string | null
          business_unit?: string | null
          capitalization_date?: string | null
          category_id?: string | null
          company?: string | null
          company_code?: string | null
          condition?: Database["public"]["Enums"]["asset_condition"]
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: string
          current_value?: number | null
          department_id?: string | null
          description?: string | null
          floor?: string | null
          id?: string
          image_url?: string | null
          invoice_number?: string | null
          location_id?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          organization_id?: string
          plant?: string | null
          profit_center?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          remarks?: string | null
          room?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          subcategory?: string | null
          supplier?: string | null
          updated_at?: string
          updated_by?: string | null
          useful_life_months?: number | null
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          cost_center: string | null
          created_at: string
          id: string
          location_id: string | null
          manager_name: string | null
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          cost_center?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          manager_name?: string | null
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          cost_center?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          manager_name?: string | null
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department_id: string | null
          designation: string | null
          email: string | null
          employee_code: string
          full_name: string
          id: string
          location_id: string | null
          manager_id: string | null
          mobile: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_code: string
          full_name: string
          id?: string
          location_id?: string | null
          manager_id?: string | null
          mobile?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string
          full_name?: string
          id?: string
          location_id?: string | null
          manager_id?: string | null
          mobile?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config_public: Json
          created_at: string
          encrypted_secret_ref: string | null
          id: string
          last_synced_at: string | null
          name: string
          organization_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          config_public?: Json
          created_at?: string
          encrypted_secret_ref?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          config_public?: Json
          created_at?: string
          encrypted_secret_ref?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          asset_id: string
          completion_date: string | null
          cost: number
          created_at: string
          created_by: string | null
          id: string
          maintenance_type: string
          next_maintenance_date: string | null
          organization_id: string
          parts_used: string | null
          photo_path: string | null
          remarks: string | null
          service_provider: string | null
          source: string
          start_date: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          technician: string | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          completion_date?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          organization_id: string
          parts_used?: string | null
          photo_path?: string | null
          remarks?: string | null
          service_provider?: string | null
          source?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          technician?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          completion_date?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          organization_id?: string
          parts_used?: string | null
          photo_path?: string | null
          remarks?: string | null
          service_provider?: string | null
          source?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          technician?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          organization_id: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          organization_id: string
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          mode: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          job_title: string | null
          organization_id: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          job_title?: string | null
          organization_id?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          organization_id?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          ends_on: string | null
          id: string
          name: string
          organization_id: string
          scope: Json
          starts_on: string
          status: Database["public"]["Enums"]["workflow_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          name: string
          organization_id: string
          scope?: Json
          starts_on: string
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          organization_id?: string
          scope?: Json
          starts_on?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_asset: {
        Args: { _token: string }
        Returns: {
          asset_id: string
          asset_name: string
          company: string
          status: Database["public"]["Enums"]["asset_status"]
        }[]
      }
      get_public_asset_details: {
        Args: { _token: string }
        Returns: {
          asset_id: string
          asset_name: string
          capitalization_year: number
          company: string
          cost_center: string
          equipment_model: string
          plant: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_asset_rows: {
        Args: { _organization_id: string; _rows: Json }
        Returns: number
      }
      is_org_member: { Args: { _organization_id: string }; Returns: boolean }
      process_asset_transfer: {
        Args: { _action: string; _transfer_id: string }
        Returns: Database["public"]["Enums"]["workflow_status"]
      }
      submit_qr_breakdown: {
        Args: {
          _photo_path: string
          _remarks: string
          _title: string
          _token: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "asset_manager"
        | "finance"
        | "it_manager"
        | "facility_manager"
        | "auditor"
        | "employee"
        | "viewer"
      asset_condition: "new" | "good" | "average" | "poor" | "damaged"
      asset_status:
        | "active"
        | "in_stock"
        | "assigned"
        | "under_maintenance"
        | "under_repair"
        | "missing"
        | "damaged"
        | "retired"
        | "disposed"
      workflow_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
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
      app_role: [
        "super_admin",
        "admin",
        "asset_manager",
        "finance",
        "it_manager",
        "facility_manager",
        "auditor",
        "employee",
        "viewer",
      ],
      asset_condition: ["new", "good", "average", "poor", "damaged"],
      asset_status: [
        "active",
        "in_stock",
        "assigned",
        "under_maintenance",
        "under_repair",
        "missing",
        "damaged",
        "retired",
        "disposed",
      ],
      workflow_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
