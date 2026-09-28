'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Mic, Calendar, User, Tag, ChevronDown, Loader2, Play, Trash2, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createTask } from '@/app/actions/task'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { useUIStore } from '@/hooks/use-ui-store'
import { createClient } from '@supabase/supabase-js'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const { taskDefaults, triggerRefresh } = useUIStore()
  const [isRecording, setIsRecording] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const [availableProjects, setAvailableProjects] = useState<{id: string, name: string}[]>([])
  const [availableUsers, setAvailableUsers] = useState<{id: string, full_name: string}[]>([])

  // Form states
  const [projectId, setProjectId] = useState(taskDefaults?.projectId || '')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  // Audio Recording states
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Advanced features
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [checklistItems, setChecklistItems] = useState<{id: string, title: string, completed: boolean}[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, { id: `item-${Date.now()}`, title: newChecklistItem.trim(), completed: false }])
      setNewChecklistItem('')
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error("Error accessing microphone:", err)
      toast.error("Microphone access denied or not available.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }

  const toggleRecording = () => {
    if (isRecording) stopRecording()
    else {
      setAudioUrl(null)
      startRecording()
    }
  }

  const clearAudio = () => {
    setAudioUrl(null)
    setRecordingDuration(0)
  }

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopRecording()
      clearAudio()
    }
    return () => stopRecording()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      if (taskDefaults?.projectId) setProjectId(taskDefaults.projectId)
      
      // Fetch available projects and users
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      supabase.from('projects').select('id, name').then(({ data }) => {
        if (data) setAvailableProjects(data)
      })
      supabase.from('profiles').select('id, full_name').then(({ data }) => {
        if (data) setAvailableUsers(data)
      })
    }
  }, [isOpen, taskDefaults])

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast.error('Task title is required!')
      return
    }

    try {
      setIsLoading(true)
      const formData = new FormData()
      formData.append('title', taskTitle)
      formData.append('description', description)
      if (projectId) formData.append('projectId', projectId)
      if (assigneeId) formData.append('assigneeId', assigneeId)
      if (priority) formData.append('priority', priority)
      if (dueDate) formData.append('dueDate', dueDate.toISOString())
      if (taskDefaults?.status) formData.append('status', taskDefaults.status)
      
      const currentUserId = localStorage.getItem('userId')
      if (currentUserId) formData.append('reporterId', currentUserId)
      
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags))
      if (checklistItems.length > 0) formData.append('checklistItems', JSON.stringify(checklistItems))
      
      await createTask(formData)
      
      toast.success('Task created successfully!')
      setTaskTitle('')
      setDescription('')
      setTags([])
      setChecklistItems([])
      triggerRefresh()
      onClose()
    } catch (error) {
      toast.error('Failed to create task')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Blurred Overlay */}
      <div 
        className="absolute inset-0 bg-background/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f111a]/80 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-semibold text-white">Create New Task</h2>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Task Title</label>
            <input
              type="text"
              placeholder="e.g., Design user flow for onboarding"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Description</label>
            <textarea
              placeholder="Add details about the task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none"
            />
          </div>

          {/* Assign To & Voice Recording Row */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Assign To */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">Assign To (Role)</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-left text-white/80 transition-all hover:bg-black/40 focus:ring-1 focus:ring-primary/50">
                  <SelectValue placeholder="Select Doer/Manager" />
                </SelectTrigger>
                <SelectContent className="z-[110] bg-[#0f111a]/95 border-white/10 text-white backdrop-blur-xl">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice Recording */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-black/20 p-4 min-h-[120px]">
              {audioUrl ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <audio src={audioUrl} controls className="w-full h-8 [&::-webkit-media-controls-panel]:bg-white/10 [&::-webkit-media-controls-current-time-display]:text-white [&::-webkit-media-controls-time-remaining-display]:text-white" />
                  <button 
                    onClick={clearAudio}
                    className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-3 py-1.5 rounded-full"
                  >
                    <Trash2 className="h-3 w-3" /> Re-record
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={toggleRecording}
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300",
                      isRecording 
                        ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse" 
                        : "bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-110 hover:bg-cyan-400"
                    )}
                  >
                    {isRecording && (
                      <span className="absolute -inset-2 rounded-full border border-red-500/50 animate-ping" />
                    )}
                    {isRecording ? <StopCircle className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
                  </button>
                  <span className={cn("mt-2 text-xs font-medium transition-colors", isRecording ? "text-red-400 font-bold" : "text-white/60")}>
                    {isRecording ? `Recording... ${formatTime(recordingDuration)}` : "Record Voice Note"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">Project</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full h-12 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-white/80 transition-all hover:bg-black/40 focus:ring-1 focus:ring-primary/50">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent className="z-[110] bg-[#0f111a]/95 border-white/10 text-white backdrop-blur-xl">
                  {availableProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {availableProjects.length === 0 && (
                    <div className="px-2 py-2 text-sm text-white/50">No projects found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Priority */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full h-12 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-white/80 transition-all hover:bg-black/40 focus:ring-1 focus:ring-primary/50">
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent className="z-[110] bg-[#0f111a]/95 border-white/10 text-white backdrop-blur-xl">
                  <SelectItem value="low">
                    <span className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-blue-500"></span>Low</span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-yellow-500"></span>Medium</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-orange-500"></span>High</span>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-red-500"></span>Urgent</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-white/80 transition-all hover:bg-black/40">
                    <span className="text-sm">{dueDate ? format(dueDate, 'PPP') : 'Select Date'}</span>
                    <Calendar className="h-4 w-4 text-white/50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[110] w-auto p-0 border-white/10 bg-[#0f111a]" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="bg-[#0f111a] text-white rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-primary/20 text-primary border-primary/30 gap-1 rounded-lg">
                  {tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tag and press Enter"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="w-full sm:w-1/2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
              />
              <button type="button" onClick={handleAddTag} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">Add</button>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Checklist</label>
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {checklistItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-black/10 p-2 rounded-lg border border-white/5">
                  <Checkbox 
                    checked={item.completed}
                    onCheckedChange={(c) => setChecklistItems(items => items.map(i => i.id === item.id ? { ...i, completed: !!c } : i))}
                    className="border-white/30 data-[state=checked]:bg-primary"
                  />
                  <span className={cn("text-sm flex-1", item.completed ? "text-white/40 line-through" : "text-white/90")}>{item.title}</span>
                  <button onClick={() => setChecklistItems(items => items.filter(i => i.id !== item.id))} className="text-white/40 hover:text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add checklist item"
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
              />
              <button type="button" onClick={handleAddChecklistItem} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">Add</button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateTask}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
