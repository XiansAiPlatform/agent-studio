'use client';

import { Suspense, useState, useEffect } from 'react';
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
  RefreshCw 
} from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { OIDC_PROVIDERS, getProvidersByCategory, PROVIDER_CATEGORIES } from '@/config/oidc-providers';
import { OIDCConnection, ConnectionStatus } from './types';
import { useConnections } from './hooks/use-connections';
import { CreateConnectionDialog } from './components/create-connection-dialog';
import { ConnectionCard } from './components/connection-card';
import { DeleteConnectionDialog } from './components/delete-connection-dialog';

function ConnectionsContent() {
  const { currentTenantId } = useTenant();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<OIDCConnection | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');

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
    authorizeConnection
  } = useConnections(currentTenantId ?? undefined);

  // Filter connections based on search and filters
  const filteredConnections = connections?.filter(conn => {
    const matchesSearch = !searchQuery || 
      conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      OIDC_PROVIDERS[conn.providerId]?.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || conn.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || conn.providerId === providerFilter;
    
    return matchesSearch && matchesStatus && matchesProvider;
  }) || [];

  const handleCreateConnection = async (data: any) => {
    try {
      // Use the new OAuth-first flow
      const result = await initiateConnection.mutateAsync({
        ...data,
        returnUrl: '/settings/connections'
      });
      
      // Close dialog and redirect user to OAuth provider
      setShowCreateDialog(false);
      
      // Open OAuth URL in the same window to complete the flow
      window.location.href = result.authUrl;
      
    } catch (error) {
      showErrorToast(error as Error);
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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading connections...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Connections</h1>
          <p className="text-muted-foreground mt-1">
            Manage OIDC connections to external services
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ConnectionStatus | 'all')}
                className="px-3 py-2 border border-input bg-background text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="connected">Connected</option>
                <option value="pending">Pending Authorization</option>
                <option value="expired">Expired</option>
                <option value="error">Error</option>
                <option value="authorizing">Authorizing</option>
                <option value="disabled">Disabled</option>
              </select>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background text-sm rounded-md"
              >
                <option value="all">All Providers</option>
                {Object.values(OIDC_PROVIDERS).map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.displayName}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      {filteredConnections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">
              {connections?.length === 0 ? 'No connections yet' : 'No matching connections'}
            </CardTitle>
            <CardDescription className="text-center mb-4">
              {connections?.length === 0 
                ? 'Create your first OIDC connection to external services'
                : 'Try adjusting your search or filter criteria'
              }
            </CardDescription>
            {connections?.length === 0 && (
              <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Connection
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
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
            />
          ))}
        </div>
      )}

      {/* Create Connection Dialog */}
      <CreateConnectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateConnection}
        isSubmitting={initiateConnection.isPending}
      />

      {/* Delete Connection Dialog */}
      <DeleteConnectionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        connection={selectedConnection}
        onConfirm={handleDeleteConnection}
        isDeleting={deleteConnection.isPending}
      />
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