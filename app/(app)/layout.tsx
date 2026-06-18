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
      <div className="premium-page-root">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-[#16795A] text-white px-4 py-2 rounded-xl font-bold shadow-md outline-none">
          Skip to content
        </a>
        <Sidebar />
        <main id="main-content" className="md:ml-64 pt-20 md:pt-0 min-h-screen">
          <PushPermissionBanner />
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  )
}
