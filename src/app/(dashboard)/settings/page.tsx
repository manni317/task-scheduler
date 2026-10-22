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
import { User, Bell, Moon, Sun, Shield, Key, Palette, Globe, Download, Trash2, LogOut, Calendar, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { useAuth, useProfile } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useRef, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase-provider'
import { testPushSubscription } from '@/components/pwa/PushManager'

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
  const { profile, session } = useAuth()
  const { updateProfile } = useProfile()
  const supabase = useSupabase()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    // Check if we just redirected back from Google OAuth
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'))
    
    const error = params.get('error') || hashParams.get('error')
    const errorDescription = params.get('error_description') || hashParams.get('error_description')
    
    if (error) {
      toast.error(`Connection failed: ${errorDescription || error}`)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('integration') === 'google_success' || hashParams.get('integration') === 'google_success') {
      setActiveTab('integrations')
      toast.success('Google Calendar connected successfully!')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB')
      return
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      await updateProfile({ avatar_url: publicUrl })
      toast.success('Avatar updated successfully')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

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
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 gap-1">
          <TabsTrigger value="profile" className="py-2 text-xs sm:text-sm">Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="py-2 text-xs sm:text-sm">Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="py-2 text-xs sm:text-sm">Theme</TabsTrigger>
          <TabsTrigger value="integrations" className="py-2 text-xs sm:text-sm">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and avatar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSaveProfile}>
                  <div className="flex flex-col gap-4">
                    <Label>Avatar</Label>
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profile?.avatar_url || "/avatar.png"} alt={profile?.full_name || "User"} />
                        <AvatarFallback className="text-2xl">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={fileInputRef} 
                          onChange={handleAvatarUpload} 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Change Avatar'}
                        </Button>
                        <p className="text-sm text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
                      </div>
                    </div>
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
                <Button type="submit" disabled={isSaving} className="mt-6">{isSaving ? 'Saving...' : 'Save Changes'}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Mobile & Web Push Notifications
              </CardTitle>
              <CardDescription>
                Receive real-time instant alerts on your phone and desktop for task assignments, updates, and deadlines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                    Instant Push Notification Test
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send an immediate high-priority test push to verify sound, vibration, and notification tray alerts on your mobile.
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    if (!profile?.id) return
                    toast.loading('Sending instant push test...')
                    const res = await testPushSubscription(profile.id)
                    toast.dismiss()
                    if (res.success) {
                      toast.success(res.message)
                    } else {
                      toast.error(res.message)
                    }
                  }}
                  className="gap-2 shrink-0 bg-primary shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Zap className="h-4 w-4 fill-primary-foreground" />
                  Send Instant Test Push
                </Button>
              </div>

              <div className="rounded-xl border border-muted bg-muted/20 p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Tips for Android & Mobile users:
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>Ensure browser notification permission is allowed when prompted.</li>
                  <li>On Xiaomi (MIUI/HyperOS), Vivo, or Oppo: Check app settings and allow &ldquo;Autostart&rdquo; or &ldquo;Show notifications&rdquo; for Chrome.</li>
                  <li>Install the app as PWA (&ldquo;Add to Home Screen&rdquo;) for the best native app experience.</li>
                </ul>
              </div>
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

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect TaskFlow with your favorite tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Google Calendar</h3>
                    <p className="text-sm text-muted-foreground">Automatically sync your tasks to Google Calendar.</p>
                  </div>
                </div>
                  {session?.user?.identities?.some((id: any) => id.provider === 'google') ? (
                    <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950" disabled>
                      Connected
                    </Button>
                  ) : (
                    <Button onClick={async () => {
                      try {
                        const { error } = await supabase.auth.linkIdentity({
                          provider: 'google',
                          options: {
                            scopes: 'https://www.googleapis.com/auth/calendar.events',
                            redirectTo: `${window.location.origin}/settings?integration=google_success`
                          }
                        })
                        if (error) {
                          toast.error('Linking Failed: ' + error.message)
                        }
                      } catch (e: any) {
                        toast.error('System Error: ' + e.message)
                      }
                    }}>
                      Connect
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}