import { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Plans — Planora",
  description: "View and manage all your travel itineraries, drafts, and completed trips.",
}

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
