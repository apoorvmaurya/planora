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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-[#16795A] text-white px-6 py-3 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl font-bold shadow-md outline-none transition-all duration-200">
          Skip to content
        </a>
        <Sidebar />
        <main id="main-content" className="md:ml-64 pt-20 md:pt-0 min-h-screen flex flex-col justify-between">
          <div className="w-full">
            <PushPermissionBanner />
            <div className="max-w-6xl mx-auto p-4 md:p-8">
              {children}
            </div>
          </div>
          <footer role="contentinfo" className="w-full py-6 px-4 md:px-8 border-t border-slate-200/50 dark:border-slate-800/50 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors duration-500">
            <p>&copy; {new Date().getFullYear()} Planora. All rights reserved.</p>
          </footer>
        </main>
      </div>
    </UserProvider>
  )
}
