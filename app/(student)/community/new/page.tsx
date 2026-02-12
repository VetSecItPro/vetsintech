import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { NewDiscussionForm } from "@/components/community/new-discussion-form";

export const metadata = {
  title: "New Discussion",
};

export default async function NewDiscussionPage() {
  await getAuthenticatedUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Discussion</h1>
        <p className="text-sm text-slate-500">
          Start a new conversation with the community
        </p>
      </div>

      <NewDiscussionForm />
    </div>
  );
}
