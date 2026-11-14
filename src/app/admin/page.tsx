import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/admin/LoginForm";
import { FormAlert } from "@/components/forms/Field";
import { getAdmin } from "@/lib/auth";
import { connectDB, isDbConfigured } from "@/lib/db";
import { AdminUser } from "@/lib/models";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Sign In", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  let mode: "login" | "setup" | "nodb" = "nodb";
  if (isDbConfigured()) {
    if (await getAdmin()) redirect("/admin/dashboard");
    await connectDB();
    mode = (await AdminUser.exists({})) ? "login" : "setup";
  }
  return (
    <main className="grid-bg flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="card-neon w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 font-display text-2xl font-bold uppercase tracking-wide">
            {mode === "setup" ? "Set up Admin Portal" : "Admin Portal"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "setup" ? "Create the first owner account." : mode === "login" ? "Sign in to manage XVR." : "Configuration required"}
          </p>
        </div>
        {mode === "nodb" ? (
          <FormAlert kind="info">
            The database is not configured. Set <code className="text-cyan">MONGODB_URI</code> (and <code className="text-cyan">ADMIN_SETUP_TOKEN</code>) in the
            environment, then reload this page.
          </FormAlert>
        ) : (
          <LoginForm mode={mode} />
        )}
      </div>
    </main>
  );
}
