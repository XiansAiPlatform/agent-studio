'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTenantStore } from '@/store/tenant-store'
import { AlertCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { XiansTenant } from '@/lib/xians/types'

type TenantStatus = 'loading' | 'exists-enabled' | 'exists-disabled' | 'not-found'

export default function TenantSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentTenantId, clearTenants } = useTenantStore()
  
  // Get tenant ID from URL or use current tenant
  const urlTenantId = searchParams.get('tenant')
  const tenantId = urlTenantId || currentTenantId || ''
  
  const [tenantStatus, setTenantStatus] = useState<TenantStatus>('loading')
  const [tenantData, setTenantData] = useState<XiansTenant | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form data for creating/editing
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    domain: '',
    description: '',
  })

  // Redirect reason from URL
  const redirectReason = searchParams.get('reason')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch tenant information
  useEffect(() => {
    if (!tenantId || status !== 'authenticated') return

    const fetchTenantInfo = async () => {
      setTenantStatus('loading')
      setError(null)
      
      try {
        const response = await fetch(`/api/tenants/${tenantId}`)
        const data = await response.json()
        
        if (response.ok && data.tenant) {
          setTenantData(data.tenant)
          setTenantStatus(
            data.tenant.enabled !== false ? 'exists-enabled' : 'exists-disabled'
          )
          // Pre-fill form with existing data
          setFormData({
            tenantId: data.tenant.tenantId,
            name: data.tenant.name,
            domain: data.tenant.domain,
            description: data.tenant.description || '',
          })
        } else if (response.status === 404) {
          setTenantStatus('not-found')
          // Pre-fill tenant ID from URL or generate from email
          const prefillTenantId = urlTenantId || generateTenantIdFromEmail()
          setFormData(prev => ({
            ...prev,
            tenantId: prefillTenantId,
          }))
        } else {
          throw new Error(data.error || 'Failed to fetch tenant')
        }
      } catch (err) {
        console.error('Error fetching tenant:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch tenant information')
        setTenantStatus('not-found')
      }
    }

    fetchTenantInfo()
  }, [tenantId, status, urlTenantId])

  // Auto-fill form data from user email
  useEffect(() => {
    if (session?.user?.email && tenantStatus === 'not-found' && !formData.name && !formData.domain) {
      const email = session.user.email
      const domain = email.split('@')[1]
      
      // Skip auto-fill for common email providers
      const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com']
      const isCommonProvider = commonProviders.some(provider => domain?.includes(provider))
      
      if (!isCommonProvider && domain) {
        const suggestedTenantId = domain.split('.')[0] || ''
        
        setFormData(prev => ({
          ...prev,
          tenantId: prev.tenantId || suggestedTenantId,
          domain: domain || '',
          name: suggestedTenantId ? `${suggestedTenantId.charAt(0).toUpperCase() + suggestedTenantId.slice(1)} Organization` : ''
        }))
      }
    }
  }, [session, tenantStatus, formData.name, formData.domain])

  const generateTenantIdFromEmail = () => {
    if (session?.user?.email) {
      const domain = session.user.email.split('@')[1]
      const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com']
      const isCommonProvider = commonProviders.some(provider => domain?.includes(provider))
      
      if (!isCommonProvider && domain) {
        return domain.split('.')[0] || ''
      }
    }
    return ''
  }

  const handleEnableTenant = async () => {
    if (!tenantData) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/tenants/${tenantData.tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enable tenant')
      }

      setSuccess('Tenant enabled successfully!')
      setTenantData(data.tenant)
      setTenantStatus('exists-enabled')
      clearTenants()
      
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisableTenant = async () => {
    if (!tenantData) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/tenants/${tenantData.tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable tenant')
      }

      setSuccess('Tenant disabled successfully!')
      setTenantData(data.tenant)
      setTenantStatus('exists-disabled')
      clearTenants()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateTenant = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/tenants/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tenant')
      }

      setSuccess(data.message || 'Tenant created successfully!')
      clearTenants()
      
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || tenantStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading tenant information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Tenant Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's tenant in the Xians platform
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Invalid Tenant Warning (when redirected) */}
      {redirectReason === 'invalid' && urlTenantId && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  Tenant Not Configured
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  The tenant &quot;{urlTenantId}&quot; is not configured to use with AI agents. 
                  Please select a different tenant or create a new one.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error/Success Messages */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Exists and is Enabled */}
      {tenantStatus === 'exists-enabled' && tenantData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tenant Information</CardTitle>
                <CardDescription>
                  This tenant is currently enabled and active
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Enabled
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tenant ID</Label>
                <p className="font-medium">{tenantData.tenantId}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Organization Name</Label>
                <p className="font-medium">{tenantData.name}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Domain</Label>
                <p className="font-medium">{tenantData.domain}</p>
              </div>

              {tenantData.description && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="font-medium">{tenantData.description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleDisableTenant}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Disabling...' : 'Disable Tenant'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Exists but is Disabled */}
      {tenantStatus === 'exists-disabled' && tenantData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tenant Information</CardTitle>
                <CardDescription>
                  This tenant is currently disabled
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                <XCircle className="h-4 w-4" />
                Disabled
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tenant ID</Label>
                <p className="font-medium">{tenantData.tenantId}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Organization Name</Label>
                <p className="font-medium">{tenantData.name}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Domain</Label>
                <p className="font-medium">{tenantData.domain}</p>
              </div>

              {tenantData.description && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="font-medium">{tenantData.description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleEnableTenant}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enabling...' : 'Enable Tenant'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Not Found - Show Creation Form */}
      {tenantStatus === 'not-found' && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Tenant</CardTitle>
            <CardDescription>
              This tenant doesn&apos;t exist yet. Fill in the information below to create it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant ID *</Label>
                <Input
                  id="tenantId"
                  value={formData.tenantId}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenantId: e.target.value }))}
                  placeholder="your-company-id"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  A unique identifier for your organization (lowercase, no spaces)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your Company Name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="company.com"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your organization"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateTenant}
                disabled={isSubmitting || !formData.tenantId || !formData.name || !formData.domain}
              >
                {isSubmitting ? 'Creating Tenant...' : 'Create Tenant'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
