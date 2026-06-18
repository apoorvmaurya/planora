import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Groups — Planora",
  description: "Manage your travel groups and plan collaborative trip itineraries.",
}

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
