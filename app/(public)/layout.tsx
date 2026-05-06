import { Metadata } from "next"
import { PlaBot } from "@/components/shared/PlaBot"

export const metadata: Metadata = {
  openGraph: {
    title: "Planora | Plans that actually happen",
    description: "Because group plans shouldn't die in the group chat. Planora aligns your friends, budgets, and schedules in one magical workspace.",
    url: "https://planora.app",
    siteName: "Planora",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Planora - Collaborative Trip Planning",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planora | Plans that actually happen",
    description: "Because group plans shouldn't die in the group chat. Planora aligns your friends, budgets, and schedules in one magical workspace.",
    images: ["/og-image.png"],
  },
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <PlaBot />
    </>
  )
}
