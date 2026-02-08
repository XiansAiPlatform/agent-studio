'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Filter, 
  Link2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  X, 
  Settings,
  ExternalLink,
  Loader2,
  RefreshCw,
  Bot,
  Server 
} from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { OIDCConnection, ConnectionStatus } from './types';
import { useConnections } from './hooks/use-connections';
import { CreateConnectionDialog } from './components/create-connection-dialog';
import { ConnectionCard } from './components/connection-card';
import { DeleteConnectionDialog } from './components/delete-connection-dialog';
import { IntegrationDetailsSheet } from './components/integration-details-sheet';
import { SlackWizardSheet } from './components/slack-wizard-sheet';
import { TeamsWizardSheet } from './components/teams-wizard-sheet';

function ConnectionsContent() {
  const { currentTenantId } = useTenant();
  const searchParams = useSearchParams();
  const agentName = searchParams.get('agentName');
  const activationName = searchParams.get('activationName');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<OIDCConnection | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [showSlackWizard, setShowSlackWizard] = useState(false);
  const [showTeamsWizard, setShowTeamsWizard] = useState(false);

  // Handle OAuth completion messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const connectionName = urlParams.get('name');
    const userName = urlParams.get('user');
    const errorDetails = urlParams.get('details');

    if (success === 'connection_created' && connectionName) {
      showSuccessToast(
        userName 
          ? `Connection "${connectionName}" created and authorized as ${userName}`
          : `Connection "${connectionName}" created successfully`
      );
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      let errorMessage = 'Failed to create connection';
      switch (error) {
        case 'oauth_error':
          errorMessage = `OAuth error: ${errorDetails || 'Authorization failed'}`;
          break;
        case 'state_mismatch':
          errorMessage = 'Security validation failed. Please try again.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to exchange authorization for access tokens';
          break;
        case 'completion_failed':
          errorMessage = 'Failed to complete connection setup';
          break;
        default:
          errorMessage = errorDetails || 'Unknown error occurred';
      }
      showErrorToast(new Error(errorMessage));
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Memoize options to prevent infinite loop
  const connectionOptions = useMemo(() => ({
    agentName: agentName ?? undefined,
    activationName: activationName ?? undefined,
  }), [agentName, activationName]);

  const {
    connections,
    isLoading,
    error,
    refetch,
    createConnection,
    initiateConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    authorizeConnection,
    createIntegration
  } = useConnections(currentTenantId ?? undefined, connectionOptions);

  // Filter connections based on search and filters
  const filteredConnections = connections?.filter(conn => {
    const matchesSearch = !searchQuery || 
      conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.providerId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || conn.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || conn.providerId === providerFilter;
    
    return matchesSearch && matchesStatus && matchesProvider;
  }) || [];

  const handleCreateConnection = async (data: any) => {
    console.log('[Page] handleCreateConnection called with data:', data)
    
    try {
      // For Slack, use direct integration creation
      if (data.platformId === 'slack') {
        console.log('[Page] Slack integration - starting creation')
        
        const integrationData = {
          platformId: data.platformId,
          name: data.name,
          description: data.description,
          agentName: agentName || 'DefaultAgent',
          activationName: activationName || 'DefaultActivation',
          configuration: data.configuration,
          mappingConfig: {
            participantIdSource: 'userEmail',
            scopeSource: null,
            defaultScope: 'Slack'
          },
          isEnabled: true
        };
        
        console.log('[Page] Creating Slack integration with data:', integrationData)
        
        // Call the API directly without the mutation wrapper to avoid refetch
        const response = await fetch(`/api/tenants/${currentTenantId}/integrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(integrationData),
        })
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.error || 'Failed to create integration')
        }
        
        const result = await response.json()
        
        console.log('[Page] ✅ Integration created successfully!')
        console.log('[Page] Result:', result)
        console.log('[Page] Webhook URL:', result?.webhookUrl)
        
        return result
      }
      
      // For Teams, use direct integration creation
      if (data.platformId === 'msteams') {
        console.log('[Page] Teams integration - starting creation')
        
        const integrationData = {
          platformId: data.platformId,
          name: data.name,
          description: data.description,
          agentName: agentName || 'DefaultAgent',
          activationName: activationName || 'DefaultActivation',
          configuration: data.configuration,
          mappingConfig: data.mappingConfig,
          isEnabled: true
        };
        
        console.log('[Page] Creating Teams integration with data:', integrationData)
        
        // Call the API directly
        const response = await fetch(`/api/tenants/${currentTenantId}/integrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(integrationData),
        })
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.error || 'Failed to create integration')
        }
        
        const result = await response.json()
        
        console.log('[Page] ✅ Teams integration created successfully!')
        console.log('[Page] Result:', result)
        console.log('[Page] Webhook URL:', result?.webhookUrl)
        console.log('[Page] Returning result to wizard...')
        
        // Show success message (wizard continues to next step)
        showSuccessToast('Slack integration created successfully');
        
        // IMPORTANT: Return the result so wizard can access webhookUrl and advance
        // DO NOT refetch or close anything - wizard handles the flow
        // Refetch will happen when wizard is complete
        return result;
      } else {
        console.log('[Page] Non-Slack integration - using OAuth flow')
        
        // Use the OAuth-first flow for other providers
        const result = await initiateConnection.mutateAsync({
          ...data,
          returnUrl: '/settings/connections'
        });
        
        // Close dialog and redirect user to OAuth provider
        setShowCreateDialog(false);
        
        // Open OAuth URL in the same window to complete the flow
        window.location.href = result.authUrl;
      }
      
    } catch (error) {
      console.error('[Page] ❌ Error creating connection:', error)
      showErrorToast(error as Error);
      throw error;
    }
  };

  const handleDeleteConnection = async () => {
    if (!selectedConnection) return;
    
    try {
      await deleteConnection.mutateAsync(selectedConnection.id);
      setShowDeleteDialog(false);
      setSelectedConnection(null);
      showSuccessToast('Connection deleted successfully');
    } catch (error) {
      showErrorToast(error as Error);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      const result = await testConnection.mutateAsync(connectionId);
      if (result.success) {
        showSuccessToast('Connection test successful');
      } else {
        showErrorToast(new Error(result.error || 'Connection test failed'));
      }
    } catch (error) {
      showErrorToast(error as Error);
    }
  };

  const handleAuthorizeConnection = async (connectionId: string) => {
    try {
      const result = await authorizeConnection.mutateAsync(connectionId);
      // Open authorization URL in new tab
      window.open(result.authUrl, '_blank');
      showSuccessToast('Authorization started - complete the process in the new tab');
    } catch (error) {
      showErrorToast(error as Error);
    }
  };

  const handleViewDetails = (connectionId: string) => {
    setSelectedIntegrationId(connectionId);
    setShowDetailsSheet(true);
  };

  const statusColors: Record<ConnectionStatus, string> = {
    connected: 'bg-green-100 text-green-800 border-green-200',
    expired: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    error: 'bg-red-100 text-red-800 border-red-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    authorizing: 'bg-blue-100 text-blue-800 border-blue-200',
    disabled: 'bg-gray-100 text-gray-600 border-gray-200'
  };

  const statusIcons: Record<ConnectionStatus, React.ReactNode> = {
    connected: <CheckCircle className="h-3 w-3" />,
    expired: <Clock className="h-3 w-3" />,
    error: <AlertCircle className="h-3 w-3" />,
    draft: <Settings className="h-3 w-3" />,
    pending: <Clock className="h-3 w-3" />,
    authorizing: <Loader2 className="h-3 w-3 animate-spin" />,
    disabled: <X className="h-3 w-3" />
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading connections...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                <Server className="h-6 w-6 text-primary" />
                Connections
              </h1>
              {agentName && activationName && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-muted-foreground">Managing connections for</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                      <Bot className="h-3 w-3" />
                      {agentName}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1">
                      {activationName}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        {filteredConnections.length === 0 ? (
          /* Empty State */
          <div className="bg-white/40 rounded-xl p-16 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Link2 className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400 mb-6">No connections yet</p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create your first connection</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Connections Grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredConnections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onEdit={() => {/* TODO: Implement edit */}}
                onDelete={(id) => {
                  setSelectedConnection(connection);
                  setShowDeleteDialog(true);
                }}
                onTest={handleTestConnection}
                onToggleActive={(id, active) => {
                  updateConnection.mutate({ 
                    id, 
                    data: { isActive: active } 
                  });
                }}
                onViewUsage={() => {/* TODO: Implement usage view */}}
                onAuthorize={handleAuthorizeConnection}
                onClick={handleViewDetails}
              />
            ))}
            
            {/* Add New Connection */}
            <button
              onClick={() => setShowCreateDialog(true)}
              className="group p-6 rounded-xl bg-white/40 hover:bg-white/60 border-0 transition-all duration-200 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors flex-shrink-0 mt-0.5">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-normal text-slate-600 group-hover:text-slate-900 transition-colors mb-1">
                    Add new connection
                  </h3>
                  <p className="text-xs text-slate-400">
                    Connect a service to enable integrations
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Create Connection Dialog - Only render when not showing Slack or Teams wizard */}
        {!showSlackWizard && !showTeamsWizard && (
          <CreateConnectionDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSubmit={handleCreateConnection}
            isSubmitting={initiateConnection.isPending}
            onSlackSelected={() => {
              setShowCreateDialog(false)
              setShowSlackWizard(true)
            }}
            onTeamsSelected={() => {
              setShowCreateDialog(false)
              setShowTeamsWizard(true)
            }}
          />
        )}

        {/* Slack Wizard Sheet - Persists while open to maintain state */}
        {showSlackWizard && (
          <SlackWizardSheet
            key="slack-wizard-persistent"
            open={showSlackWizard}
            onOpenChange={(open) => {
              console.log('[Page] Slack wizard onOpenChange:', open)
              setShowSlackWizard(open)
              if (!open) {
                // Refetch connections when wizard closes
                console.log('[Page] Wizard closed, refetching connections')
                refetch()
              }
            }}
            onSubmit={handleCreateConnection}
            isSubmitting={createIntegration.isPending}
          />
        )}

        {/* Teams Wizard Sheet - Persists while open to maintain state */}
        {showTeamsWizard && (
          <TeamsWizardSheet
            key="teams-wizard-persistent"
            open={showTeamsWizard}
            onOpenChange={(open) => {
              console.log('[Page] Teams wizard onOpenChange:', open)
              setShowTeamsWizard(open)
              if (!open) {
                // Refetch connections when wizard closes
                console.log('[Page] Wizard closed, refetching connections')
                refetch()
              }
            }}
            onSubmit={handleCreateConnection}
            isSubmitting={createIntegration.isPending}
          />
        )}

        {/* Delete Connection Dialog */}
        <DeleteConnectionDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          connection={selectedConnection}
          onConfirm={handleDeleteConnection}
          isDeleting={deleteConnection.isPending}
        />

        {/* Integration Details Sheet */}
        <IntegrationDetailsSheet
          open={showDetailsSheet}
          onOpenChange={setShowDetailsSheet}
          integrationId={selectedIntegrationId}
          onDeleted={() => {
            refetch()
            setSelectedIntegrationId(null)
          }}
        />
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <ConnectionsContent />
    </Suspense>
  );
}