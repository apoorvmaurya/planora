import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard — Planora",
  description: "Plan and coordinate your next group travel adventure with Planora's collaborative itinerary planner.",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
