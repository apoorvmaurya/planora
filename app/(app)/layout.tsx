import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UserProvider } from "@/components/providers/UserProvider"
import { Sidebar } from "@/components/layout/Sidebar"
import { PushPermissionBanner } from "@/components/shared/PushPermissionBanner"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.username) {
    redirect("/onboarding")
  }

  return (
    <UserProvider initialProfile={profile}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="md:ml-64 pt-20 md:pt-0 min-h-screen">
          <PushPermissionBanner />
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  )
}
