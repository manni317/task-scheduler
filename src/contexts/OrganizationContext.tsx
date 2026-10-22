'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Organization } from '@/types/task'
import { useAuth } from '@/hooks/useAuth'

interface OrganizationContextType {
  organizations: Organization[]
  activeOrganization: Organization | null
  setActiveOrganization: (org: Organization) => void
  isLoading: boolean
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrganization, setActiveOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { profile } = useAuth()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const refreshOrganizations = async () => {
    if (!profile?.id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      // 1. Fetch org IDs where user is a member
      const { data: memberRows, error: memberError } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', profile.id)

      if (memberError) throw memberError

      const orgIds = (memberRows || []).map((m: any) => m.org_id).filter(Boolean)

      if (orgIds.length > 0) {
        // 2. Fetch those organizations directly
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds)
          .order('created_at', { ascending: false })

        if (orgsError) throw orgsError

        const orgs = (orgsData || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          businessType: item.business_type || 'general',
          description: item.description,
          createdAt: new Date(item.created_at)
        }))
        
        setOrganizations(orgs)
        
        // Retrieve last active org from localStorage if available
        const savedOrgId = localStorage.getItem('active_org_id')
        let selectedOrg = orgs[0]
        
        if (savedOrgId) {
          const found = orgs.find((o: Organization) => o.id === savedOrgId)
          if (found) selectedOrg = found
        }
        
        setActiveOrg(selectedOrg)
        if (!savedOrgId) {
          localStorage.setItem('active_org_id', selectedOrg.id)
          document.cookie = `active_org_id=${selectedOrg.id}; path=/; max-age=31536000`
        } else {
          document.cookie = `active_org_id=${savedOrgId}; path=/; max-age=31536000`
        }
      } else {
        setOrganizations([])
        setActiveOrg(null)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshOrganizations()
  }, [profile?.id])

  const setActiveOrganization = (org: Organization) => {
    setActiveOrg(org)
    localStorage.setItem('active_org_id', org.id)
    document.cookie = `active_org_id=${org.id}; path=/; max-age=31536000`
    // Reload page to re-fetch all data for the new org context safely
    window.location.reload()
  }

  return (
    <OrganizationContext.Provider value={{
      organizations,
      activeOrganization,
      setActiveOrganization,
      isLoading,
      refreshOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
