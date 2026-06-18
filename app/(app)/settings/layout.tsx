import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Account Settings — Planora",
  description: "Configure your Planora preferences, security settings, and notifications.",
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
