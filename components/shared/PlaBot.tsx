"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Bot, User, Sparkles, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownText } from "@/components/shared/MarkdownText"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  isError?: boolean
  failedPrompt?: string
}

export function PlaBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const endRef = useRef<HTMLDivElement>(null)

  const suggestedQuestions = [
    "How does Planora work?",
    "Is it free?",
    "How does the AI plan trips?",
    "What is the Momentum Engine?",
    "Can I use it for solo trips?"
  ]

  const executeSend = async (
    textToSend: string,
    history: ChatMessage[],
    isRetry = false
  ): Promise<boolean> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const payloadMessages = history.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`/api/plabot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        let errorMsg = "PlaBot is temporarily busy. Please try again shortly."
        try {
          const json = await res.json()
          if (json.error) errorMsg = json.error
        } catch {
          const rawText = await res.text().catch(() => "")
          if (rawText) errorMsg = rawText
        }
        throw new Error(errorMsg)
      }

      if (!res.body) throw new Error("No response body received from PlaBot.")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ""

      // Seed assistant message placeholder
      const assistantId = "bot-" + Date.now()
      setMessages(prev => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" }
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        assistantMsg += chunk
        setMessages(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, content: assistantMsg } : m))
        )
      }

      // Check for empty stream after HTTP 200
      if (!assistantMsg.trim()) {
        throw new Error("PlaBot completed with no content.")
      }

      return true
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.warn("PlaBot fetch/stream error:", err)

      // If this was first attempt and failed with a transient error, attempt 1 auto-retry
      if (!isRetry && (err.name === "AbortError" || err.message?.includes("stream") || err.message?.includes("fetch"))) {
        return executeSend(textToSend, history, true)
      }

      const isTimeout = err.name === "AbortError"
      const friendlyMessage = isTimeout
        ? "I took a little too long thinking that through! Tap Retry and I'll try again."
        : (err.message && !err.message.includes("Object") && !err.message.includes("Unexpected")
            ? err.message
            : "Oops! I hit a momentary hiccup while fetching that answer. Tap Retry and I'll jump right back in!")

      setMessages(prev => {
        // If an empty assistant bubble is already appended at the end, replace it
        const last = prev[prev.length - 1]
        if (last && last.role === "assistant" && !last.content.trim()) {
          return prev.map((m, idx) =>
            idx === prev.length - 1
              ? { ...m, content: friendlyMessage, isError: true, failedPrompt: textToSend }
              : m
          )
        }
        // Otherwise append as a new error message
        return [
          ...prev,
          {
            id: "err-" + Date.now(),
            role: "assistant",
            content: friendlyMessage,
            isError: true,
            failedPrompt: textToSend,
          }
        ]
      })

      return false
    }
  }

  const handleSubmit = async (e?: React.FormEvent, customInput?: string) => {
    e?.preventDefault()
    const text = (customInput || input).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = { id: "user-" + Date.now(), role: "user", content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    if (!customInput) setInput("")
    setIsLoading(true)

    try {
      await executeSend(text, updatedMessages, false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async (failedPrompt?: string) => {
    if (isLoading) return
    const textToRetry = failedPrompt || messages.filter(m => m.role === "user").slice(-1)[0]?.content
    if (!textToRetry) return

    // Clean up trailing error assistant bubbles before retrying
    setMessages(prev => prev.filter(m => !(m.isError && m.failedPrompt === textToRetry)))
    await handleSubmit(undefined, textToRetry)
  }

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen, isLoading])

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[calc(100vw-2rem)] sm:w-[350px] max-w-[350px] h-[75vh] sm:h-[480px] max-h-[520px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 mb-3 sm:mb-4 flex flex-col overflow-hidden transition-all duration-500"
          >
            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 flex items-center justify-between transition-colors duration-500">
              <div className="flex items-center gap-2">
                <div className="bg-[#16795A] p-1.5 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">PlaBot</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Ask me anything about Planora</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close PlaBot"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 space-y-4 transition-colors duration-500">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-sm text-slate-700 dark:text-slate-300 transition-colors duration-500">
                    Hi! I&apos;m PlaBot. 👋 I can help answer any questions you have about Planora&apos;s features, upcoming premium plans, or how the AI works. What&apos;s on your mind?
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-2">Suggested</p>
                    {suggestedQuestions.map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSubmit(undefined, q)}
                        className="block w-full text-left bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-[#16795A] hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-900 dark:bg-slate-800 text-white" : m.isError ? "bg-red-500 text-white" : "bg-[#16795A] text-white"}`}>
                        {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                        m.role === "user" 
                          ? "bg-slate-900 dark:bg-slate-800 text-white rounded-tr-sm whitespace-pre-wrap" 
                          : m.isError
                            ? "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200 rounded-tl-sm whitespace-pre-wrap"
                            : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-200 rounded-tl-sm transition-colors duration-500"
                      }`}>
                        {m.role === "assistant" && !m.isError ? (
                          <MarkdownText content={m.content} />
                        ) : (
                          m.content
                        )}
                        {m.isError && (
                          <div className="mt-2.5 pt-2 border-t border-red-200 dark:border-red-900/50 flex items-center justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetry(m.failedPrompt)}
                              disabled={isLoading}
                              className="h-7 text-xs px-2.5 rounded-lg border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 gap-1.5 cursor-pointer font-medium"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#16795A] text-white flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl rounded-tl-sm flex gap-1 items-center transition-colors duration-500">
                        <div className="w-1.5 h-1.5 bg-[#16795A] rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-[#16795A] rounded-full animate-bounce delay-100" />
                        <div className="w-1.5 h-1.5 bg-[#16795A] rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors duration-500">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Ask a question..." 
                  className="h-10 pl-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus-visible:ring-[#16795A] transition-all"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()} 
                  size="icon" 
                  className="absolute right-1 w-8 h-8 rounded-lg bg-[#16795A] hover:bg-[#115E46] cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-full px-6 py-4 shadow-xl flex items-center gap-3 transition-colors cursor-pointer"
        aria-label={isOpen ? "Close PlaBot" : "Open PlaBot assistant"}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        <span className="font-bold">Ask PlaBot</span>
      </motion.button>
    </div>
  )
}
