"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function PlaBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
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

  const handleSubmit = async (e?: React.FormEvent, customInput?: string) => {
    e?.preventDefault()
    const text = customInput || input
    if (!text.trim() || isLoading) return
    
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    if (!customInput) setInput("")
    setIsLoading(true)
    
    try {
      const res = await fetch(`/api/plabot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      
      if (!res.ok) throw new Error("Failed to send message")
      if (!res.body) throw new Error("No response body")
      
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ""
      
      setMessages([...newMessages, { role: 'assistant', content: "" }])
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('0:')) {
            const text = JSON.parse(line.substring(2))
            assistantMsg += text
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: assistantMsg }
            ])
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[350px] h-[480px] bg-white rounded-3xl shadow-2xl border border-slate-100 mb-4 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-[#1D9E75] p-1.5 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">PlaBot</h3>
                  <p className="text-xs text-slate-400">Ask me anything about Planora</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-sm text-slate-700">
                    Hi! I&apos;m PlaBot. 👋 I can help answer any questions you have about Planora&apos;s features, pricing, or how the AI works. What&apos;s on your mind?
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase px-2">Suggested</p>
                    {suggestedQuestions.map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSubmit(undefined, q)}
                        className="block w-full text-left bg-white px-4 py-2 rounded-xl border border-slate-100 text-sm text-[#1D9E75] hover:bg-teal-50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, index) => (
                    <div key={index} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-[#1D9E75] text-white'}`}>
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[75%] text-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white border border-slate-100 shadow-sm text-slate-800 rounded-tl-sm whitespace-pre-wrap'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length-1]?.role === 'user' && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="px-4 py-3 bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full animate-bounce delay-100" />
                        <div className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Ask a question..." 
                  className="h-10 pl-4 pr-12 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-[#1D9E75]"
                />
                <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="absolute right-1 w-8 h-8 rounded-lg bg-[#1D9E75] hover:bg-[#15805e]">
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
        className="bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-full px-6 py-4 shadow-xl flex items-center gap-3 transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        <span className="font-bold">Ask PlaBot</span>
      </motion.button>
    </div>
  )
}
