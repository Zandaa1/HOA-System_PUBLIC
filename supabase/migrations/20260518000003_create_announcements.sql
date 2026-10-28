-- Create announcements table
CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."staff"("id")
);

-- Enable RLS
ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;

-- Staff can manage announcements
CREATE POLICY "staff_manage_announcements" ON "public"."announcements" 
FOR ALL TO "authenticated" 
USING (public.is_staff()) 
WITH CHECK (public.is_staff());

-- Everyone (authenticated residents and staff) can view announcements
CREATE POLICY "anyone_view_announcements" ON "public"."announcements" 
FOR SELECT TO "authenticated" 
USING (true);

-- Add audit trigger
DROP TRIGGER IF EXISTS audit_announcements ON public.announcements;
CREATE TRIGGER audit_announcements
AFTER INSERT OR UPDATE OR DELETE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
