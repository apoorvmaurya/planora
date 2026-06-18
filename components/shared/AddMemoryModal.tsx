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

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    // If the file is already small (e.g. less than 1MB), upload as-is
    if (file.size < 1024 * 1024) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height
        const maxDim = 1500

        // Scale resolution while keeping aspect ratio
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to Blob with quality parameter (0.8 = 80% JPEG quality)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          0.8
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
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
        
        // Dynamic client-side image compression prior to uploading
        const compressedFile = await compressImage(file)
        const fileExt = compressedFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${planId}/${profile.id}/${fileName}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('memories')
          .upload(filePath, compressedFile)

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
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col transition-all duration-500"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors duration-500">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Add Trip Memories</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full text-slate-500 dark:text-slate-400 transition-colors duration-500 cursor-pointer">
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
                border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300
                ${dragActive 
                  ? 'border-[#16795A] bg-teal-50/50 dark:bg-teal-950/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40'}
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
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mb-4 transition-colors duration-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-slate-900 dark:text-white font-medium text-lg transition-colors duration-500">Click or drag photos here</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 transition-colors duration-500">Supports JPG, PNG, WEBP</p>
            </div>

            {/* Selected Files Preview */}
            {files.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2 transition-colors duration-500">
                  <ImageIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  Selected Photos ({files.length})
                </h3>
                <div className="space-y-3">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl relative group transition-colors duration-500">
                      <div className="w-20 h-20 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden transition-colors duration-500">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mb-2 transition-colors duration-500">{file.name}</p>
                        <input
                          type="text"
                          placeholder="Add a caption..."
                          value={captions[idx] || ''}
                          onChange={e => setCaptions(prev => ({ ...prev, [idx]: e.target.value }))}
                          className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 outline-none focus:border-[#16795A] focus:ring-1 focus:ring-[#16795A] transition-all duration-300"
                        />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end gap-3 transition-colors duration-500">
            <Button variant="outline" onClick={onClose} disabled={isUploading} className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={files.length === 0 || isUploading}
              className="bg-[#16795A] hover:bg-[#115E46] text-white rounded-xl min-w-[120px] shadow-sm hover:shadow cursor-pointer transition-all duration-200"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upload Memories'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
