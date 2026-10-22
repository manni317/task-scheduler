'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ProjectList } from '@/components/project/ProjectList'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ArrowLeft, Plus, UserPlus, Settings, Upload, Loader2, Building2, Layers, Edit2, Trash2, FolderKanban, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Project, User } from '@/types/task'

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  const { profile } = useAuth()
  
  const [org, setOrg] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [orgMembers, setOrgMembers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<any | null>(null)
  const [deptForm, setDeptForm] = useState({ name: '', description: '' })
  const [isSavingDept, setIsSavingDept] = useState(false)

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const userRole = profile?.role || 'employee'
  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin'
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([])
  
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false)
  const [editOrgData, setEditOrgData] = useState({ name: '', description: '', logoUrl: '' })
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch Org Details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()
      
      if (orgError) throw orgError
      setOrg(orgData)
      setEditOrgData({ name: orgData.name, description: orgData.description || '', logoUrl: orgData.logo_url || '' })

      // Fetch all system users to pass to ProjectList
      const { data: allUsers } = await supabase.from('profiles').select('*')
      const mappedUsers = (allUsers || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.avatar_url || '',
        role: u.role || 'member'
      }))
      setUsers(mappedUsers)

      // Fetch departments for this org
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      
      const currentDepts = deptData || []
      setDepartments(currentDepts)

      // Fetch org members specifically for the Members tab
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('role, user_id, department_id, profiles(*)')
        .eq('org_id', orgId)
      
      setOrgMembers(membersData || [])

      // Fetch projects for this org
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', orgId)

      const mappedProjects = (projectsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        key: p.key_prefix || 'PRJ',
        orgId: p.org_id,
        departmentId: p.department_id,
        department: currentDepts.find((d: any) => d.id === p.department_id),
        color: '#3B82F6',
        icon: '📁',
        ownerId: '',
        owner: null,
        members: mappedUsers,
        tasks: [],
        createdAt: new Date(p.created_at || Date.now()),
        updatedAt: new Date(p.updated_at || Date.now()),
        isArchived: false,
      }))

      setProjects(mappedProjects)

    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load organization details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCreateDept = () => {
    setEditingDept(null)
    setDeptForm({ name: '', description: '' })
    setIsDeptModalOpen(true)
  }

  const handleOpenEditDept = (dept: any) => {
    setEditingDept(dept)
    setDeptForm({ name: dept.name, description: dept.description || '' })
    setIsDeptModalOpen(true)
  }

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) {
      toast.error('Department name is required')
      return
    }
    setIsSavingDept(true)
    try {
      if (editingDept) {
        const { error } = await supabase.from('departments').update({
          name: deptForm.name.trim(),
          description: deptForm.description.trim() || null,
          updated_at: new Date().toISOString()
        }).eq('id', editingDept.id)
        if (error) throw error
        toast.success('Department updated!')
      } else {
        const { error } = await supabase.from('departments').insert([{
          organization_id: orgId,
          name: deptForm.name.trim(),
          description: deptForm.description.trim() || null
        }])
        if (error) throw error
        toast.success('Department created!')
      }
      setIsDeptModalOpen(false)
      setDeptForm({ name: '', description: '' })
      setEditingDept(null)
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to save department: ' + error.message)
    } finally {
      setIsSavingDept(false)
    }
  }

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department? Associated projects will be unlinked.')) return
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id)
      if (error) throw error
      toast.success('Department deleted!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to delete department: ' + error.message)
    }
  }

  const handleAssignMemberDept = async (userId: string, newDeptId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ department_id: newDeptId === 'none' ? null : newDeptId })
        .eq('org_id', orgId)
        .eq('user_id', userId)
      if (error) throw error
      toast.success('Member department updated!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to update member department')
    }
  }

  const handleCreateProject = async (data: any) => {
    try {
      const newProject = {
        name: data.name,
        description: data.description,
        org_id: orgId, // Force bind to this org
        department_id: data.departmentId || null,
      }

      const { error } = await supabase.from('projects').insert([newProject])
      if (error) throw error
      
      toast.success('Project created successfully!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to create project')
    }
  }

  const handleUpdateProject = async (data: any) => {
    try {
      const { error } = await supabase.from('projects').update({
        name: data.name,
        description: data.description,
        department_id: data.departmentId || null,
      }).eq('id', data.id)
      
      if (error) throw error
      toast.success('Project updated!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to update project')
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      toast.success('Project deleted!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to delete project')
    }
  }

  const handleArchiveProject = async (id: string) => {
    toast.info('Archiving not supported in current schema')
  }

  const handleAddMembers = async () => {
    if (selectedUsersToAdd.length === 0) return;
    setIsAddingMember(true)
    try {
      const { error } = await supabase.from('organization_members').insert(
        selectedUsersToAdd.map(userId => ({
          org_id: orgId,
          user_id: userId,
          role: 'member'
        }))
      )
      if (error) throw error
      toast.success('Members added successfully!')
      setIsAddMemberModalOpen(false)
      setSelectedUsersToAdd([])
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to add members')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      
      setIsUploadingLogo(true)
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `org-${orgId}-${Math.random()}.${fileExt}`
      const filePath = `org-logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setEditOrgData(prev => ({ ...prev, logoUrl: data.publicUrl }))
      toast.success('Logo uploaded! Click save to apply changes.')
    } catch (error: any) {
      toast.error('Error uploading image')
      console.error(error)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleUpdateOrg = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editOrgData.name,
          description: editOrgData.description,
          logo_url: editOrgData.logoUrl
        })
        .eq('id', orgId)
      
      if (error) throw error
      toast.success('Organization updated successfully!')
      setIsEditOrgModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error('Failed to update organization')
      console.error(error)
    }
  }

  if (isLoading) {
    return <div className="h-full flex items-center justify-center">Loading organization...</div>
  }

  if (!org) {
    return <div className="h-full flex items-center justify-center">Organization not found.</div>
  }

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-start justify-between bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/organizations')} className="h-10 w-10 shrink-0 rounded-full bg-muted/50 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl border-2 border-primary/20 bg-primary/5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="h-full w-full object-contain p-2" />
              ) : (
                <Building2 className="h-8 w-8 text-primary/40" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{org.name}</h1>
              <p className="text-muted-foreground mt-1 max-w-xl line-clamp-2">
                {org.description || 'No description provided. Click edit to add one.'}
              </p>
            </div>
          </div>
        </div>

        {isManagerOrAdmin && (
          <Dialog open={isEditOrgModalOpen} onOpenChange={setIsEditOrgModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 shadow-sm">
                <Settings className="h-4 w-4" /> Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Edit Organization Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                
                {/* Logo Upload Section */}
                <div className="flex flex-col items-center gap-4 p-4 border border-dashed rounded-xl bg-muted/30">
                  <div className="relative h-24 w-24 rounded-2xl border bg-card overflow-hidden shadow-sm flex items-center justify-center">
                    {editOrgData.logoUrl ? (
                      <img src={editOrgData.logoUrl} alt="Logo preview" className="h-full w-full object-contain p-2" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      id="logo-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleLogoUpload} 
                      disabled={isUploadingLogo}
                    />
                    <label htmlFor="logo-upload">
                      <Button variant="secondary" size="sm" className="gap-2 cursor-pointer" asChild disabled={isUploadingLogo}>
                        <span>
                          <Upload className="h-4 w-4" /> 
                          {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        </span>
                      </Button>
                    </label>
                    {editOrgData.logoUrl && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setEditOrgData(p => ({...p, logoUrl: ''}))}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Name</label>
                  <input
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editOrgData.name}
                    onChange={(e) => setEditOrgData({ ...editOrgData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell us about this organization..."
                    value={editOrgData.description}
                    onChange={(e) => setEditOrgData({ ...editOrgData, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsEditOrgModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateOrg} disabled={!editOrgData.name.trim()}>Save Changes</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="projects" className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({orgMembers.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="flex-1 mt-4">
          <ProjectList
            userRole={userRole}
            projects={projects}
            users={users}
            organizations={[org]}
            departments={departments}
            onProjectClick={(project) => router.push(`/projects/${project.id}`)}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onArchiveProject={handleArchiveProject}
          />
        </TabsContent>

        <TabsContent value="departments" className="flex-1 mt-4">
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  Departments ({departments.length})
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Organize projects, tasks, and team members by department.
                </p>
              </div>

              {isManagerOrAdmin && (
                <Button onClick={handleOpenCreateDept} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => {
                const deptProjects = projects.filter(p => p.departmentId === dept.id)
                const deptMembers = orgMembers.filter(m => m.department_id === dept.id)

                return (
                  <div 
                    key={dept.id} 
                    className="p-5 border rounded-2xl bg-card hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                            <Layers className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {dept.name}
                            </h4>
                            <span className="text-[10px] text-muted-foreground">
                              Created {new Date(dept.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {isManagerOrAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditDept(dept)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => handleDeleteDept(dept.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {dept.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 mt-5 pt-3 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <FolderKanban className="h-3.5 w-3.5 text-primary/70" />
                        {deptProjects.length} Projects
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="h-3.5 w-3.5 text-primary/70" />
                        {deptMembers.length} Members
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {departments.length === 0 && (
              <div className="text-center py-12 px-4 border border-dashed rounded-2xl">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                  <Layers className="h-7 w-7" />
                </div>
                <h4 className="text-base font-semibold">No departments created yet</h4>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Departments help organize your team members, projects, and tasks under specific functional units.
                </p>
                {isManagerOrAdmin && (
                  <Button onClick={handleOpenCreateDept} className="gap-2">
                    <Plus className="h-4 w-4" /> Create First Department
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="members" className="flex-1 mt-4">
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Organization Members ({orgMembers.length})</h3>
              {isManagerOrAdmin && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => router.push('/team')}>
                    Manage Team
                  </Button>
                  <Dialog 
                    open={isAddMemberModalOpen} 
                    onOpenChange={(open) => {
                      setIsAddMemberModalOpen(open)
                      if (!open) setSelectedUsersToAdd([])
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <UserPlus className="h-4 w-4" /> Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Existing Members</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {users.filter(u => !orgMembers.some(om => om.user_id === u.id)).length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">All system users are already in this organization.</p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              {users.filter(u => !orgMembers.some(om => om.user_id === u.id)).map(user => (
                                <label key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                  <Checkbox 
                                    checked={selectedUsersToAdd.includes(user.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedUsersToAdd(prev => [...prev, user.id])
                                      } else {
                                        setSelectedUsersToAdd(prev => prev.filter(id => id !== user.id))
                                      }
                                    }}
                                  />
                                  <div className="flex items-center gap-3 flex-1">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={user.avatar || ''} />
                                      <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">{user.name}</p>
                                      <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="pt-4 flex justify-end sticky bottom-0 bg-background pb-2">
                              <Button 
                                onClick={handleAddMembers} 
                                disabled={isAddingMember || selectedUsersToAdd.length === 0}
                              >
                                {isAddingMember ? 'Adding...' : `Add Selected (${selectedUsersToAdd.length})`}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orgMembers.map((member) => {
                const p = member.profiles
                return (
                  <div key={member.user_id} className="flex items-center justify-between gap-3 p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={p.avatar_url || ''} alt={p.full_name} />
                        <AvatarFallback>{p.full_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none truncate">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{p.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="text-xs font-semibold capitalize px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                        {member.role || 'Member'}
                      </div>
                      {isManagerOrAdmin && departments.length > 0 ? (
                        <select
                          value={member.department_id || 'none'}
                          onChange={(e) => handleAssignMemberDept(member.user_id, e.target.value)}
                          className="text-[11px] h-6 px-1.5 py-0 rounded border bg-background text-muted-foreground focus:outline-none max-w-[110px] truncate"
                          title="Assign Department"
                        >
                          <option value="none">No Dept</option>
                          {departments.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      ) : member.department_id && departments.find(d => d.id === member.department_id) ? (
                        <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          {departments.find(d => d.id === member.department_id)?.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
            {orgMembers.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No members found in this organization.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Department Modal */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Create New Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Department Name *</label>
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="e.g. Engineering, Marketing, Operations, Sales"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Briefly describe what this department is responsible for..."
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDept} disabled={isSavingDept || !deptForm.name.trim()}>
                {isSavingDept ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
