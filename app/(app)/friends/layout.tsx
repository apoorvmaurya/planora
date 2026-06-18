import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Friends — Planora",
  description: "Connect with friends and family to plan group travel together.",
}

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
