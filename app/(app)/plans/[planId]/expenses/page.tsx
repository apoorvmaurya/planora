"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { motion } from "framer-motion"
import { Plus, Receipt, Download, ArrowRight, Wallet, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddExpenseModal } from "@/components/shared/AddExpenseModal"
import { ErrorState } from "@/components/shared/ErrorState"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { calculateRawSplits, calculateSimplifiedSplits, Expense, Settlement } from "@/lib/utils/splitCalculator"
import { syncOfflineOps, offlineDB } from "@/lib/supabase/offlineSync"

export default function ExpensesPage() {
  const params = useParams()
  const planId = params.planId as string
  const supabase = createClient()
  const { profile } = useUserStore()

  const [expenses, setExpenses] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [plan, setPlan] = useState<any>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [simplifyDebts, setSimplifyDebts] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch plan
      const { data: pData, error: pErr } = await supabase.from('plans').select('*').eq('id', planId).single()
      if (pErr) throw pErr
      setPlan(pData)
      await offlineDB.plans.put({ id: planId, data: pData })

      // Fetch members
      if (pData.group_id) {
        const { data: mData } = await supabase.from('group_members').select('user:profiles(*)').eq('group_id', pData.group_id)
        setMembers(mData || [])
      } else if (profile) {
        setMembers([{ user: profile }])
      }

      // Fetch expenses
      const res = await fetch(`/api/plans/${planId}/expenses`)
      const data = await res.json()
      if (res.ok) {
        setExpenses(data.expenses)
        await offlineDB.expenses.put({ id: planId, planId, data: data.expenses })
      }
    } catch (err) {
      console.warn("Offline or network failed in expenses page, loading from cache:", err)
      const localPlan = await offlineDB.plans.get(planId)
      if (localPlan) {
        setPlan(localPlan.data)
        if (localPlan.data.group_id) {
          const { data: mData } = await supabase.from('group_members').select('user:profiles(*)').eq('group_id', localPlan.data.group_id)
          if (mData) setMembers(mData)
        } else if (profile) {
          setMembers([{ user: profile }])
        }
      }
      
      const localExpenses = await offlineDB.expenses.get(planId)
      if (localExpenses) {
        setExpenses(localExpenses.data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  useEffect(() => {
    const handleOnline = () => {
      syncOfflineOps(planId, async () => {
        const res = await fetch(`/api/plans/${planId}/expenses`)
        const data = await res.json()
        if (res.ok) {
          setExpenses(data.expenses)
          await offlineDB.expenses.put({ id: planId, planId, data: data.expenses })
        }
      })
    }

    window.addEventListener('online', handleOnline)
    if (navigator.onLine) {
      handleOnline()
    }
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [planId])

  useEffect(() => {
    if (members.length > 0 && expenses.length >= 0) {
      const formattedMembers = members.map(m => ({
        user_id: m.user.id,
        full_name: m.user.full_name,
        avatar_url: m.user.avatar_url
      }))
      const newSettlements = simplifyDebts
        ? calculateSimplifiedSplits(expenses, formattedMembers)
        : calculateRawSplits(expenses, formattedMembers)
      setSettlements(newSettlements)
    }
  }, [expenses, members, simplifyDebts])

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) return <div className="text-center py-20 text-slate-500 dark:text-slate-400 transition-colors duration-500">Loading expenses...</div>
  if (!plan) return <ErrorState variant="not_found" title="Plan not found" backHref="/plans" backLabel="Back to plans" />

  const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0)
  const perPersonAvg = members.length > 0 ? totalSpent / members.length : 0
  
  // Calculate who paid most
  const paidTotals: Record<string, number> = {}
  expenses.forEach(e => {
    paidTotals[e.paid_by] = (paidTotals[e.paid_by] || 0) + e.amount
  })
  
  let topSpenderId: string | null = null
  let topSpenderAmount = 0
  Object.entries(paidTotals).forEach(([id, amount]) => {
    if (amount > topSpenderAmount) {
      topSpenderId = id
      topSpenderAmount = amount
    }
  })
  const topSpender = members.find(m => m.user.id === topSpenderId)?.user

  const getMemberName = (id: string) => members.find(m => m.user.id === id)?.user.full_name || 'Unknown'
  const getMemberAvatar = (id: string) => members.find(m => m.user.id === id)?.user.avatar_url

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8 px-4 sm:px-0">
      <Breadcrumb
        items={[
          { label: "Plans", href: "/plans" },
          { label: plan?.title || "Trip Itinerary", href: `/plans/${planId}` },
          { label: "Budget & Expenses" }
        ]}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Budget & Expenses</h1>
          <p className="text-slate-500 dark:text-slate-400 transition-colors duration-500">Track spending and settle debts</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint} className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-[#16795A] hover:bg-[#115E46] text-white shadow-sm shadow-teal-600/25">
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{plan.title} - Expense Report</h1>
        <p className="text-slate-500">
          Generated on {mounted ? new Date().toLocaleDateString() : ""}
        </p>
      </div>

      {/* Summary Cards */}
      <div className={plan.group_id ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-500">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400 dark:text-slate-400" /> Total Spent</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-500">
            {plan.currency} <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{totalSpent.toFixed(2)}</motion.span>
          </p>
        </div>
        {plan.group_id && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-500">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-400" /> Per Person Avg</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-500">
              {plan.currency} <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{perPersonAvg.toFixed(2)}</motion.span>
            </p>
          </div>
        )}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-500">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-2"><Receipt className="w-4 h-4 text-slate-400 dark:text-slate-400" /> Remaining Budget</p>
          <p className={`text-3xl font-bold ${plan.budget_total - totalSpent < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'} transition-colors duration-500`}>
            {plan.currency} {Math.max(0, plan.budget_total - totalSpent).toFixed(2)}
          </p>
          {plan.budget_total - totalSpent < 0 && (
            <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Over budget by {Math.abs(plan.budget_total - totalSpent).toFixed(2)}
            </p>
          )}
        </div>
        {plan.group_id && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-center items-center text-center transition-colors duration-500">
            {topSpender ? (
              <>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Top Spender</p>
                <UserAvatar
                  avatarUrl={topSpender.avatar_url}
                  name={topSpender.full_name}
                  userId={topSpenderId || ''}
                  size="w-10 h-10"
                  textSize="text-sm"
                  className="mb-2 border border-slate-200 dark:border-slate-700"
                />
                <p className="font-bold text-slate-900 dark:text-white text-sm transition-colors duration-500">{topSpender.full_name}</p>
                <p className="text-xs text-[#16795A] dark:text-teal-400 font-semibold">Paid {plan.currency}{topSpenderAmount.toFixed(2)}</p>
              </>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 text-sm transition-colors duration-500">No expenses yet</p>
            )}
          </div>
        )}
      </div>

      <div className={plan.group_id ? "grid lg:grid-cols-3 gap-8" : "max-w-3xl mx-auto space-y-6"}>
        {/* Expense List */}
        <div className={plan.group_id ? "lg:col-span-2 space-y-6" : "space-y-6"}>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">All Expenses</h2>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm transition-colors duration-500">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center transition-colors duration-500">
                <Receipt className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                <p>No expenses added yet.</p>
                <p className="text-sm text-slate-400">Add your first expense to see the split.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((exp: any) => (
                  <div key={exp.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/20 text-[#16795A] dark:text-teal-400 flex items-center justify-center shrink-0 transition-colors duration-500">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white transition-colors duration-500 truncate">{exp.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-500">
                          <UserAvatar
                            avatarUrl={exp.payer?.avatar_url}
                            name={exp.payer?.full_name}
                            userId={exp.paid_by}
                            size="w-4 h-4"
                            textSize="text-[6px]"
                            className="border border-slate-200 dark:border-slate-700"
                          />
                          <span>Paid by {exp.payer?.full_name}</span>
                          <span>•</span>
                          <span className="capitalize">{exp.split_type} split</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">
                            {mounted ? new Date(exp.created_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg text-slate-900 dark:text-white transition-colors duration-500">{plan.currency} {exp.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {plan.group_id && (
          /* Settlements */
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Who Owes Who</h2>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-500">
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Simplify Debts</p>
                  <p className="text-xs text-slate-500">Minimize transactions between members</p>
                </div>
                <button
                  onClick={() => setSimplifyDebts(!simplifyDebts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    simplifyDebts ? "bg-[#16795A]" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      simplifyDebts ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {simplifyDebts && (
                <div className="bg-teal-500/10 dark:bg-teal-500/5 border border-teal-500/20 rounded-2xl p-3.5 text-xs text-teal-800 dark:text-teal-400 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#16795A]" />
                  <div>
                    <span className="font-bold">✨ Premium Preview:</span> Simplified Settlements is in early preview for all users and will soon be a Premium feature.
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#16795A]/20 rounded-bl-full pointer-events-none" />
              
              {settlements.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Everyone is settled up!</p>
                </div>
              ) : (
                <div className="space-y-4 relative z-10">
                  {settlements.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/10 backdrop-blur rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={getMemberAvatar(s.from)}
                          name={getMemberName(s.from)}
                          userId={s.from}
                          size="w-8 h-8"
                          textSize="text-[10px]"
                          className="border border-white/20"
                        />
                        <div className="text-sm">
                          <p className="font-bold">{getMemberName(s.from)}</p>
                          <p className="text-white/60 text-xs">owes</p>
                        </div>
                      </div>
                      
                      <div className="px-2">
                        <ArrowRight className="w-4 h-4 text-[#16795A]" />
                      </div>

                      <div className="flex items-center gap-3 flex-row-reverse">
                        <UserAvatar
                          avatarUrl={getMemberAvatar(s.to)}
                          name={getMemberName(s.to)}
                          userId={s.to}
                          size="w-8 h-8"
                          textSize="text-[10px]"
                          className="border border-white/20"
                        />
                        <div className="text-sm text-right">
                          <p className="font-bold">{getMemberName(s.to)}</p>
                          <p className="text-[#16795A] font-bold">{plan.currency} {s.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settlement Template - Future Payment Integration */}
            {settlements.length > 0 && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden border border-slate-700">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full pointer-events-none" />
                <div className="relative z-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-lg">Settle Up</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    One-tap payment settlement via UPI, Stripe, or PayPal is coming soon.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <span className="bg-white/10 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full text-slate-300">UPI</span>
                    <span className="bg-white/10 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full text-slate-300">Stripe</span>
                    <span className="bg-white/10 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full text-slate-300">PayPal</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AddExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        planId={planId} 
        members={members}
        onSuccess={fetchData}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}} />
    </div>
  )
}
