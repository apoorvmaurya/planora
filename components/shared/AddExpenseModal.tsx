"use client"

import React, { useState } from "react"
import { z } from "zod"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Sparkles, Camera } from "lucide-react"
import { queueOfflineOp, offlineDB } from "@/lib/supabase/offlineSync"
import { toast } from "sonner"

const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paid_by: z.string().min(1, "Paid by is required"),
  split_type: z.enum(['equal', 'custom']),
  split_details: z.record(z.string(), z.coerce.number()).optional()
}).refine(data => {
  if (data.split_type === 'custom') {
    if (!data.split_details) return false;
    const sum = Object.values(data.split_details).reduce((a, b) => a + (b || 0), 0);
    // allow a 3 cent rounding error for custom split sums
    return Math.abs(sum - data.amount) < 0.03;
  }
  return true;
}, {
  message: "Custom splits must sum up to the total amount",
  path: ["split_details"]
})

type ExpenseFormValues = {
  title: string;
  amount: number;
  paid_by: string;
  split_type: 'equal' | 'custom';
  split_details?: Record<string, number>;
}

export function AddExpenseModal({ 
  isOpen, 
  onClose, 
  planId, 
  members,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  planId: string; 
  members: any[];
  onSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  
  // Interactive receipt splits state
  const [scannedItems, setScannedItems] = useState<{ itemName: string; cost: number; selectedUsers: string[] }[] | null>(null)

  const { register, handleSubmit, control, watch, formState: { errors }, setValue, reset } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      split_type: 'equal',
      split_details: {}
    }
  })

  const splitType = watch("split_type")
  const amount = watch("amount") || 0

  const recalculateSplits = (updatedItems: typeof scannedItems) => {
    if (!updatedItems) return
    const memberTotals: Record<string, number> = {}
    members.forEach(m => {
      memberTotals[m.user.id] = 0
    })

    let totalAmount = 0
    updatedItems.forEach(item => {
      totalAmount += item.cost
      if (item.selectedUsers.length > 0) {
        const share = parseFloat((item.cost / item.selectedUsers.length).toFixed(2))
        item.selectedUsers.forEach((userId, idx) => {
          if (idx === item.selectedUsers.length - 1) {
            // Adjust last person's share to prevent rounding errors
            const sumShares = share * (item.selectedUsers.length - 1)
            const lastShare = parseFloat((item.cost - sumShares).toFixed(2))
            memberTotals[userId] = parseFloat((memberTotals[userId] + lastShare).toFixed(2))
          } else {
            memberTotals[userId] = parseFloat((memberTotals[userId] + share).toFixed(2))
          }
        })
      }
    })

    setValue("amount", parseFloat(totalAmount.toFixed(2)))
    setValue("split_type", "custom")
    setValue("split_details", memberTotals)
  }

  const toggleUserOnItem = (itemIdx: number, userId: string) => {
    if (!scannedItems) return
    const nextItems = [...scannedItems]
    const item = nextItems[itemIdx]
    if (item.selectedUsers.includes(userId)) {
      item.selectedUsers = item.selectedUsers.filter(id => id !== userId)
    } else {
      item.selectedUsers = [...item.selectedUsers, userId]
    }
    setScannedItems(nextItems)
    recalculateSplits(nextItems)
  }

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setScanError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/plans/${planId}/expenses/scan`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to scan receipt")
      }

      const receipt = data.receipt
      if (receipt) {
        setValue("title", receipt.merchant || "Receipt Expense")
        setValue("amount", receipt.total || 0)

        if (Array.isArray(receipt.suggestedSplits) && receipt.suggestedSplits.length > 0) {
          const formatted = receipt.suggestedSplits.map((item: any) => ({
            itemName: item.itemName || "Item",
            cost: parseFloat(item.cost) || 0,
            selectedUsers: []
          }))
          setScannedItems(formatted)
        } else {
          setScannedItems(null)
        }
      }
    } catch (err: any) {
      console.error(err)
      setScanError(err.message || "An unexpected error occurred while scanning.")
    } finally {
      setIsScanning(false)
      // reset file input
      e.target.value = ""
    }
  }

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true)

    if (!navigator.onLine) {
      try {
        const cached = await offlineDB.expenses.get(planId)
        const currentList = cached?.data || []
        
        const payerUser = members.find(m => m.user.id === data.paid_by)?.user || { id: data.paid_by, full_name: 'Payer' }
        
        const optimisticExpense = {
          id: 'temp-exp-' + Date.now(),
          plan_id: planId,
          title: data.title,
          amount: data.amount,
          paid_by: data.paid_by,
          split_type: data.split_type,
          split_details: data.split_details,
          created_at: new Date().toISOString(),
          payer: payerUser
        }
        
        await offlineDB.expenses.put({ id: planId, planId, data: [optimisticExpense, ...currentList] })
        await queueOfflineOp(planId, 'ADD_EXPENSE', data)
        
        toast.info("Offline: Expense saved and queued for sync")
        setScannedItems(null)
        reset()
        onSuccess?.()
        onClose()
      } catch (err: any) {
        console.error("Offline expense save failed:", err)
        toast.error("Failed to save offline expense")
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    try {
      const res = await fetch(`/api/plans/${planId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Failed to add expense")
      
      // Update local cache of expenses
      try {
        const resList = await fetch(`/api/plans/${planId}/expenses`)
        const dataList = await resList.json()
        if (resList.ok) {
          await offlineDB.expenses.put({ id: planId, planId, data: dataList.expenses })
        }
      } catch (err) {
        console.error("Updating local expenses cache failed:", err)
      }

      setScannedItems(null)
      reset()
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Failed to add expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pre-fill custom split to be equal when switched
  const handleSplitTypeChange = (type: 'equal' | 'custom') => {
    setValue('split_type', type)
    if (type === 'custom' && members.length > 0) {
      const splitAmount = parseFloat((amount / members.length).toFixed(2))
      const newDetails: Record<string, number> = {}
      let totalAssigned = 0
      
      members.forEach((m, idx) => {
        if (idx === members.length - 1) {
          // Add remaining to last person to avoid rounding issues
          newDetails[m.user.id] = parseFloat((amount - totalAssigned).toFixed(2))
        } else {
          newDetails[m.user.id] = splitAmount
          totalAssigned += splitAmount
        }
      })
      setValue('split_details', newDetails)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all duration-500">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* AI Scan Receipt Section */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-800/60 text-center relative overflow-hidden transition-colors duration-500">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-2.5 bg-emerald-100/80 dark:bg-emerald-900/60 rounded-full text-emerald-700 dark:text-emerald-400 animate-pulse transition-colors duration-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-350 transition-colors duration-500">AI Receipt Scanner</h4>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-normal transition-colors duration-500">Upload or take a photo to pre-fill expense details instantly</p>
              </div>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleScanReceipt} 
                  disabled={isScanning || isSubmitting} 
                />
                <div className="mt-2.5 inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#16795A] hover:bg-[#115E46] text-white font-medium text-sm transition duration-150 disabled:opacity-50 cursor-pointer shadow-sm hover:shadow">
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Scan Receipt
                    </>
                  )}
                </div>
              </label>
            </div>
            {scanError && (
              <p className="text-xs text-red-650 font-medium mt-2 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-100 dark:border-red-900/30 transition-colors duration-500">
                {scanError}
              </p>
            )}
          </div>

          {/* Interactive Item Checklist from Scanned Receipt */}
          {scannedItems && scannedItems.length > 0 && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors duration-500">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Receipt Items (Select to claim)</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setScannedItems(null); setValue("split_type", "equal"); }} 
                  className="text-xs h-7 text-red-500 hover:text-red-650 cursor-pointer animate-fade-in"
                >
                  Clear Scanner
                </Button>
              </div>
              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {scannedItems.map((item, itemIdx) => (
                  <div key={itemIdx} className="space-y-1.5 border-b border-slate-200 dark:border-slate-850 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex justify-between text-xs font-bold text-slate-850 dark:text-slate-250">
                      <span className="truncate max-w-[200px]" title={item.itemName}>{item.itemName}</span>
                      <span>{item.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {members.map(m => {
                        const isSelected = item.selectedUsers.includes(m.user.id)
                        return (
                          <button
                            type="button"
                            key={m.user.id}
                            onClick={() => toggleUserOnItem(itemIdx, m.user.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                                : 'bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {m.user.full_name.split(' ')[0]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-slate-800 dark:text-slate-200 transition-colors duration-500">Description</Label>
            <Input {...register("title")} placeholder="E.g., Dinner at Mario's" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus-visible:ring-[#16795A] transition-all duration-300" />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-800 dark:text-slate-200 transition-colors duration-500">Amount</Label>
              <Input type="number" step="0.01" {...register("amount")} placeholder="0.00" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus-visible:ring-[#16795A] transition-all duration-300" />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800 dark:text-slate-200 transition-colors duration-500">Paid By</Label>
              <Controller
                control={control}
                name="paid_by"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-[#16795A] transition-all duration-300">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      {members.map(m => (
                        <SelectItem key={m.user.id} value={m.user.id} className="text-slate-900 dark:text-slate-100 cursor-pointer">
                          {m.user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paid_by && <p className="text-sm text-red-500">{errors.paid_by.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-800 dark:text-slate-200 transition-colors duration-500">Split Options</Label>
            <RadioGroup value={splitType} onValueChange={(val: string) => handleSplitTypeChange(val as 'equal' | 'custom')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equal" id="equal" className="transition-all duration-200" />
                <Label htmlFor="equal" className="text-slate-700 dark:text-slate-350 cursor-pointer transition-colors duration-500">Split equally</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" className="transition-all duration-200" />
                <Label htmlFor="custom" className="text-slate-700 dark:text-slate-350 cursor-pointer transition-colors duration-500">Custom amounts</Label>
              </div>
            </RadioGroup>
          </div>

          {splitType === 'custom' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors duration-500">
              <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Exact Amounts</Label>
              {members.map(m => (
                <div key={m.user.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {m.user.avatar_url ? (
                      <img src={m.user.avatar_url} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-800 object-cover" alt="" />
                    ) : (
                      <div className={`w-6 h-6 rounded-full border border-slate-200 dark:border-slate-800 bg-gradient-to-br ${(() => { const n = m.user.full_name || ''; let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); const g = ['from-indigo-500 to-purple-600','from-teal-400 to-emerald-600','from-blue-500 to-cyan-600','from-orange-400 to-rose-600']; return g[Math.abs(h) % g.length]; })()} flex items-center justify-center text-[8px] font-black text-white uppercase select-none`}>
                        {m.user.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors duration-500">{m.user.full_name}</span>
                  </div>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="w-24 h-8 text-right bg-white dark:bg-slate-950 border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg focus-visible:ring-[#16795A] transition-all duration-300"
                    {...register(`split_details.${m.user.id}`)}
                  />
                </div>
              ))}
              {errors.split_details && <p className="text-sm text-red-500">{(errors.split_details as any).message || "Invalid custom splits"}</p>}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl h-12 shadow-sm hover:shadow cursor-pointer transition-all duration-200">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
