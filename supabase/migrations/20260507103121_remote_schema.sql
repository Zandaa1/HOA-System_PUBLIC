


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."advance_deposits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "deposit_date" "date" NOT NULL,
    "payment_method" "text",
    "reference_number" "text",
    "remaining_balance" numeric(10,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."advance_deposits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amenities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "capacity" integer,
    "hourly_rate" numeric(10,2) DEFAULT 0,
    "half_day_rate" numeric(10,2) DEFAULT 0,
    "full_day_rate" numeric(10,2) DEFAULT 0,
    "requires_deposit" boolean DEFAULT false,
    "deposit_amount" numeric(10,2) DEFAULT 0,
    "rules" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amenity_bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "amenity_id" "uuid",
    "property_id" "uuid",
    "booked_by_name" "text" NOT NULL,
    "booking_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "duration_type" "text",
    "num_guests" integer DEFAULT 1,
    "purpose" "text",
    "total_amount" numeric(10,2) DEFAULT 0,
    "deposit_paid" numeric(10,2) DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "approved_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "amenity_bookings_duration_type_check" CHECK (("duration_type" = ANY (ARRAY['hourly'::"text", 'half_day'::"text", 'full_day'::"text"]))),
    CONSTRAINT "amenity_bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."amenity_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amenity_schedules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "amenity_id" "uuid",
    "day_of_week" integer,
    "open_time" time without time zone,
    "close_time" time without time zone,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "amenity_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."amenity_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "staff_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_periods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "is_closed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billing_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_field_definitions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "field_name" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "options" "jsonb",
    "is_required" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "custom_field_definitions_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['property'::"text", 'homeowner'::"text", 'renter'::"text", 'vehicle'::"text"]))),
    CONSTRAINT "custom_field_definitions_field_type_check" CHECK (("field_type" = ANY (ARRAY['text'::"text", 'number'::"text", 'date'::"text", 'boolean'::"text", 'select'::"text"])))
);


ALTER TABLE "public"."custom_field_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_field_values" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "definition_id" "uuid",
    "entity_id" "uuid" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_field_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "discount_type" "text",
    "value" numeric(10,2) NOT NULL,
    "valid_from" "date",
    "valid_until" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "discounts_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"])))
);


ALTER TABLE "public"."discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "default_amount" numeric(10,2) DEFAULT 0,
    "is_recurring" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fee_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homeowners" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "middle_name" "text",
    "email" "text",
    "phone" "text",
    "secondary_phone" "text",
    "is_residing" boolean DEFAULT true,
    "move_in_date" "date",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "photo_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."homeowners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" "uuid",
    "fee_type_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "unit_price" numeric(10,2) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_number" "text" NOT NULL,
    "property_id" "uuid",
    "billing_period_id" "uuid",
    "issue_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "penalty_amount" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) DEFAULT 0,
    "amount_paid" numeric(10,2) DEFAULT 0,
    "balance" numeric(10,2) DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'paid'::"text", 'overdue'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" "uuid",
    "payment_number" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "payment_date" "date" NOT NULL,
    "payment_method" "text",
    "reference_number" "text",
    "received_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'check'::"text", 'bank_transfer'::"text", 'gcash'::"text", 'maya'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."penalties" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" "uuid",
    "penalty_type" "text",
    "amount" numeric(10,2) NOT NULL,
    "applied_date" "date" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "penalties_penalty_type_check" CHECK (("penalty_type" = ANY (ARRAY['late_fee'::"text", 'interest'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."penalties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "block" "text" NOT NULL,
    "lot" "text" NOT NULL,
    "phase" "text",
    "street_address" "text",
    "property_type_id" "uuid",
    "lot_area_sqm" numeric(10,2),
    "floor_area_sqm" numeric(10,2),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "status" "text" DEFAULT 'vacant'::"text",
    "monthly_dues_override" numeric(10,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "properties_status_check" CHECK (("status" = ANY (ARRAY['occupied'::"text", 'vacant'::"text", 'for_sale'::"text", 'for_rent'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "default_monthly_dues" numeric(10,2) DEFAULT 0,
    "color" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."renters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "middle_name" "text",
    "email" "text",
    "phone" "text",
    "lease_start" "date",
    "lease_end" "date",
    "monthly_rent" numeric(10,2),
    "security_deposit" numeric(10,2),
    "is_active" boolean DEFAULT true,
    "photo_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."renters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "is_system_role" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "employee_id" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "position" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "staff_id" "uuid",
    "role_id" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "text",
    "setting_type" "text",
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "system_settings_setting_type_check" CHECK (("setting_type" = ANY (ARRAY['string'::"text", 'number'::"text", 'boolean'::"text", 'json'::"text"])))
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "owner_type" "text",
    "owner_id" "uuid",
    "plate_number" "text" NOT NULL,
    "vehicle_type" "text",
    "brand" "text",
    "model" "text",
    "color" "text",
    "sticker_number" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "vehicles_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['homeowner'::"text", 'renter'::"text"]))),
    CONSTRAINT "vehicles_vehicle_type_check" CHECK (("vehicle_type" = ANY (ARRAY['car'::"text", 'motorcycle'::"text", 'suv'::"text", 'van'::"text", 'truck'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_bills" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reading_id" "uuid",
    "property_id" "uuid",
    "billing_period" "text",
    "consumption" numeric(12,2) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "invoice_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "water_bills_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."water_bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_meters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "meter_number" "text" NOT NULL,
    "installation_date" "date",
    "last_reading_date" "date",
    "last_reading_value" numeric(12,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."water_meters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_rates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "min_consumption" numeric(10,2) NOT NULL,
    "max_consumption" numeric(10,2),
    "rate_per_cubic_meter" numeric(10,4) NOT NULL,
    "effective_from" "date" NOT NULL,
    "effective_until" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."water_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_readings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "meter_id" "uuid",
    "reading_date" "date" NOT NULL,
    "previous_reading" numeric(12,2) NOT NULL,
    "current_reading" numeric(12,2) NOT NULL,
    "consumption" numeric(12,2) NOT NULL,
    "read_by" "uuid",
    "photo_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."water_readings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."advance_deposits"
    ADD CONSTRAINT "advance_deposits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amenity_bookings"
    ADD CONSTRAINT "amenity_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amenity_schedules"
    ADD CONSTRAINT "amenity_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_periods"
    ADD CONSTRAINT "billing_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_field_definitions"
    ADD CONSTRAINT "custom_field_definitions_entity_type_field_name_key" UNIQUE ("entity_type", "field_name");



ALTER TABLE ONLY "public"."custom_field_definitions"
    ADD CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_field_values"
    ADD CONSTRAINT "custom_field_values_definition_id_entity_id_key" UNIQUE ("definition_id", "entity_id");



ALTER TABLE ONLY "public"."custom_field_values"
    ADD CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_types"
    ADD CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homeowners"
    ADD CONSTRAINT "homeowners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_number_key" UNIQUE ("payment_number");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_block_lot_key" UNIQUE ("block", "lot");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_types"
    ADD CONSTRAINT "property_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."renters"
    ADD CONSTRAINT "renters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_roles"
    ADD CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_roles"
    ADD CONSTRAINT "staff_roles_staff_id_role_id_key" UNIQUE ("staff_id", "role_id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_bills"
    ADD CONSTRAINT "water_bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_meters"
    ADD CONSTRAINT "water_meters_meter_number_key" UNIQUE ("meter_number");



ALTER TABLE ONLY "public"."water_meters"
    ADD CONSTRAINT "water_meters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_rates"
    ADD CONSTRAINT "water_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_readings"
    ADD CONSTRAINT "water_readings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advance_deposits"
    ADD CONSTRAINT "advance_deposits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amenity_bookings"
    ADD CONSTRAINT "amenity_bookings_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amenity_bookings"
    ADD CONSTRAINT "amenity_bookings_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."amenity_bookings"
    ADD CONSTRAINT "amenity_bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amenity_schedules"
    ADD CONSTRAINT "amenity_schedules_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."custom_field_values"
    ADD CONSTRAINT "custom_field_values_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "public"."custom_field_definitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homeowners"
    ADD CONSTRAINT "homeowners_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "public"."fee_types"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_billing_period_id_fkey" FOREIGN KEY ("billing_period_id") REFERENCES "public"."billing_periods"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "public"."property_types"("id");



ALTER TABLE ONLY "public"."renters"
    ADD CONSTRAINT "renters_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_roles"
    ADD CONSTRAINT "staff_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_roles"
    ADD CONSTRAINT "staff_roles_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."water_bills"
    ADD CONSTRAINT "water_bills_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."water_bills"
    ADD CONSTRAINT "water_bills_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."water_bills"
    ADD CONSTRAINT "water_bills_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "public"."water_readings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."water_meters"
    ADD CONSTRAINT "water_meters_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."water_readings"
    ADD CONSTRAINT "water_readings_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "public"."water_meters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."water_readings"
    ADD CONSTRAINT "water_readings_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "public"."staff"("id");



ALTER TABLE "public"."advance_deposits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "advance_deposits_delete" ON "public"."advance_deposits" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "advance_deposits_insert" ON "public"."advance_deposits" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "advance_deposits_select" ON "public"."advance_deposits" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "advance_deposits_update" ON "public"."advance_deposits" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "amenities_delete" ON "public"."amenities" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "amenities_insert" ON "public"."amenities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "amenities_select" ON "public"."amenities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "amenities_update" ON "public"."amenities" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."amenity_bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "amenity_bookings_delete" ON "public"."amenity_bookings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "amenity_bookings_insert" ON "public"."amenity_bookings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "amenity_bookings_select" ON "public"."amenity_bookings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "amenity_bookings_update" ON "public"."amenity_bookings" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."amenity_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "amenity_schedules_delete" ON "public"."amenity_schedules" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "amenity_schedules_insert" ON "public"."amenity_schedules" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "amenity_schedules_select" ON "public"."amenity_schedules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "amenity_schedules_update" ON "public"."amenity_schedules" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "audit_logs_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."billing_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_periods_delete" ON "public"."billing_periods" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "billing_periods_insert" ON "public"."billing_periods" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "billing_periods_select" ON "public"."billing_periods" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "billing_periods_update" ON "public"."billing_periods" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."custom_field_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_field_definitions_delete" ON "public"."custom_field_definitions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "custom_field_definitions_insert" ON "public"."custom_field_definitions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "custom_field_definitions_select" ON "public"."custom_field_definitions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "custom_field_definitions_update" ON "public"."custom_field_definitions" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."custom_field_values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_field_values_delete" ON "public"."custom_field_values" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "custom_field_values_insert" ON "public"."custom_field_values" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "custom_field_values_select" ON "public"."custom_field_values" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "custom_field_values_update" ON "public"."custom_field_values" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."discounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discounts_delete" ON "public"."discounts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "discounts_insert" ON "public"."discounts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "discounts_select" ON "public"."discounts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "discounts_update" ON "public"."discounts" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."fee_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fee_types_delete" ON "public"."fee_types" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "fee_types_insert" ON "public"."fee_types" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "fee_types_select" ON "public"."fee_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fee_types_update" ON "public"."fee_types" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."homeowners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "homeowners_delete" ON "public"."homeowners" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "homeowners_insert" ON "public"."homeowners" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "homeowners_select" ON "public"."homeowners" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "homeowners_update" ON "public"."homeowners" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_items_delete" ON "public"."invoice_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "invoice_items_insert" ON "public"."invoice_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "invoice_items_select" ON "public"."invoice_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "invoice_items_update" ON "public"."invoice_items" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_delete" ON "public"."invoices" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "invoices_insert" ON "public"."invoices" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "invoices_select" ON "public"."invoices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "invoices_update" ON "public"."invoices" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_delete" ON "public"."payments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "payments_insert" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "payments_update" ON "public"."payments" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."penalties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "penalties_delete" ON "public"."penalties" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "penalties_insert" ON "public"."penalties" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "penalties_select" ON "public"."penalties" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "penalties_update" ON "public"."penalties" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_delete" ON "public"."properties" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "properties_insert" ON "public"."properties" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "properties_select" ON "public"."properties" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "properties_update" ON "public"."properties" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."property_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_types_delete" ON "public"."property_types" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "property_types_insert" ON "public"."property_types" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "property_types_select" ON "public"."property_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "property_types_update" ON "public"."property_types" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."renters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "renters_delete" ON "public"."renters" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "renters_insert" ON "public"."renters" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "renters_select" ON "public"."renters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "renters_update" ON "public"."renters" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_delete" ON "public"."roles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "roles_insert" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "roles_select" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "roles_update" ON "public"."roles" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_delete" ON "public"."staff" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "staff_insert" ON "public"."staff" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."staff_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_roles_delete" ON "public"."staff_roles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "staff_roles_insert" ON "public"."staff_roles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "staff_roles_select" ON "public"."staff_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "staff_roles_update" ON "public"."staff_roles" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "staff_select" ON "public"."staff" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "staff_update" ON "public"."staff" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_settings_delete" ON "public"."system_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "system_settings_insert" ON "public"."system_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "system_settings_select" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "system_settings_update" ON "public"."system_settings" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicles_delete" ON "public"."vehicles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "vehicles_insert" ON "public"."vehicles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "vehicles_select" ON "public"."vehicles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "vehicles_update" ON "public"."vehicles" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."water_bills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "water_bills_delete" ON "public"."water_bills" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "water_bills_insert" ON "public"."water_bills" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "water_bills_select" ON "public"."water_bills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "water_bills_update" ON "public"."water_bills" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."water_meters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "water_meters_delete" ON "public"."water_meters" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "water_meters_insert" ON "public"."water_meters" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "water_meters_select" ON "public"."water_meters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "water_meters_update" ON "public"."water_meters" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."water_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "water_rates_delete" ON "public"."water_rates" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "water_rates_insert" ON "public"."water_rates" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "water_rates_select" ON "public"."water_rates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "water_rates_update" ON "public"."water_rates" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."water_readings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "water_readings_delete" ON "public"."water_readings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "water_readings_insert" ON "public"."water_readings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "water_readings_select" ON "public"."water_readings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "water_readings_update" ON "public"."water_readings" FOR UPDATE TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."advance_deposits" TO "anon";
GRANT ALL ON TABLE "public"."advance_deposits" TO "authenticated";
GRANT ALL ON TABLE "public"."advance_deposits" TO "service_role";



GRANT ALL ON TABLE "public"."amenities" TO "anon";
GRANT ALL ON TABLE "public"."amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."amenities" TO "service_role";



GRANT ALL ON TABLE "public"."amenity_bookings" TO "anon";
GRANT ALL ON TABLE "public"."amenity_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."amenity_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."amenity_schedules" TO "anon";
GRANT ALL ON TABLE "public"."amenity_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."amenity_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."billing_periods" TO "anon";
GRANT ALL ON TABLE "public"."billing_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_periods" TO "service_role";



GRANT ALL ON TABLE "public"."custom_field_definitions" TO "anon";
GRANT ALL ON TABLE "public"."custom_field_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_field_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."custom_field_values" TO "anon";
GRANT ALL ON TABLE "public"."custom_field_values" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_field_values" TO "service_role";



GRANT ALL ON TABLE "public"."discounts" TO "anon";
GRANT ALL ON TABLE "public"."discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."discounts" TO "service_role";



GRANT ALL ON TABLE "public"."fee_types" TO "anon";
GRANT ALL ON TABLE "public"."fee_types" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_types" TO "service_role";



GRANT ALL ON TABLE "public"."homeowners" TO "anon";
GRANT ALL ON TABLE "public"."homeowners" TO "authenticated";
GRANT ALL ON TABLE "public"."homeowners" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."penalties" TO "anon";
GRANT ALL ON TABLE "public"."penalties" TO "authenticated";
GRANT ALL ON TABLE "public"."penalties" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_types" TO "anon";
GRANT ALL ON TABLE "public"."property_types" TO "authenticated";
GRANT ALL ON TABLE "public"."property_types" TO "service_role";



GRANT ALL ON TABLE "public"."renters" TO "anon";
GRANT ALL ON TABLE "public"."renters" TO "authenticated";
GRANT ALL ON TABLE "public"."renters" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_roles" TO "anon";
GRANT ALL ON TABLE "public"."staff_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_roles" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."water_bills" TO "anon";
GRANT ALL ON TABLE "public"."water_bills" TO "authenticated";
GRANT ALL ON TABLE "public"."water_bills" TO "service_role";



GRANT ALL ON TABLE "public"."water_meters" TO "anon";
GRANT ALL ON TABLE "public"."water_meters" TO "authenticated";
GRANT ALL ON TABLE "public"."water_meters" TO "service_role";



GRANT ALL ON TABLE "public"."water_rates" TO "anon";
GRANT ALL ON TABLE "public"."water_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."water_rates" TO "service_role";



GRANT ALL ON TABLE "public"."water_readings" TO "anon";
GRANT ALL ON TABLE "public"."water_readings" TO "authenticated";
GRANT ALL ON TABLE "public"."water_readings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


