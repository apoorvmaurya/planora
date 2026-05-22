import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Coming Soon | Planora",
  description: "Join the waitlist for Planora's upcoming premium tiers, share your feature suggestions, and see what the community is excited about.",
}

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
