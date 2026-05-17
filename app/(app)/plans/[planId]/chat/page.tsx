"use client"

import React, { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Sparkles, Send, ArrowLeft, Bot, User, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function PlanChatPage() {
  const params = useParams()
  const planId = params.planId as string

  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const userMsg = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)
    
    try {
      const res = await fetch(`/api/plans/${planId}/chat`, {
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
        
        const chunk = decoder.decode(value, { stream: true })
        assistantMsg += chunk
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: assistantMsg }
        ])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const suggestions = [
    "Add a coffee shop visit on Day 1 morning",
    "Remove the museum from Day 2",
    "Swap lunch and dinner on Day 1",
    "What should we pack for this trip?",
  ]

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/plans/${planId}`}>
          <Button variant="ghost" className="rounded-full w-10 h-10 p-0"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Planora AI <Sparkles className="w-5 h-5 text-[#1D9E75]" />
          </h1>
          <p className="text-slate-500 text-sm flex items-center gap-1.5">
            <Wrench className="w-3 h-3" /> Can edit, add, remove & reorder your itinerary
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-teal-50 text-[#1D9E75] flex items-center justify-center mx-auto">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-700 text-lg">What can I help with?</h3>
                <p className="text-sm max-w-sm">Ask me to modify your itinerary, get travel tips, or manage your plan.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s) }}
                    className="text-left text-sm p-3 rounded-xl border border-slate-200 bg-white hover:border-[#1D9E75]/40 hover:bg-teal-50/50 transition-colors text-slate-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((m: any, index: number) => (
            <div key={index} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-teal-50 text-[#1D9E75]'}`}>
                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`px-5 py-3.5 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white border border-slate-100 shadow-sm text-slate-800 rounded-tl-sm whitespace-pre-wrap'}`}>
                {m.content || m.parts?.map((p: any) => p.text).join("")}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length-1]?.role === 'user' && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-50 text-[#1D9E75] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="px-5 py-4 bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm flex gap-1">
                <div className="w-2 h-2 bg-[#1D9E75] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#1D9E75] rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-[#1D9E75] rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <Input 
              value={input} 
              onChange={handleInputChange} 
              placeholder="Try: 'Add a beach day on Day 2' or 'Remove the museum visit'..." 
              className="h-14 pl-6 pr-14 rounded-2xl bg-slate-50 border-slate-200 text-base focus-visible:ring-[#1D9E75]"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="absolute right-2 w-10 h-10 rounded-xl bg-[#1D9E75] hover:bg-[#15805e]">
              <Send className="w-4 h-4 text-white" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
