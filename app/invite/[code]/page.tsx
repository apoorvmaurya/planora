"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Users, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading")
  const [groupName, setGroupName] = useState("")
  const [groupId, setGroupId] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    async function joinGroup() {
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invite_code: code }),
        })

        const data = await res.json()

        if (res.status === 409) {
          setStatus("already")
          setGroupId(data.groupId)
          setGroupName(data.error)
          return
        }

        if (!res.ok) {
          setStatus("error")
          setErrorMsg(data.error || "Failed to join group")
          return
        }

        setStatus("success")
        setGroupId(data.groupId)
        setGroupName(data.groupName)
      } catch {
        setStatus("error")
        setErrorMsg("Something went wrong. Please try again.")
      }
    }

    joinGroup()
  }, [code])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full p-8 text-center"
      >
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-teal-50 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Joining group...</h2>
            <p className="text-slate-500">Hang tight, we&apos;re adding you to the group.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">You&apos;re in! 🎉</h2>
              <p className="text-slate-500">
                You&apos;ve joined <strong className="text-slate-900">{groupName}</strong>. Start planning your trip together.
              </p>
            </div>
            <Button
              onClick={() => router.push(`/groups/${groupId}`)}
              className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl h-12 px-8 w-full"
            >
              Go to group <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {status === "already" && (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Already a member</h2>
              <p className="text-slate-500">You&apos;re already part of this group.</p>
            </div>
            <Button
              onClick={() => router.push(`/groups/${groupId}`)}
              className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl h-12 px-8 w-full"
            >
              Go to group <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Couldn&apos;t join</h2>
              <p className="text-slate-500">{errorMsg}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="rounded-xl h-12 w-full">Dashboard</Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button className="bg-[#1D9E75] hover:bg-[#15805e] rounded-xl h-12 w-full">Login</Button>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
