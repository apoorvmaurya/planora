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
    // allow a 1 cent rounding error
    return Math.abs(sum - data.amount) < 0.02;
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

  const { register, handleSubmit, control, watch, formState: { errors }, setValue, reset } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      split_type: 'equal',
      split_details: {}
    }
  })

  const splitType = watch("split_type")
  const amount = watch("amount") || 0

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
    try {
      const res = await fetch(`/api/plans/${planId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Failed to add expense")
      reset()
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error(err)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* AI Scan Receipt Section */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-dashed border-emerald-200 text-center relative overflow-hidden">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-2.5 bg-emerald-100/80 rounded-full text-emerald-700 animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-950">AI Receipt Scanner</h4>
                <p className="text-xs text-emerald-600/80 mt-0.5 font-normal">Upload or take a photo to pre-fill expense details instantly</p>
              </div>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleScanReceipt} 
                  disabled={isScanning || isSubmitting} 
                />
                <div className="mt-2.5 inline-flex items-center justify-center h-9 px-4 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition duration-150 disabled:opacity-50">
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
              <p className="text-xs text-red-600 font-medium mt-2 bg-red-50 p-2 rounded border border-red-100">
                {scanError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input {...register("title")} placeholder="E.g., Dinner at Mario's" />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" {...register("amount")} placeholder="0.00" />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Paid By</Label>
              <Controller
                control={control}
                name="paid_by"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.user.id} value={m.user.id}>
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
            <Label>Split Options</Label>
            <RadioGroup value={splitType} onValueChange={(val: string) => handleSplitTypeChange(val as 'equal' | 'custom')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equal" id="equal" />
                <Label htmlFor="equal">Split equally</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom amounts</Label>
              </div>
            </RadioGroup>
          </div>

          {splitType === 'custom' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <Label className="text-xs text-slate-500 uppercase">Exact Amounts</Label>
              {members.map(m => (
                <div key={m.user.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <img src={m.user.avatar_url || `https://ui-avatars.com/api/?name=${m.user.full_name}`} className="w-6 h-6 rounded-full" alt="" />
                    <span className="text-sm font-medium">{m.user.full_name}</span>
                  </div>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="w-24 h-8 text-right"
                    {...register(`split_details.${m.user.id}`)}
                  />
                </div>
              ))}
              {errors.split_details && <p className="text-sm text-red-500">{(errors.split_details as any).message || "Invalid custom splits"}</p>}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#1D9E75] hover:bg-[#15805e]">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
