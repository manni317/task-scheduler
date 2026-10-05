'use client'

import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, User, Tag, X, Edit, Trash2, MessageSquare, Paperclip, GitBranch, MoreHorizontal, Mic, StopCircle, Send, Upload, Play } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { Task, User as UserType, ChecklistItem, Comment, Attachment, TimeEntry, ActivityLog } from '@/types/task'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TaskForm } from './TaskForm'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface TaskDetailProps {
  task: Task
  users: UserType[]
  projects: { id: string; name: string; key: string }[]
  onUpdate: (task: Partial<Task>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onAddComment: (taskId: string, content: string) => Promise<void>
  onAddTimeEntry: (taskId: string, entry: Omit<TimeEntry, 'id' | 'userId' | 'user'>) => Promise<void>
  onToggleChecklist: (taskId: string, itemId: string) => Promise<void>
}

export function TaskDetail({ 
  task, 
  users, 
  projects, 
  onUpdate, 
  onDelete, 
  onAddComment,
  onAddTimeEntry,
  onToggleChecklist
}: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'comments' | 'activity' | 'attachments' | 'time' | 'dependencies'>('details')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [newComment, setNewComment] = useState('')
  const { profile } = useAuth()
  const userRole = profile?.role || 'employee'
  const userId = profile?.id || ''
  const userName = profile?.full_name || profile?.email || 'User'
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  
  // Comments/Updates state (loaded from DB)
  const [updates, setUpdates] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  
  // Audio recording
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadUpdates()
    loadAttachments()
  }, [task.id])

  const loadUpdates = async () => {
    const { data } = await supabase
      .from('task_updates')
      .select('*, profiles(full_name, avatar_url, role)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false })
    if (data) setUpdates(data)
  }

  const loadAttachments = async () => {
    const { data } = await supabase
      .from('task_attachments')
      .select('*, profiles(full_name)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false })
    if (data) setAttachments(data)
  }

  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdueTask = dueDate && isPast(dueDate) && !isToday(dueDate)
  const isDueToday = dueDate && isToday(dueDate)
  const isDueTomorrow = dueDate && isTomorrow(dueDate)

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const statusColors: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleStatusUpdate = async (newStatus: string, note?: string, extraUpdateData?: Partial<Task>) => {
    setIsUpdatingStatus(true)
    try {
      await onUpdate({ ...task, status: newStatus as any, ...extraUpdateData })
      // Save activity log
      if (userId) {
        await supabase.from('task_updates').insert({
          task_id: task.id,
          user_id: userId,
          content: note || `Status changed to ${newStatus.replace('_', ' ')}`,
          update_type: newStatus === 'review' ? 'submit_review' : 'status_change'
        })
        await loadUpdates()
      }
      toast.success(newStatus === 'review' ? 'Submitted for review!' : `Status updated to ${newStatus}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() && !audioUrl) return
    setIsSubmittingComment(true)
    try {
      let audioStorageUrl = null
      // Upload audio if exists
      if (audioUrl) {
        const response = await fetch(audioUrl)
        const blob = await response.blob()
        const fileName = `audio_${task.id}_${Date.now()}.webm`
        const { data: uploadData } = await supabase.storage
          .from('task-files')
          .upload(fileName, blob, { contentType: 'audio/webm' })
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('task-files').getPublicUrl(fileName)
          audioStorageUrl = publicUrl
        }
      }
      
      const content = audioStorageUrl 
        ? `${newComment.trim()}${newComment.trim() ? '\n' : ''}[audio:${audioStorageUrl}]`
        : newComment.trim()

      const { error: insertError } = await supabase.from('task_updates').insert({
        task_id: task.id,
        user_id: userId || null,
        content,
        update_type: 'comment'
      })
      if (insertError) throw insertError

      setNewComment('')
      setAudioUrl(null)
      await loadUpdates()
      toast.success('Update saved!')
    } catch (err) {
      toast.error('Failed to save update')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingFile(true)
    try {
      const fileName = `${task.id}_${Date.now()}_${file.name}`
      const { data: uploadData, error } = await supabase.storage
        .from('task-files')
        .upload(fileName, file)
      
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage.from('task-files').getPublicUrl(fileName)
      
      await supabase.from('task_attachments').insert({
        task_id: task.id,
        user_id: userId || null,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type
      })
      await loadAttachments()
      toast.success(`${file.name} uploaded!`)
    } catch (err: any) {
      // If storage bucket doesn't exist, save just the reference
      await supabase.from('task_attachments').insert({
        task_id: task.id,
        user_id: userId || null,
        file_name: file.name,
        file_url: '#',
        file_size: file.size,
        file_type: file.type
      })
      await loadAttachments()
      toast.success(`${file.name} saved!`)
    } finally {
      setIsUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const userInitial = userName?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-4 p-4 border-b">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl md:text-2xl font-bold w-full lg:w-auto">{task.title}</h1>
            <Badge variant="outline" className={priorityColors[task.priority] || ''}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={statusColors[task.status] || ''}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {dueDate && (
              <span className={cn('flex items-center gap-1', isOverdueTask && 'text-red-500', isDueToday && 'text-orange-500', isDueTomorrow && 'text-yellow-500')}>
                <Calendar className="h-4 w-4" />
                {format(dueDate, 'MMM d, yyyy')}
                {isOverdueTask && ' (Overdue)'}
                {isDueToday && ' (Today)'}
                {isDueTomorrow && ' (Tomorrow)'}
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {task.assignee.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end w-full lg:w-auto mt-2 lg:mt-0">
          {/* MANAGER ACTIONS */}
          {(userRole === 'manager' || userRole === 'admin') && (
            <>
              {task.status === 'review' && (
                <>
                  <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"
                        className="text-red-500 hover:text-red-600 border-red-300 hover:bg-red-50"
                        disabled={isUpdatingStatus}
                      >
                        ✗ Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">Provide a reason for rejecting this task so the assignee knows what needs to be fixed:</p>
                        <Textarea
                          placeholder="e.g. The logo is not properly aligned on mobile screens..."
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                          <Button className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isUpdatingStatus || !rejectReason.trim()}
                            onClick={async () => {
                              await handleStatusUpdate('in_progress', `Manager rejected: ${rejectReason}`, { rejectionReason: rejectReason })
                              setRejectReason('')
                              setRejectDialogOpen(false)
                            }}
                          >
                            Confirm Rejection
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusUpdate('done', 'Manager approved. Task completed!')}
                  >
                    ✓ Approve
                  </Button>
                </>
              )}
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" /> Edit</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
                  <TaskForm initialData={task} users={users} projects={projects}
                    onSubmit={async (data) => { await onUpdate(data); setEditDialogOpen(false) }}
                    onCancel={() => setEditDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500" onClick={() => onDelete(task.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* DOER ACTIONS */}
          {userRole === 'employee' && (
            <>
              {task.status === 'todo' && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusUpdate('in_progress', 'Started working on this task.')}
                >
                  ▶ Start Working
                </Button>
              )}
              {task.status === 'in_progress' && (
                <>
                  <Dialog open={submitReviewOpen} onOpenChange={setSubmitReviewOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                        ✓ Submit for Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit for Manager Review</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">Write a note to your manager about what you completed:</p>
                        <Textarea
                          placeholder="e.g. Completed the design, tested all flows, ready for your review..."
                          value={submitNote}
                          onChange={e => setSubmitNote(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSubmitReviewOpen(false)}>Cancel</Button>
                          <Button className="bg-purple-600 hover:bg-purple-700 text-white"
                            disabled={isUpdatingStatus}
                            onClick={async () => {
                              await handleStatusUpdate('review', submitNote || 'Task submitted for review.', { rejectionReason: null as any })
                              setSubmitNote('')
                              setSubmitReviewOpen(false)
                            }}
                          >
                            Submit for Review
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {task.status === 'review' && (
                <span className="text-sm text-purple-500 font-medium px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  ⏳ Awaiting Manager Review
                </span>
              )}
              {task.status === 'done' && (
                <span className="text-sm text-green-600 font-medium px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  ✅ Approved & Done
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rejection Banner */}
      {task.rejectionReason && task.status !== 'review' && task.status !== 'done' && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <div className="mt-0.5">
            <X className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-800">Task Rejected by Manager</h4>
            <p className="text-sm text-red-700 mt-1">{task.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <div className="px-4 py-3 border-b">
          <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* Admin Voice Note */}
      {(task as any).audioUrl && (
        <div className="px-4 py-3 border-b bg-indigo-50/50 dark:bg-indigo-900/10">
          <p className="text-xs font-semibold text-indigo-500 mb-2 flex items-center gap-1"><Mic className="h-3 w-3" /> Manager Voice Note</p>
          <audio src={(task as any).audioUrl} controls className="w-full max-w-md h-10" />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab as any} className="flex-1 overflow-hidden">
        <TabsList className="border-b px-4 w-full justify-start rounded-none h-auto flex-wrap gap-1 py-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="checklist">Checklist ({task.checklistItems?.filter(c => c.completed).length || 0}/{task.checklistItems?.length || 0})</TabsTrigger>
          <TabsTrigger value="comments">Updates ({updates.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
        </TabsList>

        {/* DETAILS TAB */}
        <TabsContent value="details" className="p-4 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div>
              <Label>Status</Label>
              <Badge variant="outline" className={cn('mt-1', statusColors[task.status] || '')}>{task.status.replace('_', ' ')}</Badge>
            </div>
            <div>
              <Label>Priority</Label>
              <Badge variant="outline" className={cn('mt-1', priorityColors[task.priority] || '')}>{task.priority}</Badge>
            </div>
            <div>
              <Label>Assignee</Label>
              {task.assignee ? (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8"><AvatarFallback>{task.assignee.name[0]}</AvatarFallback></Avatar>
                  <span>{task.assignee.name}</span>
                </div>
              ) : <span className="text-muted-foreground mt-1 block">Unassigned</span>}
            </div>
            <div>
              <Label>Reporter</Label>
              {task.reporter ? (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8"><AvatarFallback>{task.reporter.name[0]}</AvatarFallback></Avatar>
                  <span>{task.reporter.name}</span>
                </div>
              ) : <span className="text-muted-foreground mt-1 block">—</span>}
            </div>
            {dueDate && (
              <div>
                <Label>Due Date</Label>
                <div className={cn('mt-1', isOverdueTask && 'text-red-500', isDueToday && 'text-orange-500', isDueTomorrow && 'text-yellow-500')}>
                  {format(dueDate, 'MMMM d, yyyy')}
                </div>
              </div>
            )}
            {task.tags && task.tags.length > 0 && (
              <div className="sm:col-span-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {task.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Created</Label>
              <div className="mt-1 text-muted-foreground">{format(new Date(task.createdAt), 'MMMM d, yyyy h:mm a')}</div>
            </div>
          </div>
        </TabsContent>

        {/* CHECKLIST TAB */}
        <TabsContent value="checklist" className="p-4 overflow-y-auto">
          <div className="space-y-2 max-w-xl">
            {task.checklistItems?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No checklist items.</p>
            ) : (
              task.checklistItems?.map((item: ChecklistItem) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox checked={item.completed} onCheckedChange={() => onToggleChecklist(task.id, item.id)} />
                  <span className={cn('flex-1', item.completed && 'line-through text-muted-foreground')}>{item.title}</span>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* UPDATES/COMMENTS TAB */}
        <TabsContent value="comments" className="p-4 overflow-y-auto">
          <div className="space-y-4 max-w-2xl">
            {/* Post Update */}
            <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
              <h3 className="font-medium text-sm">Post a Daily Update</h3>
              <div className="flex gap-3">
                <Avatar className="h-8 w-8"><AvatarFallback>{userInitial}</AvatarFallback></Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="What did you work on today? Any blockers?"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={3}
                  />
                  {/* Audio preview */}
                  {audioUrl && (
                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                      <audio src={audioUrl} controls className="h-8 flex-1" />
                      <button onClick={() => setAudioUrl(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Audio Recording */}
                      {!audioUrl && (
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={cn(
                            'flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all',
                            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          )}
                        >
                          {isRecording ? <><StopCircle className="h-3 w-3" />{formatTime(recordingDuration)}</> : <><Mic className="h-3 w-3" />Record</>}
                        </button>
                      )}
                    </div>
                    <Button size="sm" disabled={isSubmittingComment || (!newComment.trim() && !audioUrl)} onClick={handleSubmitComment}>
                      <Send className="h-4 w-4 mr-1" />
                      {isSubmittingComment ? 'Saving...' : 'Post Update'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Updates list */}
            <div className="space-y-3">
              {updates.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No updates yet.</p>
              ) : (
                updates.map((update: any) => {
                  const hasAudio = update.content?.includes('[audio:')
                  const audioSrc = hasAudio ? update.content.match(/\[audio:(.*?)\]/)?.[1] : null
                  const text = update.content?.replace(/\[audio:.*?\]/, '').trim()
                  return (
                    <div key={update.id} className={cn(
                      'flex gap-3 p-3 rounded-xl border',
                      update.update_type === 'submit_review' && 'bg-purple-50 dark:bg-purple-900/20 border-purple-200',
                      update.update_type === 'status_change' && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200',
                      update.update_type === 'comment' && 'bg-muted/30'
                    )}>
                      <Avatar className="h-8 w-8"><AvatarFallback>{update.profiles?.full_name?.[0] || 'U'}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{update.profiles?.full_name || 'User'}</span>
                          {update.update_type === 'submit_review' && <Badge className="bg-purple-100 text-purple-700 text-xs">Submitted for Review</Badge>}
                          {update.update_type === 'status_change' && <Badge className="bg-blue-100 text-blue-700 text-xs">Status Update</Badge>}
                          <span className="text-xs text-muted-foreground">{format(new Date(update.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                        {text && <p className="text-sm whitespace-pre-wrap">{text}</p>}
                        {audioSrc && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Mic className="h-3 w-3" />Voice note</p>
                            <audio src={audioSrc} controls className="w-full max-w-xs h-8" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity" className="p-4 overflow-y-auto">
          <div className="space-y-3 max-w-2xl">
            {updates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No activity recorded.</p>
            ) : (
              [...updates].reverse().map((update: any) => (
                <div key={update.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                    update.update_type === 'submit_review' ? 'bg-purple-500' :
                    update.update_type === 'status_change' ? 'bg-blue-500' : 'bg-gray-500'
                  )}>
                    {update.profiles?.full_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{update.profiles?.full_name || 'User'}</span>
                      {' — '}{update.content?.replace(/\[audio:.*?\]/, '').trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ATTACHMENTS TAB */}
        <TabsContent value="attachments" className="p-4 overflow-y-auto">
          <div className="space-y-4 max-w-2xl">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Upload files, screenshots, documents</p>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" disabled={isUploadingFile} onClick={() => fileInputRef.current?.click()}>
                {isUploadingFile ? 'Uploading...' : 'Choose File'}
              </Button>
            </div>
            {attachments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No attachments yet.</p>
            ) : (
              attachments.map((att: any) => (
                <div key={att.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                  <Paperclip className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {att.profiles?.full_name} • {(att.file_size / 1024).toFixed(1)} KB • {format(new Date(att.created_at), 'MMM d')}
                    </p>
                  </div>
                  {att.file_url !== '#' && (
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">Download</a>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}