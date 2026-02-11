import { NextResponse } from "next/server";
import { z } from "zod/v4";
import crypto from "crypto";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createAdminClient } from "@/lib/supabase/admin";

const studentEntrySchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  email: z.email("Invalid email address"),
  cohort_id: z.uuid().optional(),
});

const bulkStudentSchema = z.object({
  students: z
    .array(studentEntrySchema)
    .min(1, "At least one student is required")
    .max(50, "Maximum 50 students per batch"),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = bulkStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { students } = parsed.data;
    const adminSupabase = createAdminClient();

    let created = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const student of students) {
      try {
        // Create auth user with a random password
        const randomPassword = crypto.randomBytes(24).toString("base64url");
        const { data: newUser, error: createError } =
          await adminSupabase.auth.admin.createUser({
            email: student.email,
            password: randomPassword,
            email_confirm: true,
          });

        if (createError || !newUser.user) {
          errors.push({
            email: student.email,
            error: createError?.message || "Failed to create user",
          });
          continue;
        }

        const userId = newUser.user.id;

        // Create profile
        await adminSupabase.from("profiles").upsert({
          id: userId,
          email: student.email,
          full_name: student.full_name,
          organization_id: auth.organizationId,
        });

        // Assign student role
        await adminSupabase.from("user_roles").insert({
          user_id: userId,
          organization_id: auth.organizationId,
          role: "student",
        });

        // Optionally enroll in cohort
        if (student.cohort_id) {
          await adminSupabase.from("enrollments").insert({
            user_id: userId,
            cohort_id: student.cohort_id,
            status: "active",
          });
        }

        created++;
      } catch (err) {
        errors.push({
          email: student.email,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(
      { data: { created, errors } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/students/bulk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
