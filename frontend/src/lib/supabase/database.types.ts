
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
            "application_contacts": {
                  Row: {
                    "application_id": string,"created_at": string,"email": string | null,"id": string,"linkedin_url": string | null,"name": string,"notes": string | null,"phone": string | null,"role_title": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id": string,"created_at"?: string,"email"?: string | null,"id"?: string,"linkedin_url"?: string | null,"name": string,"notes"?: string | null,"phone"?: string | null,"role_title"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "application_id"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"linkedin_url"?: string | null,"name"?: string,"notes"?: string | null,"phone"?: string | null,"role_title"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_contacts_application_id_user_id_fkey"
      columns: ["application_id","user_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"application_notes": {
                  Row: {
                    "application_id": string,"content": string,"created_at": string,"id": string,"title": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id": string,"content": string,"created_at"?: string,"id"?: string,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "application_id"?: string,"content"?: string,"created_at"?: string,"id"?: string,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_notes_application_id_user_id_fkey"
      columns: ["application_id","user_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"application_state_transitions": {
                  Row: {
                    "application_id": string,"from_status": Database["public"]['Enums']["application_status"] | null,"id": string,"to_status": Database["public"]['Enums']["application_status"],"transitioned_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id": string,"from_status"?: Database["public"]['Enums']["application_status"] | null,"id"?: string,"to_status": Database["public"]['Enums']["application_status"],"transitioned_at"?: string,"user_id": string
                  }
                  Update: {
                    "application_id"?: string,"from_status"?: Database["public"]['Enums']["application_status"] | null,"id"?: string,"to_status"?: Database["public"]['Enums']["application_status"],"transitioned_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_state_transitions_application_id_user_id_fkey"
      columns: ["application_id","user_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"application_tasks": {
                  Row: {
                    "application_id": string,"created_at": string,"due_date": string | null,"id": string,"is_completed": boolean,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id": string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"is_completed"?: boolean,"title": string,"user_id"?: string
                  }
                  Update: {
                    "application_id"?: string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"is_completed"?: boolean,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_tasks_application_id_user_id_fkey"
      columns: ["application_id","user_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"applications": {
                  Row: {
                    "applied_at": string | null,"company_name": string,"created_at": string,"deadline_at": string | null,"description": string | null,"follow_up_at": string | null,"id": string,"job_id": string | null,"job_url": string | null,"location": string | null,"position": number,"role_title": string,"salary_text": string | null,"status": Database["public"]['Enums']["application_status"],"updated_at": string,"user_id": string,"work_model": Database["public"]['Enums']["work_model"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string | null,"company_name": string,"created_at"?: string,"deadline_at"?: string | null,"description"?: string | null,"follow_up_at"?: string | null,"id"?: string,"job_id"?: string | null,"job_url"?: string | null,"location"?: string | null,"position"?: number,"role_title": string,"salary_text"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string,"user_id"?: string,"work_model"?: Database["public"]['Enums']["work_model"] | null
                  }
                  Update: {
                    "applied_at"?: string | null,"company_name"?: string,"created_at"?: string,"deadline_at"?: string | null,"description"?: string | null,"follow_up_at"?: string | null,"id"?: string,"job_id"?: string | null,"job_url"?: string | null,"location"?: string | null,"position"?: number,"role_title"?: string,"salary_text"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string,"user_id"?: string,"work_model"?: Database["public"]['Enums']["work_model"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"ingest_runs": {
                  Row: {
                    "deactivated": number,"finished_at": string | null,"id": string,"inserted": number,"started_at": string,"stats": NonNullable<Json>,"status": string,"updated": number
                  }
                  ComputedFields: never
                  Insert: {
                    "deactivated"?: number,"finished_at"?: string | null,"id"?: string,"inserted"?: number,"started_at"?: string,"stats"?: NonNullable<Json>,"status"?: string,"updated"?: number
                  }
                  Update: {
                    "deactivated"?: number,"finished_at"?: string | null,"id"?: string,"inserted"?: number,"started_at"?: string,"stats"?: NonNullable<Json>,"status"?: string,"updated"?: number
                  }
                  Relationships: [
                    
                  ]
                },"jobs": {
                  Row: {
                    "city": string | null,"company_domain": string | null,"company_name": string,"company_size": string | null,"created_at": string,"deadline_at": string | null,"description_md": string | null,"disciplines": (string)[],"first_seen_at": string,"id": string,"is_active": boolean,"job_type": Database["public"]['Enums']["job_type"] | null,"job_url": string,"job_url_canonical": string,"last_seen_at": string,"locations": (string)[],"missed_runs": number,"posted_at": string | null,"province": string | null,"salary_currency": string,"salary_max": number | null,"salary_min": number | null,"salary_period": string | null,"salary_source": string | null,"search": unknown,"source": string,"source_id": string | null,"term": string | null,"terms": (string)[],"title": string,"updated_at": string,"work_model": Database["public"]['Enums']["work_model"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"company_domain"?: string | null,"company_name": string,"company_size"?: string | null,"created_at"?: string,"deadline_at"?: string | null,"description_md"?: string | null,"disciplines"?: (string)[],"first_seen_at"?: string,"id"?: string,"is_active"?: boolean,"job_type"?: Database["public"]['Enums']["job_type"] | null,"job_url": string,"job_url_canonical": string,"last_seen_at"?: string,"locations"?: (string)[],"missed_runs"?: number,"posted_at"?: string | null,"province"?: string | null,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: string | null,"salary_source"?: string | null,"search"?: never,"source": string,"source_id"?: string | null,"term"?: string | null,"terms"?: (string)[],"title": string,"updated_at"?: string,"work_model"?: Database["public"]['Enums']["work_model"] | null
                  }
                  Update: {
                    "city"?: string | null,"company_domain"?: string | null,"company_name"?: string,"company_size"?: string | null,"created_at"?: string,"deadline_at"?: string | null,"description_md"?: string | null,"disciplines"?: (string)[],"first_seen_at"?: string,"id"?: string,"is_active"?: boolean,"job_type"?: Database["public"]['Enums']["job_type"] | null,"job_url"?: string,"job_url_canonical"?: string,"last_seen_at"?: string,"locations"?: (string)[],"missed_runs"?: number,"posted_at"?: string | null,"province"?: string | null,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: string | null,"salary_source"?: string | null,"search"?: never,"source"?: string,"source_id"?: string | null,"term"?: string | null,"terms"?: (string)[],"title"?: string,"updated_at"?: string,"work_model"?: Database["public"]['Enums']["work_model"] | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"grad_term": string | null,"id": string,"school": string,"target_provinces": (string)[],"target_roles": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string,"grad_term"?: string | null,"id": string,"school"?: string,"target_provinces"?: (string)[],"target_roles"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"grad_term"?: string | null,"id"?: string,"school"?: string,"target_provinces"?: (string)[],"target_roles"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "bucket": string,"count": number,"user_id": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"count"?: number,"user_id": string,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"count"?: number,"user_id"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "consume_rate_limit":
{ Args: { "p_bucket": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"ingest_active_ats_postings":
{ Args: Record<PropertyKey, never>; Returns: {
              "company_name": string,"company_size": string,"job_url": string
            }[]
                           },
"ingest_deactivate":
{ Args: { "p_canonical": (string)[] }; Returns: number
                           },
"ingest_expire":
{ Args: { "p_max_age_days"?: number }; Returns: number
                           },
"ingest_finish_run":
{ Args: { "p_deactivated"?: number,"p_id": string,"p_inserted"?: number,"p_stats"?: Json,"p_status": string,"p_updated"?: number }; Returns: undefined
                           },
"ingest_mark_missing":
{ Args: { "p_run_started": string,"p_skip_companies"?: (string)[],"p_sources": (string)[] }; Returns: number
                           },
"ingest_start_run":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"started_at": string
            }[]
                           },
"ingest_upsert_jobs":
{ Args: { "p_jobs": Json }; Returns: {
              "inserted": number,"updated": number
            }[]
                           },
"term_start":
{ Args: { "p_term": string }; Returns: string
                           }
          }
          Enums: {
            "application_status": "wishlist"|"applied"|"oa"|"interviewing"|"offer"|"rejected"|"withdrawn","job_type": "internship"|"coop"|"new_grad"|"full_time","work_model": "remote"|"hybrid"|"onsite"
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
            "application_status": ["wishlist", "applied", "oa", "interviewing", "offer", "rejected", "withdrawn"],"job_type": ["internship", "coop", "new_grad", "full_time"],"work_model": ["remote", "hybrid", "onsite"]
          }
        }
} as const
