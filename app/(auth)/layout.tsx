export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            VetsInTech
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Learning Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
