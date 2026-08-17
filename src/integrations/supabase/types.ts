export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          details: Json;
          entity: string;
          entity_id: string | null;
          id: string;
          user_email: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          details?: Json;
          entity: string;
          entity_id?: string | null;
          id?: string;
          user_email?: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          user_email?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      patient_intakes: {
        Row: {
          id: string;
          status: Database["public"]["Enums"]["patient_intake_status"];
          first_name: string;
          last_name: string;
          date_of_birth: string;
          sex_at_birth: string | null;
          preferred_name: string | null;
          pronouns: string | null;
          phone: string;
          email: string | null;
          address_line_1: string;
          address_line_2: string | null;
          suburb: string;
          state: string;
          postcode: string;
          medicare_number: string | null;
          medicare_reference_number: string | null;
          medicare_expiry: string | null;
          private_health_fund: string | null;
          private_health_member_number: string | null;
          emergency_contact_name: string;
          emergency_contact_relationship: string;
          emergency_contact_phone: string;
          reason_for_visit: string;
          current_symptoms: string | null;
          medical_conditions: string | null;
          past_surgeries: string | null;
          current_medications: string | null;
          allergies: string | null;
          family_history: string | null;
          regular_gp_name: string | null;
          regular_gp_practice: string | null;
          specialists: string | null;
          smoking_status: string | null;
          alcohol_use: string | null;
          accessibility_requirements: string | null;
          interpreter_language: string | null;
          privacy_consent: boolean;
          treatment_consent: boolean;
          consent_recorded_at: string | null;
          consent_recorded_by: string | null;
          internal_notes: string | null;
          created_by: string;
          updated_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: Database["public"]["Enums"]["patient_intake_status"];
          first_name: string;
          last_name: string;
          date_of_birth: string;
          sex_at_birth?: string | null;
          preferred_name?: string | null;
          pronouns?: string | null;
          phone: string;
          email?: string | null;
          address_line_1: string;
          address_line_2?: string | null;
          suburb: string;
          state?: string;
          postcode: string;
          medicare_number?: string | null;
          medicare_reference_number?: string | null;
          medicare_expiry?: string | null;
          private_health_fund?: string | null;
          private_health_member_number?: string | null;
          emergency_contact_name: string;
          emergency_contact_relationship: string;
          emergency_contact_phone: string;
          reason_for_visit: string;
          current_symptoms?: string | null;
          medical_conditions?: string | null;
          past_surgeries?: string | null;
          current_medications?: string | null;
          allergies?: string | null;
          family_history?: string | null;
          regular_gp_name?: string | null;
          regular_gp_practice?: string | null;
          specialists?: string | null;
          smoking_status?: string | null;
          alcohol_use?: string | null;
          accessibility_requirements?: string | null;
          interpreter_language?: string | null;
          privacy_consent?: boolean;
          treatment_consent?: boolean;
          consent_recorded_at?: string | null;
          consent_recorded_by?: string | null;
          internal_notes?: string | null;
          created_by: string;
          updated_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: Database["public"]["Enums"]["patient_intake_status"];
          first_name?: string;
          last_name?: string;
          date_of_birth?: string;
          sex_at_birth?: string | null;
          preferred_name?: string | null;
          pronouns?: string | null;
          phone?: string;
          email?: string | null;
          address_line_1?: string;
          address_line_2?: string | null;
          suburb?: string;
          state?: string;
          postcode?: string;
          medicare_number?: string | null;
          medicare_reference_number?: string | null;
          medicare_expiry?: string | null;
          private_health_fund?: string | null;
          private_health_member_number?: string | null;
          emergency_contact_name?: string;
          emergency_contact_relationship?: string;
          emergency_contact_phone?: string;
          reason_for_visit?: string;
          current_symptoms?: string | null;
          medical_conditions?: string | null;
          past_surgeries?: string | null;
          current_medications?: string | null;
          allergies?: string | null;
          family_history?: string | null;
          regular_gp_name?: string | null;
          regular_gp_practice?: string | null;
          specialists?: string | null;
          smoking_status?: string | null;
          alcohol_use?: string | null;
          accessibility_requirements?: string | null;
          interpreter_language?: string | null;
          privacy_consent?: boolean;
          treatment_consent?: boolean;
          consent_recorded_at?: string | null;
          consent_recorded_by?: string | null;
          internal_notes?: string | null;
          created_by?: string;
          updated_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      claude_export_chunks: {
        Row: {
          chunk: string;
          path: string;
          seq: number;
        };
        Insert: {
          chunk: string;
          path: string;
          seq: number;
        };
        Update: {
          chunk?: string;
          path?: string;
          seq?: number;
        };
        Relationships: [];
      };
      claude_export_meta: {
        Row: {
          byte_size: number;
          path: string;
          sha256: string;
        };
        Insert: {
          byte_size: number;
          path: string;
          sha256: string;
        };
        Update: {
          byte_size?: number;
          path?: string;
          sha256?: string;
        };
        Relationships: [];
      };
      medical_supply_items: {
        Row: {
          available_stock: number;
          category: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_reason: string | null;
          expiry_date: string | null;
          id: string;
          item_code: string;
          item_description: string;
          last_purchased_date: string | null;
          purchase_price_aud: number;
          reorder_level: number;
          reorder_notified: boolean;
          reorder_quantity: number;
          status: string;
          supplier_email: string;
          supplier_name: string;
          updated_at: string;
        };
        Insert: {
          available_stock?: number;
          category: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_reason?: string | null;
          expiry_date?: string | null;
          id?: string;
          item_code: string;
          item_description: string;
          last_purchased_date?: string | null;
          purchase_price_aud?: number;
          reorder_level?: number;
          reorder_notified?: boolean;
          reorder_quantity?: number;
          status?: string;
          supplier_email: string;
          supplier_name: string;
          updated_at?: string;
        };
        Update: {
          available_stock?: number;
          category?: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_reason?: string | null;
          expiry_date?: string | null;
          id?: string;
          item_code?: string;
          item_description?: string;
          last_purchased_date?: string | null;
          purchase_price_aud?: number;
          reorder_level?: number;
          reorder_notified?: boolean;
          reorder_quantity?: number;
          status?: string;
          supplier_email?: string;
          supplier_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          purchase_date: string;
          quantity: number;
          recorded_by: string | null;
          supplier_email: string;
          supplier_name: string;
          unit_price_aud: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          purchase_date?: string;
          quantity: number;
          recorded_by?: string | null;
          supplier_email: string;
          supplier_name: string;
          unit_price_aud: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          purchase_date?: string;
          quantity?: number;
          recorded_by?: string | null;
          supplier_email?: string;
          supplier_name?: string;
          unit_price_aud?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "medical_supply_items";
            referencedColumns: ["id"];
          },
        ];
      };
      reorder_notifications: {
        Row: {
          available_stock: number;
          created_at: string;
          email_status: string;
          id: string;
          item_code: string;
          item_description: string;
          item_id: string | null;
          reorder_level: number;
          reorder_quantity: number;
          sent_at: string;
          sent_to: string;
          supplier_email: string;
          supplier_name: string;
        };
        Insert: {
          available_stock: number;
          created_at?: string;
          email_status?: string;
          id?: string;
          item_code: string;
          item_description: string;
          item_id?: string | null;
          reorder_level: number;
          reorder_quantity: number;
          sent_at?: string;
          sent_to?: string;
          supplier_email: string;
          supplier_name: string;
        };
        Update: {
          available_stock?: number;
          created_at?: string;
          email_status?: string;
          id?: string;
          item_code?: string;
          item_description?: string;
          item_id?: string | null;
          reorder_level?: number;
          reorder_quantity?: number;
          sent_at?: string;
          sent_to?: string;
          supplier_email?: string;
          supplier_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reorder_notifications_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "medical_supply_items";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          movement_type: string;
          notes: string | null;
          performed_by: string | null;
          quantity_change: number;
          stock_after: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          movement_type: string;
          notes?: string | null;
          performed_by?: string | null;
          quantity_change: number;
          stock_after: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          movement_type?: string;
          notes?: string | null;
          performed_by?: string | null;
          quantity_change?: number;
          stock_after?: number;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "medical_supply_items";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      adjust_stock: {
        Args: { _change: number; _item_id: string; _reason: string };
        Returns: {
          available_stock: number;
          category: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_reason: string | null;
          expiry_date: string | null;
          id: string;
          item_code: string;
          item_description: string;
          last_purchased_date: string | null;
          purchase_price_aud: number;
          reorder_level: number;
          reorder_notified: boolean;
          reorder_quantity: number;
          status: string;
          supplier_email: string;
          supplier_name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "medical_supply_items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      compute_item_status: {
        Args: {
          _current_status: string;
          _reorder_level: number;
          _stock: number;
        };
        Returns: string;
      };
      current_user_email: { Args: never; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      is_staff_or_admin: { Args: never; Returns: boolean };
      log_client_event: {
        Args: {
          _action: string;
          _details?: Json;
          _entity: string;
          _entity_id?: string;
        };
        Returns: undefined;
      };
      mark_reorder_notification: {
        Args: { _notification_id: string; _status: string };
        Returns: undefined;
      };
      record_purchase: {
        Args: {
          _item_id: string;
          _purchase_date: string;
          _quantity: number;
          _supplier_email: string;
          _supplier_name: string;
          _unit_price: number;
        };
        Returns: {
          available_stock: number;
          category: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_reason: string | null;
          expiry_date: string | null;
          id: string;
          item_code: string;
          item_description: string;
          last_purchased_date: string | null;
          purchase_price_aud: number;
          reorder_level: number;
          reorder_notified: boolean;
          reorder_quantity: number;
          status: string;
          supplier_email: string;
          supplier_name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "medical_supply_items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_item: {
        Args: { _item_id: string };
        Returns: {
          available_stock: number;
          category: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_reason: string | null;
          expiry_date: string | null;
          id: string;
          item_code: string;
          item_description: string;
          last_purchased_date: string | null;
          purchase_price_aud: number;
          reorder_level: number;
          reorder_notified: boolean;
          reorder_quantity: number;
          status: string;
          supplier_email: string;
          supplier_name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "medical_supply_items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      soft_delete_item: {
        Args: { _item_id: string; _reason?: string };
        Returns: {
          available_stock: number;
          category: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_reason: string | null;
          expiry_date: string | null;
          id: string;
          item_code: string;
          item_description: string;
          last_purchased_date: string | null;
          purchase_price_aud: number;
          reorder_level: number;
          reorder_notified: boolean;
          reorder_quantity: number;
          status: string;
          supplier_email: string;
          supplier_name: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "medical_supply_items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      write_audit: {
        Args: {
          _action: string;
          _details: Json;
          _entity: string;
          _entity_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "staff";
      patient_intake_status:
        "Draft" | "Submitted" | "Under Review" | "Needs Information" | "Reviewed" | "Archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      patient_intake_status: [
        "Draft",
        "Submitted",
        "Under Review",
        "Needs Information",
        "Reviewed",
        "Archived",
      ],
    },
  },
} as const;
