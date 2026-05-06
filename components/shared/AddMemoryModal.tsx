"use client"

import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UploadCloud, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type AddMemoryModalProps = {
  planId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddMemoryModal({ planId, isOpen, onClose, onSuccess }: AddMemoryModalProps) {
  const { profile } = useUserStore()
  const supabase = createClient()
  
  const [files, setFiles] = useState<File[]>([])
  const [captions, setCaptions] = useState<{ [key: number]: string }>({})
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const validFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      setFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const validFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
      setFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setCaptions(prev => {
      const newCaptions = { ...prev }
      delete newCaptions[index]
      return newCaptions
    })
  }

  const handleUpload = async () => {
    if (files.length === 0 || !profile) return
    setIsUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${planId}/${profile.id}/${fileName}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('memories')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('memories')
          .getPublicUrl(filePath)

        // Insert into trip_memories
        const { error: dbError } = await supabase.from('trip_memories').insert({
          plan_id: planId,
          user_id: profile.id,
          photo_url: publicUrl,
          caption: captions[i] || ''
        })

        if (dbError) throw dbError
      }

      toast.success(`Successfully uploaded ${files.length} memor${files.length > 1 ? 'ies' : 'y'}!`)
      setFiles([])
      setCaptions({})
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to upload memories")
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Add Trip Memories</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-colors
                ${dragActive ? 'border-[#1D9E75] bg-teal-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-slate-900 font-medium text-lg">Click or drag photos here</p>
              <p className="text-slate-500 text-sm mt-1">Supports JPG, PNG, WEBP</p>
            </div>

            {/* Selected Files Preview */}
            {files.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  Selected Photos ({files.length})
                </h3>
                <div className="space-y-3">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex gap-4 p-3 bg-slate-50 rounded-2xl relative group">
                      <div className="w-20 h-20 shrink-0 bg-slate-200 rounded-xl overflow-hidden">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 truncate mb-2">{file.name}</p>
                        <input
                          type="text"
                          placeholder="Add a caption..."
                          value={captions[idx] || ''}
                          onChange={e => setCaptions(prev => ({ ...prev, [idx]: e.target.value }))}
                          className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
                        />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isUploading} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={files.length === 0 || isUploading}
              className="bg-[#1D9E75] hover:bg-[#15805e] text-white rounded-xl min-w-[120px]"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upload Memories'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
