import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreVertical, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  X, 
  Settings, 
  Loader2, 
  TestTube, 
  ExternalLink,
  Edit,
  Trash2,
  BarChart,
  Power,
  PowerOff
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OIDCConnection, ConnectionStatus } from '../types'
import { OIDC_PROVIDERS } from '@/config/oidc-providers'

interface ConnectionCardProps {
  connection: OIDCConnection
  onEdit: (connection: OIDCConnection) => void
  onDelete: (connectionId: string) => void
  onTest: (connectionId: string) => void
  onToggleActive: (connectionId: string, active: boolean) => void
  onViewUsage: (connectionId: string) => void
  onAuthorize?: (connectionId: string) => void
}

const statusConfig: Record<ConnectionStatus, { 
  icon: React.ReactNode
  color: string 
  bgColor: string
  label: string
}> = {
  connected: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Connected'
  },
  expired: {
    icon: <Clock className="h-3 w-3" />,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    label: 'Token Expired'
  },
  error: {
    icon: <AlertCircle className="h-3 w-3" />,
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Error'
  },
  pending: {
    icon: <Clock className="h-3 w-3" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    label: 'Pending Authorization'
  },
  authorizing: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Authorizing'
  },
  disabled: {
    icon: <X className="h-3 w-3" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 border-gray-300',
    label: 'Disabled'
  }
}

export function ConnectionCard({ 
  connection, 
  onEdit, 
  onDelete, 
  onTest, 
  onToggleActive, 
  onViewUsage,
  onAuthorize 
}: ConnectionCardProps) {
  const provider = OIDC_PROVIDERS[connection.providerId]
  const statusInfo = statusConfig[connection.status]
  
  const needsAuthorization = ['pending', 'expired', 'error'].includes(connection.status)
  const canTest = connection.status !== 'authorizing'

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Recently'
  }

  return (
    <Card className={`transition-all hover:shadow-md ${!connection.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div className="text-2xl flex-shrink-0">
              {provider?.icon || '🔗'}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">{connection.name}</CardTitle>
              <CardDescription className="text-sm">
                {provider?.displayName || connection.providerId}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(connection)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              
              {canTest && (
                <DropdownMenuItem onClick={() => onTest(connection.id)}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </DropdownMenuItem>
              )}
              
              {needsAuthorization && onAuthorize && (
                <DropdownMenuItem onClick={() => onAuthorize(connection.id)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Authorize
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => onViewUsage(connection.id)}>
                <BarChart className="h-4 w-4 mr-2" />
                View Usage
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onToggleActive(connection.id, !connection.isActive)}
              >
                {connection.isActive ? (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Disable
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Enable
                  </>
                )}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onDelete(connection.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1 text-xs ${statusInfo.color} ${statusInfo.bgColor}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
          
          {!connection.isActive && (
            <Badge variant="secondary" className="text-xs">
              Disabled
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {connection.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {connection.description}
          </p>
        )}
        
        <div className="space-y-1 text-xs text-muted-foreground">
          {connection.externalUserName && (
            <div className="flex justify-between">
              <span>Authorized as:</span>
              <span className="font-medium">{connection.externalUserName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{formatDate(connection.createdAt)}</span>
          </div>
          {connection.authorizedAt && (
            <div className="flex justify-between">
              <span>Authorized:</span>
              <span>{formatDate(connection.authorizedAt)}</span>
            </div>
          )}
          {connection.lastUsed && (
            <div className="flex justify-between">
              <span>Last used:</span>
              <span>{formatRelativeTime(connection.lastUsed)}</span>
            </div>
          )}
          {connection.usageCount !== undefined && (
            <div className="flex justify-between">
              <span>Usage count:</span>
              <span>{connection.usageCount}</span>
            </div>
          )}
        </div>
        
        {connection.lastError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <p className="text-red-700 font-medium">Last Error:</p>
            <p className="text-red-600 mt-1">{connection.lastError}</p>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          {needsAuthorization && onAuthorize ? (
            <Button 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => onAuthorize(connection.id)}
              disabled={connection.status === 'authorizing'}
            >
              {connection.status === 'authorizing' ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Authorizing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Authorize
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => onTest(connection.id)}
              disabled={!canTest}
            >
              <TestTube className="h-3 w-3 mr-1" />
              Test
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}