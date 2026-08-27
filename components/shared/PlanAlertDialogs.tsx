"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog"

interface PlanAlertDialogsProps {
  kickTarget: any
  setKickTarget: (user: any) => void
  onConfirmKick: () => Promise<void>
  showCancelDialog: boolean
  setShowCancelDialog: (show: boolean) => void
  onConfirmCancel: () => Promise<void>
  showDeleteDialog: boolean
  setShowDeleteDialog: (show: boolean) => void
  onConfirmDelete: () => Promise<void>
  planTitle?: string
}

export function PlanAlertDialogs({
  kickTarget,
  setKickTarget,
  onConfirmKick,
  showCancelDialog,
  setShowCancelDialog,
  onConfirmCancel,
  showDeleteDialog,
  setShowDeleteDialog,
  onConfirmDelete,
  planTitle = "this plan",
}: PlanAlertDialogsProps) {
  return (
    <>
      <AlertDialog open={!!kickTarget} onOpenChange={(open: boolean) => { if (!open) setKickTarget(null) }}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Remove member</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to remove <strong>{kickTarget?.full_name}</strong> from the group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>Cancel</AlertDialogClose>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={onConfirmKick}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Cancel this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              The plan will be marked as cancelled. Your itinerary and data will be preserved and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>Keep plan</AlertDialogClose>
            <Button
              className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
              onClick={onConfirmCancel}
            >
              Cancel plan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              This will permanently delete <strong>{planTitle}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" className="rounded-xl" />}>Keep plan</AlertDialogClose>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={onConfirmDelete}
            >
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
