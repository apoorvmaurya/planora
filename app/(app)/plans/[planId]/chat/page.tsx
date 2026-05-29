"use client"

import React, { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Send, ArrowLeft, Bot, User, Wrench,
  Plus, Pencil, Trash2, ArrowLeftRight, CheckCircle2,
  AlertCircle, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

/* ── tool name → friendly label & icon mapping ── */
const toolMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  add_item:   { label: "Adding to itinerary",    icon: <Plus className="w-4 h-4" />,             color: "text-emerald-600" },
  edit_item:  { label: "Editing itinerary item",  icon: <Pencil className="w-4 h-4" />,           color: "text-blue-600" },
  delete_item:{ label: "Removing from itinerary", icon: <Trash2 className="w-4 h-4" />,            color: "text-red-500" },
  swap_items: { label: "Swapping itinerary items", icon: <ArrowLeftRight className="w-4 h-4" />,   color: "text-violet-600" },
}

/* ── extract a human-friendly tool name from part.type like "tool-add_item" ── */
function getToolName(partType: string): string {
  return partType.replace(/^tool-/, "")
}

export default function PlanChatPage() {
  const params = useParams()
  const planId = params.planId as string

  /* ── transport: tells useChat where to POST ── */
  const [transport] = useState(
    () => new DefaultChatTransport({ api: `/api/plans/${planId}/chat` })
  )

  const { messages, sendMessage, status, setMessages } = useChat({ transport })

  /* ── local input state (useChat v4 no longer manages this) ── */
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, status])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    await sendMessage({ text })
    inputRef.current?.focus()
  }

  const handleSuggestion = async (text: string) => {
    if (isLoading) return
    await sendMessage({ text })
  }

  const suggestions = [
    "Add a coffee shop visit on Day 1 morning",
    "Remove the museum from Day 2",
    "Swap lunch and dinner on Day 1",
    "What should we pack for this trip?",
  ]

  return (
    <div className="max-w-3xl mx-auto h-[calc(100dvh-100px)] flex flex-col pb-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/plans/${planId}`}>
          <Button variant="ghost" className="rounded-full w-10 h-10 p-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors duration-500">
            Planora AI <Sparkles className="w-5 h-5 text-[#1D9E75]" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1.5 transition-colors duration-500">
            <Wrench className="w-3 h-3" /> Can edit, add, remove &amp; reorder your itinerary
          </p>
        </div>
        {/* Live status pill */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-medium shrink-0 transition-all duration-300"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              {status === "submitted" ? "Thinking…" : "Responding…"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Chat body ── */}
      <div className="flex-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900/30 dark:to-slate-950">

          {/* ── Empty state ── */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 py-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 text-[#1D9E75] flex items-center justify-center mx-auto shadow-sm">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">What can I help with?</h3>
                <p className="text-sm max-w-sm text-slate-500 dark:text-slate-400">
                  Ask me to modify your itinerary, get travel tips, or manage your plan.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSuggestion(s)}
                    className="text-left text-sm p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1D9E75]/40 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  m.role === "user"
                    ? "bg-slate-900 dark:bg-slate-800 text-white"
                    : "bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 text-[#1D9E75]"
                }`}
              >
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div
                className={`rounded-2xl max-w-[82%] overflow-hidden ${
                  m.role === "user"
                    ? "bg-slate-900 dark:bg-slate-800 text-white rounded-tr-sm px-5 py-3"
                    : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-100 rounded-tl-sm"
                }`}
              >
                {m.parts.map((part, pi) => {
                  /* ── Text part ── */
                  if (part.type === "text") {
                    if (!part.text) return null
                    return (
                      <div key={pi} className={`whitespace-pre-wrap leading-relaxed ${m.role === "assistant" ? "px-5 py-3" : ""}`}>
                        {part.text}
                      </div>
                    )
                  }

                  /* ── Vercel AI SDK v4 Tool invocation part ── */
                  if (part.type === "tool-invocation") {
                    const toolInvocation = (part as any).toolInvocation
                    if (!toolInvocation) return null

                    const { state, toolName, args, result } = toolInvocation
                    const meta = toolMeta[toolName] || {
                      label: toolName.replace(/_/g, " "),
                      icon: <Wrench className="w-4 h-4" />,
                      color: "text-slate-600",
                    }

                    const isRunning = state === "partial-call" || state === "call"
                    const isDone = state === "result"
                    const isError = isDone && result && (result.error || result.success === false)

                    // Friendly detail summaries based on tool type & arguments
                    let detailsText = ""
                    if (isRunning) {
                      if (toolName === "add_item" && args?.title) {
                        detailsText = `Creating "${args.title}"...`
                      } else {
                        detailsText = "Updating your itinerary..."
                      }
                    } else if (isDone) {
                      if (isError) {
                        detailsText = result?.error || "Could not complete this change."
                      } else {
                        if (toolName === "add_item") {
                          const itemTitle = result?.item?.title || args?.title || "activity"
                          const time = result?.item?.time_of_day || args?.time_of_day || ""
                          const day = result?.item?.day !== undefined ? `Day ${result.item.day}` : ""
                          detailsText = `Added "${itemTitle}" to ${day} ${time}`.trim()
                        } else if (toolName === "edit_item") {
                          const itemTitle = result?.item?.title || args?.title || "activity"
                          detailsText = `Updated "${itemTitle}" successfully`
                        } else if (toolName === "delete_item") {
                          detailsText = "Removed the activity from your itinerary"
                        } else if (toolName === "swap_items") {
                          detailsText = "Successfully swapped the order of activities"
                        } else {
                          detailsText = "Itinerary updated successfully"
                        }
                      }
                    }

                    return (
                      <motion.div
                        key={pi}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="mx-3 my-2"
                      >
                        <div className={`rounded-xl border p-3 flex items-start gap-3 transition-all duration-500 ${
                          isDone && !isError
                            ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                            : isError
                            ? "bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-800/60"
                            : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                        }`}>
                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isDone && !isError
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                              : isError
                              ? "bg-red-100 dark:bg-red-950 text-red-500 dark:text-red-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}>
                            {isRunning ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isDone && !isError ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isError ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              meta.icon
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                isDone && !isError 
                                  ? "text-emerald-800 dark:text-emerald-300" 
                                  : isError 
                                  ? "text-red-700 dark:text-red-300" 
                                  : "text-slate-700 dark:text-slate-200"
                              }`}>
                                {meta.label}
                              </span>
                            </div>

                            {/* Status badge */}
                            <div className="mt-1.5">
                              {isRunning && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 rounded-md">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                  {detailsText || "Executing…"}
                                </span>
                              )}
                              {isDone && !isError && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {detailsText || "Done — itinerary updated"}
                                </span>
                              )}
                              {isError && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3" />
                                  {detailsText || "Action failed"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  }

                  /* ── step-start boundary (ignore visually) ── */
                  return null
                })}
              </div>
            </motion.div>
          ))}

          {/* ── Typing indicator when submitted but no assistant message yet ── */}
          <AnimatePresence>
            {status === "submitted" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 text-[#1D9E75] flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-5 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#1D9E75] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-[#1D9E75] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-[#1D9E75] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={endRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="p-3 md:p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Waiting for response…" : "Try: 'Add a beach day on Day 2'…"}
              disabled={isLoading}
              className="w-full h-13 pl-5 pr-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]/40 transition-all disabled:opacity-60"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-1.5 w-10 h-10 rounded-xl bg-[#1D9E75] hover:bg-[#15805e] disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
