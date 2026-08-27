"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, Bot, XCircle, User, Send, Loader2 } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

interface PlanChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
  planId: string
  profileName?: string
  onPlanUpdated?: () => void
}

export function PlanChatDrawer({
  isOpen,
  onClose,
  onOpen,
  planId,
  profileName = "Traveler",
  onPlanUpdated
}: PlanChatDrawerProps) {
  const [chatInput, setChatInput] = useState("")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/plans/${planId}/chat`
    }),
    onFinish: () => {
      onPlanUpdated?.()
    }
  })

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      const hasToolInvocation = lastMsg.parts?.some(p => p.type === 'tool-invocation')
      if (hasToolInvocation) {
        onPlanUpdated?.()
      }
    }
  }, [messages, onPlanUpdated])

  const handleSend = () => {
    if (!chatInput.trim() || status === 'streaming' || status === 'submitted') return
    sendMessage({ text: chatInput })
    setChatInput("")
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onOpen}
            aria-label="Open AI Chat"
            className="fixed bottom-6 right-6 z-40 bg-linear-to-tr from-[#16795A] to-teal-500 hover:from-[#115E46] hover:to-teal-600 text-white rounded-full p-4 shadow-xl shadow-teal-500/20 flex items-center justify-center cursor-pointer border border-teal-400/20 group"
          >
            <Sparkles className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-115 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200/50 dark:border-slate-800/50 shadow-2xl z-50 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/35">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 text-[#16795A] flex items-center justify-center shadow-inner">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-base">
                    Planora AI <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Travel Copilot</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                aria-label="Close Chat Drawer"
                className="rounded-full w-8 h-8 p-0 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            {/* Drawer Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-linear-to-b from-slate-50/30 to-white dark:from-slate-900/10 dark:to-slate-950">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-5 py-8 text-center px-4">
                  <div className="w-14 h-14 rounded-full bg-teal-50/60 dark:bg-teal-950/20 text-[#16795A] flex items-center justify-center shadow-sm">
                    <Bot className="w-7 h-7 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">How can I help you, {profileName}?</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-70">
                      Ask me to customize your activities, replan days, suggest restaurants, or check travel details.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-[320px]">
                    {["Add a coffee stop on Day 1", "Make Day 2 more relaxed", "Suggest local food options", "What should I pack for this trip?"].map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage({ text: s })}
                        className="text-left text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#16795A]/45 hover:bg-teal-50/50 dark:hover:bg-teal-950/10 transition-all text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm text-xs ${
                    m.role === "user"
                      ? "bg-slate-900 dark:bg-slate-800 text-white"
                      : "bg-linear-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 text-[#16795A]"
                  }`}>
                    {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`rounded-2xl max-w-[85%] text-sm overflow-hidden ${
                    m.role === "user"
                      ? "bg-slate-900 dark:bg-slate-800 text-white rounded-tr-sm px-4 py-2.5"
                      : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-100 rounded-tl-sm"
                  }`}>
                    {m.parts.map((part, pi) => {
                      if (part.type === "text") {
                        return (
                          <div key={pi} className={`whitespace-pre-wrap leading-relaxed ${m.role === "assistant" ? "px-4 py-2.5" : ""}`}>
                            {part.text}
                          </div>
                        )
                      }

                      if (part.type === "tool-invocation") {
                        const toolInvocation = (part as any).toolInvocation
                        if (!toolInvocation) return null

                        const { state, toolName, result } = toolInvocation
                        const isRunning = state === "partial-call" || state === "call"
                        const isDone = state === "result"
                        const isError = isDone && result && (result.error || result.success === false)

                        const toolMeta: Record<string, { label: string; icon: string }> = {
                          add_item: { label: "Adding Activity", icon: "➕" },
                          edit_item: { label: "Updating Activity", icon: "✏️" },
                          delete_item: { label: "Deleting Activity", icon: "🗑️" },
                          swap_items: { label: "Swapping order", icon: "🔄" },
                          bulk_update_itinerary: { label: "AI Bulk Update", icon: "✨" }
                        }
                        const meta = toolMeta[toolName] || { label: toolName, icon: "⚙️" }

                        let detailsText = ""
                        if (isRunning) {
                          detailsText = "Updating workspace..."
                        } else if (isDone) {
                          if (isError) {
                            detailsText = result?.error || "Could not apply edits."
                          } else {
                            if (toolName === "bulk_update_itinerary") {
                              detailsText = `Itinerary synced: modified ${result.upserted_count || 0} and removed ${result.deleted_count || 0} items.`
                            } else {
                              detailsText = "Itinerary synchronized successfully!"
                            }
                          }
                        }

                        return (
                          <div key={pi} className="mx-2 my-1.5">
                            <div className={`rounded-xl border p-2.5 flex items-center gap-3 text-xs transition-colors ${
                              isDone && !isError
                                ? "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                                : isError
                                ? "bg-red-50/50 dark:bg-red-950/15 border-red-200/50 dark:border-red-900/30 text-red-700 dark:text-red-300"
                                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-300"
                            }`}>
                              <span className="text-base shrink-0">{meta.icon}</span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold">{meta.label}</p>
                                <p className="text-[10px] opacity-80 mt-0.5 truncate">{detailsText}</p>
                              </div>
                              {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />}
                            </div>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900">
              <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask Planora AI..."
                  disabled={status === 'streaming' || status === 'submitted'}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16795A]/30"
                />
                <Button
                  type="submit"
                  disabled={!chatInput.trim() || status === 'streaming' || status === 'submitted'}
                  className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl px-4 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
