'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Mic, Calendar, User, Tag, ChevronDown, Loader2, Play, Trash2, StopCircle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createTask } from '@/app/actions/task'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@supabase/ssr'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { useUIStore } from '@/hooks/use-ui-store'

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
  const [isRecurring, setIsRecurring] = useState(false)

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
      if (taskDefaults?.assigneeId) setAssigneeId(taskDefaults.assigneeId)
      
      // Fetch available projects and users
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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
      if (projectId && projectId !== 'unassigned') formData.append('projectId', projectId)
      if (assigneeId) formData.append('assigneeId', assigneeId)
      if (priority) formData.append('priority', priority)
      if (dueDate) formData.append('dueDate', dueDate.toISOString())
      if (taskDefaults?.status) formData.append('status', taskDefaults.status)
      
      const currentUserId = localStorage.getItem('userId')
      if (currentUserId) formData.append('reporterId', currentUserId)
      
      // Upload audio to Supabase Storage if recorded
      if (audioUrl) {
        try {
          const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
          const response = await fetch(audioUrl)
          const blob = await response.blob()
          const fileName = `task_audio_${Date.now()}.webm`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('task-files')
            .upload(fileName, blob, { contentType: 'audio/webm' })
          if (uploadData && !uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('task-files').getPublicUrl(fileName)
            formData.append('audioUrl', publicUrl)
          }
        } catch (audioErr) {
          console.error('Audio upload failed (non-fatal):', audioErr)
        }
      }
      
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags))
      if (checklistItems.length > 0) formData.append('checklistItems', JSON.stringify(checklistItems))
      
      formData.append('isRecurring', isRecurring ? 'true' : 'false')
      if (isRecurring) {
        formData.append('recurringSchedule', 'daily')
      }
      
      const result = await createTask(formData)
      
      if (result && !result.success) {
        toast.error(result.error || 'Failed to create task')
        setIsLoading(false)
        return
      }

      toast.success('Task created successfully!')
      setTaskTitle('')
      setDescription('')
      setTags([])
      setChecklistItems([])
      setIsRecurring(false)
      triggerRefresh()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task')
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full sm:w-11/12 max-w-2xl max-h-[90vh] h-full sm:h-auto overflow-y-auto rounded-t-[2.25rem] sm:rounded-[2.25rem] border border-border/80 bg-card text-card-foreground p-6 sm:p-7 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-300 fixed sm:relative bottom-0 sm:bottom-auto inset-x-0"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Create New Task</h2>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Title</label>
            <input
              type="text"
              placeholder="e.g., Design user flow for onboarding"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 focus:bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              placeholder="Add details about the task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 focus:bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium resize-none"
            />
          </div>

          {/* Assign To & Voice Recording Row */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Assign To */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Assign To (Role)</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="w-full h-12 rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 px-4 py-3 text-left text-foreground transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select Doer/Manager" />
                </SelectTrigger>
                <SelectContent className="z-[110] bg-popover border-border text-popover-foreground shadow-2xl rounded-2xl">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice Recording */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-muted/30 p-4 min-h-[120px]">
              {audioUrl ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <audio src={audioUrl} controls className="w-full h-9" />
                  <button 
                    onClick={clearAudio}
                    className="flex items-center gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors px-3 py-1.5 rounded-full"
                  >
                    <Trash2 className="h-3 w-3" /> Re-record
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={toggleRecording}
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 shadow-md",
                      isRecording 
                        ? "bg-red-500 shadow-red-500/50 animate-pulse text-white" 
                        : "bg-primary text-primary-foreground shadow-primary/30 hover:scale-105 hover:brightness-110 active:scale-95"
                    )}
                  >
                    {isRecording && (
                      <span className="absolute -inset-2 rounded-full border border-red-500/50 animate-ping" />
                    )}
                    {isRecording ? <StopCircle className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6" />}
                  </button>
                  <span className={cn("mt-2 text-xs font-semibold transition-colors", isRecording ? "text-red-500 font-bold" : "text-muted-foreground")}>
                    {isRecording ? `Recording... ${formatTime(recordingDuration)}` : "Record Voice Note"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full h-12 rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 px-4 py-3 text-left text-foreground transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent className="z-[110] bg-popover border-border text-popover-foreground shadow-2xl rounded-2xl">
                  <SelectItem value="unassigned">Direct Task (No Project)</SelectItem>
                  {availableProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {availableProjects.length === 0 && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">No projects found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Priority */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full h-12 rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 px-4 py-3 text-left text-foreground transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent className="z-[110] bg-popover border-border text-popover-foreground shadow-2xl rounded-2xl">
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
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 px-4 py-3 text-left text-foreground transition-all focus:ring-2 focus:ring-primary/20">
                    <span className="text-sm font-medium">{dueDate ? format(dueDate, 'PPP') : 'Select Date'}</span>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[110] w-auto p-2 border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="bg-popover text-foreground rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Daily Recurring Task Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-all">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl transition-colors", isRecurring ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <RotateCw className={cn("h-4 w-4", isRecurring && "animate-spin-slow")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  Daily Recurring Task
                  {isRecurring && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5 border-primary/30 text-primary bg-primary/10 font-bold">
                      Auto-Spawn Daily
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Automatically spawns a fresh copy every morning with today&apos;s deadline
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isRecurring}
              onClick={() => setIsRecurring(!isRecurring)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20",
                isRecurring ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                  isRecurring ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold">
                  {tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive transition-colors">
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
                className="w-full sm:w-1/2 rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 focus:bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button type="button" onClick={handleAddTag} className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 text-xs font-bold transition-colors">Add</button>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Checklist</label>
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {checklistItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                  <Checkbox 
                    checked={item.completed}
                    onCheckedChange={(c) => setChecklistItems(items => items.map(i => i.id === item.id ? { ...i, completed: !!c } : i))}
                    className="border-muted-foreground data-[state=checked]:bg-primary"
                  />
                  <span className={cn("text-sm flex-1 font-medium", item.completed ? "text-muted-foreground line-through" : "text-foreground")}>{item.title}</span>
                  <button onClick={() => setChecklistItems(items => items.filter(i => i.id !== item.id))} className="text-muted-foreground hover:text-destructive transition-colors">
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
                className="flex-1 rounded-2xl border border-input bg-muted/30 hover:bg-muted/50 focus:bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button type="button" onClick={handleAddChecklistItem} className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 text-xs font-bold transition-colors">Add</button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateTask}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-primary/40 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
