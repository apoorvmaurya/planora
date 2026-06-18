import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile — Planora",
  description: "Manage your Planora account, user preferences, and trip history.",
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
