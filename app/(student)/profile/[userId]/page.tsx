import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { getStudentCertificates } from "@/lib/domains/certificates/queries";
import { User, Award, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  return {
    title: data?.full_name ? `${data.full_name} — Profile` : "Profile",
  };
}

interface PublicProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  // Auth check: must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  // Fetch the viewed profile
  const { data: viewedProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, bio, avatar_url, organization_id, created_at")
    .eq("id", userId)
    .single();

  if (profileError || !viewedProfile) notFound();

  // Fetch certificates for this user
  const certificates = await getStudentCertificates(
    userId,
    viewedProfile.organization_id
  );

  const isOwnProfile = user.id === userId;
  const memberSince = new Date(viewedProfile.created_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="flex items-start gap-6 p-6">
          {/* Avatar placeholder */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-700 text-2xl font-medium">
            {viewedProfile.full_name ? (
              viewedProfile.full_name.charAt(0).toUpperCase()
            ) : (
              <User className="h-8 w-8" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">
                {viewedProfile.full_name || "Unnamed User"}
              </h1>
              {isOwnProfile && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={ROUTES.profile}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit Profile
                  </Link>
                </Button>
              )}
            </div>

            <p className="text-sm text-slate-400">{viewedProfile.email}</p>

            {viewedProfile.bio && (
              <p className="text-sm text-slate-300">{viewedProfile.bio}</p>
            )}

            <p className="text-xs text-slate-500">
              Member since {memberSince}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-blue-500" />
            Earned Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certificates.length > 0 ? (
            <div className="space-y-3">
              {certificates.map((cert) => {
                const issuedDate = new Date(
                  cert.issued_at
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <Link
                    key={cert.id}
                    href={ROUTES.certificate(cert.id)}
                    className="flex items-center justify-between rounded-lg border border-slate-800 p-4 transition-colors hover:bg-slate-900"
                  >
                    <div>
                      <p className="font-medium">{cert.course_title}</p>
                      <p className="text-xs text-slate-500">
                        Issued {issuedDate}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      <Award className="mr-1 h-3 w-3" />
                      Certified
                    </Badge>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-700 py-8 text-center">
              <Award className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">
                No certificates earned yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
