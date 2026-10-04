'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { User, Bell, Moon, Sun, Shield, Key, Palette, Globe, Download, Trash2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useAuth'
import { toast } from 'sonner'

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland'
]

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { profile } = useAuth()
  const { updateProfile } = useProfile()
  const [activeTab, setActiveTab] = useState('profile')
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssigned: true,
    taskUpdated: true,
    comments: true,
    mentions: true,
    dailySummary: false,
    weeklyReport: true,
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      const updates: any = {}
      for (const [key, value] of formData.entries()) {
        updates[key] = value
      }
      await updateProfile(updates)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      console.error('Failed to save profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, preferences, and workspace settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
          <TabsTrigger value="profile" className="py-2">Profile</TabsTrigger>
          <TabsTrigger value="appearance" className="py-2">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and avatar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSaveProfile}>
                  <div className="flex flex-col gap-2">
                    <Label>Avatar</Label>
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || "/avatar.png"} alt={profile?.full_name || "User"} />
                      <AvatarFallback className="text-2xl">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Full Name</Label>
                    <Input id="firstName" name="full_name" defaultValue={profile?.full_name || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={profile?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" name="company_name" defaultValue={profile?.company_name || ''} disabled={profile?.role === 'doer'} />
                    {profile?.role === 'doer' && <p className="text-xs text-muted-foreground">Only Admins/Managers can change the company name.</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Your Role</Label>
                    <Input id="role" name="role" defaultValue={profile?.role === 'doer' ? 'Employee' : profile?.role || ''} disabled className="capitalize" />
                  </div>
                </div>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
              </form>
            </CardContent>
          </Card>

        </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Choose your preferred color scheme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light mode' },
                  { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark mode' },
                  { value: 'system', label: 'System', icon: Globe, desc: 'Match your system setting' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as any)}
                    className={cn(
                      'relative p-4 border rounded-lg text-left transition-all',
                      theme === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <option.icon className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.desc}</p>
                      </div>
                    </div>
                    {theme === option.value && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">✓</div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}