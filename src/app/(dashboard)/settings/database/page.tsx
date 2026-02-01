'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Database, Bot, Loader2, AlertCircle, Calendar, FileText, Filter, ChevronDown, ChevronRight, Clock, Search, Layers, Activity, ChevronLeft, Trash2 } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useDataSchema } from './hooks/use-data-schema';
import { useDataRecords } from './hooks/use-data-records';
import { DATE_RANGES, type DataRecord } from './types';
import { showToast } from '@/lib/toast';

function DatabaseContent() {
  const searchParams = useSearchParams();
  const { currentTenantId, isLoading: tenantLoading } = useTenant();
  
  const agentName = searchParams.get('agentName');
  const activationName = searchParams.get('activationName');

  // Debug logging
  console.log('[Database Page] Tenant ID:', currentTenantId, 'Loading:', tenantLoading);
  
  const [selectedDateRange, setSelectedDateRange] = useState(DATE_RANGES[4]); // Default to last 12 months
  const [customStartDate, setCustomStartDate] = useState(DATE_RANGES[4].startDate);
  const [customEndDate, setCustomEndDate] = useState(DATE_RANGES[4].endDate);
  const [selectedDataType, setSelectedDataType] = useState<string | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(50); // Records per page
  const [hoveredDataType, setHoveredDataType] = useState<string | null>(null);
  const [deletingDataType, setDeletingDataType] = useState<string | null>(null);
  const [hoveredRecord, setHoveredRecord] = useState<string | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<string | null>(null);

  // Fetch data schema
  const {
    data: schemaData,
    isLoading: schemaLoading,
    error: schemaError
  } = useDataSchema(
    currentTenantId,
    agentName,
    activationName,
    customStartDate,
    customEndDate,
    !!(currentTenantId && agentName && activationName && !tenantLoading)
  );

  // Fetch data records when a data type is selected
  const {
    data: recordsData,
    isLoading: recordsLoading,
    error: recordsError
  } = useDataRecords(
    currentTenantId,
    agentName,
    activationName,
    selectedDataType,
    customStartDate,
    customEndDate,
    currentPage * pageSize, // skip
    pageSize, // limit
    !!(selectedDataType && currentTenantId && agentName && activationName && !tenantLoading)
  );

  const toggleRecordExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRecords(newExpanded);
  };

  const formatDateForInput = (isoString: string) => {
    return isoString.split('T')[0];
  };

  const formatDateFromInput = (dateString: string) => {
    return new Date(dateString + 'T00:00:00.000Z').toISOString();
  };

  const handleDateRangeChange = (value: string) => {
    const range = DATE_RANGES.find(r => r.value === value);
    if (range) {
      setSelectedDateRange(range);
      setCustomStartDate(range.startDate);
      setCustomEndDate(range.endDate);
      setSelectedDataType(null); // Reset data type when date changes
    }
  };

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setCustomStartDate(formatDateFromInput(startDate));
    setCustomEndDate(formatDateFromInput(endDate));
    setSelectedDataType(null); // Reset data type when date changes
    setCurrentPage(0); // Reset pagination
  };

  const handleDataTypeSelect = (type: string) => {
    setSelectedDataType(type === selectedDataType ? null : type);
    setCurrentPage(0); // Reset pagination when changing data type
    setExpandedRecords(new Set()); // Reset expanded records
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if (recordsData && recordsData.data.length === pageSize) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleDeleteDataType = async (dataType: string) => {
    if (!currentTenantId || !agentName || !activationName) return;
    
    setDeletingDataType(dataType);
    
    try {
      const searchParams = new URLSearchParams({
        startDate: customStartDate,
        endDate: customEndDate,
        agentName,
        dataType
      });
      
      const response = await fetch(
        `/api/tenants/${currentTenantId}/data?${searchParams.toString()}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete data (${response.status})`);
      }
      
      // If this was the selected data type, clear the selection
      if (selectedDataType === dataType) {
        setSelectedDataType(null);
      }
      
      // Force a refresh of the data by updating the date range slightly
      // This will trigger the useDataSchema hook to refetch
      const currentStart = customStartDate;
      const currentEnd = customEndDate;
      setCustomStartDate(new Date(new Date(currentStart).getTime() + 1).toISOString());
      setTimeout(() => {
        setCustomStartDate(currentStart);
      }, 100);
      
      // Show success toast
      showToast.success({
        title: 'Data type deleted',
        description: `All data for "${dataType}" has been successfully deleted.`,
      });
      
    } catch (error: any) {
      console.error('Error deleting data type:', error);
      showToast.error({
        title: 'Failed to delete data',
        description: error.message || 'An unexpected error occurred while deleting the data type.',
      });
    } finally {
      setDeletingDataType(null);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!currentTenantId) return;
    
    setDeletingRecord(recordId);
    
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/data/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete record (${response.status})`);
      }
      
      // Force a refresh of the records data by updating the page
      setCurrentPage(0);
      // Trigger a small state change to force refetch
      const currentStart = customStartDate;
      setCustomStartDate(new Date(new Date(currentStart).getTime() + 1).toISOString());
      setTimeout(() => {
        setCustomStartDate(currentStart);
      }, 100);
      
      // Show success toast
      showToast.success({
        title: 'Record deleted',
        description: 'The data record has been successfully deleted.',
      });
      
    } catch (error: any) {
      console.error('Error deleting record:', error);
      showToast.error({
        title: 'Failed to delete record',
        description: error.message || 'An unexpected error occurred while deleting the record.',
      });
    } finally {
      setDeletingRecord(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderContent = (content: Record<string, any>) => {
    return Object.entries(content).map(([key, value]) => (
      <div key={key} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
        <span className="text-xs font-normal text-slate-400 capitalize min-w-0 mt-2.5">
          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-600 font-mono bg-white/60 px-2 py-1.5 rounded border border-slate-100 break-all">
            {typeof value === 'object' ? (
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              <span className="text-slate-600">
                {String(value)}
              </span>
            )}
          </div>
        </div>
      </div>
    ));
  };

  // Show loading state while tenant is being initialized
  if (tenantLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Database</h1>
            <p className="text-muted-foreground mt-1">
              View and explore data records for your agents
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading tenant information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!agentName || !activationName) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Database</h1>
            <p className="text-muted-foreground mt-1">
              View and explore data records for your agents
            </p>
          </div>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">Select an Agent</CardTitle>
            <CardDescription className="text-center">
              Use the sidebar to select an agent to view its data records and activity
            </CardDescription>
          </CardContent>
        </Card>
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
                <Database className="h-6 w-6 text-primary" />
                Data Explorer
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-muted-foreground">Exploring data for</span>
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">
          
          {/* Left Column - Filters & Data Types */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Filters Section */}
            <div className="bg-white/85 backdrop-blur-sm rounded-xl border shadow-sm">
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">
                    Quick Select
                  </label>
                  <Select
                    value={selectedDateRange.value}
                    onValueChange={handleDateRangeChange}
                  >
                    <SelectTrigger className="w-full h-8 border-border/50 hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-primary" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      From
                    </label>
                    <Input
                      type="date"
                      value={formatDateForInput(customStartDate)}
                      onChange={(e) => handleCustomDateChange(e.target.value, formatDateForInput(customEndDate))}
                      className="h-8 border-border/50 hover:border-primary/50 transition-colors text-xs"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      To
                    </label>
                    <Input
                      type="date"
                      value={formatDateForInput(customEndDate)}
                      onChange={(e) => handleCustomDateChange(formatDateForInput(customStartDate), e.target.value)}
                      className="h-8 border-border/50 hover:border-primary/50 transition-colors text-xs"
                    />
                  </div>
                </div>
                
                <div className="bg-white/80 border border-border/30 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Period:</strong> {new Date(customStartDate).toLocaleDateString()} to {new Date(customEndDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Types Section */}
            <div className="bg-white/85 backdrop-blur-sm rounded-xl border shadow-sm">
              <div className="p-6 border-b border-border/50">
                <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
                  <Layers className="h-5 w-5 text-primary" />
                  Data Types
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a data type to explore its records
                </p>
              </div>
              
              <div className="p-6">
                {schemaLoading && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Loading data types...</p>
                  </div>
                )}

                {schemaError && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                    <p className="text-sm font-medium text-destructive mb-1">Failed to load data types</p>
                    <p className="text-xs text-muted-foreground">{schemaError}</p>
                  </div>
                )}

                {schemaData?.types && (
                  <div className="space-y-2">
                    {schemaData.types.map((type) => (
                      <div
                        key={type}
                        className={`group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                          selectedDataType === type
                            ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                            : 'border-border/30 hover:border-primary/50 hover:bg-white/90 bg-white/70'
                        }`}
                        onMouseEnter={() => setHoveredDataType(type)}
                        onMouseLeave={() => setHoveredDataType(null)}
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div 
                            className="flex items-center gap-3 flex-1"
                            onClick={() => handleDataTypeSelect(type)}
                          >
                            <FileText className={`h-4 w-4 ${
                              selectedDataType === type ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <span className={`font-medium ${
                              selectedDataType === type ? 'text-primary' : 'text-foreground'
                            }`}>
                              {type}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Delete button - shown on hover */}
                            {hoveredDataType === type && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {deletingDataType === type ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Data Type</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete all data for "{type}"? This will permanently remove all records of this type from{' '}
                                      <strong>{new Date(customStartDate).toLocaleDateString()}</strong> to{' '}
                                      <strong>{new Date(customEndDate).toLocaleDateString()}</strong> for agent{' '}
                                      <strong>{agentName}</strong>.
                                      <br /><br />
                                      <span className="text-destructive font-medium">This action cannot be undone.</span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteDataType(type)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={deletingDataType === type}
                                    >
                                      {deletingDataType === type ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        'Delete Data'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            
                            {/* Active/Select badge - hidden on hover when delete button is shown */}
                            {hoveredDataType !== type && (
                              <div 
                                className={`text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors ${
                                  selectedDataType === type
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'border-border text-muted-foreground bg-muted/50'
                                }`}
                                onClick={() => handleDataTypeSelect(type)}
                              >
                                {selectedDataType === type ? 'Active' : 'Select'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Data Records */}
          <div className="lg:col-span-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border shadow-sm h-full">
              
              {!selectedDataType ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Select a Data Type</h3>
                    <p className="text-muted-foreground">
                      Choose a data type from the left panel to explore its records
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Records Header */}
                  <div className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
                          <Activity className="h-5 w-5 text-primary" />
                          {selectedDataType}
                        </h2>
                        {recordsData && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, recordsData.total)} of {recordsData.total} records
                          </p>
                        )}
                      </div>
                      
                      {recordsData && recordsData.total > pageSize && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousPage}
                            disabled={currentPage === 0 || recordsLoading}
                            className="h-8 px-3"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground px-2">
                            Page {currentPage + 1}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={!recordsData || recordsData.data.length < pageSize || recordsLoading}
                            className="h-8 px-3"
                          >
                            {recordsLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Records Content */}
                  <div className="flex-1 overflow-auto">
                    {recordsLoading && (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                        <p className="text-sm text-muted-foreground">Loading records...</p>
                      </div>
                    )}

                    {recordsError && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <p className="text-lg font-medium text-destructive mb-2">Error Loading Records</p>
                        <p className="text-sm text-muted-foreground">{recordsError}</p>
                      </div>
                    )}

                    {recordsData && (
                      <div className="p-6">
                        {recordsData.data.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">No records found for the selected criteria</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {recordsData.data.map((record) => (
                              <div
                                key={record.id}
                                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-white via-white to-slate-50/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1"
                                onMouseEnter={() => setHoveredRecord(record.id)}
                                onMouseLeave={() => setHoveredRecord(null)}
                              >
                                {/* Subtle gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] pointer-events-none" />
                                
                                
                                <div
                                  className="relative flex items-center justify-between p-6 cursor-pointer hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent transition-all duration-200"
                                  onClick={() => toggleRecordExpansion(record.id)}
                                >
                                  <div className="flex items-start gap-4 flex-1">
                                    <div className={`flex-shrink-0 mt-1 p-2 rounded-xl transition-all duration-200 ${
                                      expandedRecords.has(record.id) 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
                                    }`}>
                                      {expandedRecords.has(record.id) ? (
                                        <ChevronDown className="h-5 w-5" />
                                      ) : (
                                        <ChevronRight className="h-5 w-5" />
                                      )}
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between mb-2">
                                        <p className="text-sm font-normal text-slate-600 break-all leading-relaxed">
                                          {record.key}
                                        </p>
                                        <Badge 
                                          variant="secondary" 
                                          className="ml-3 bg-slate-100 text-slate-500 border-slate-200 font-normal px-2 py-1 text-xs"
                                        >
                                          {Object.keys(record.content).length} fields
                                        </Badge>
                                      </div>
                                      
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <Badge 
                                          variant="outline" 
                                          className="border-slate-200 bg-slate-50/80 text-slate-500 px-2 py-0.5 text-xs font-normal"
                                        >
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                                          {record.participantId}
                                        </Badge>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                          <Clock className="h-3 w-3" />
                                          <span>
                                            {formatDate(record.createdAt)}
                                          </span>
                                          {hoveredRecord === record.id && (
                                            <>
                                              <span className="text-slate-300">•</span>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <button
                                                    className="text-xs text-destructive hover:text-destructive/80 underline transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {deletingRecord === record.id ? (
                                                      <span className="flex items-center gap-1">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        deleting...
                                                      </span>
                                                    ) : (
                                                      'delete'
                                                    )}
                                                  </button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to delete this data record?
                                                      <br /><br />
                                                      <strong>Record Key:</strong> {record.key}
                                                      <br />
                                                      <strong>Record ID:</strong> {record.id}
                                                      <br /><br />
                                                      <span className="text-destructive font-medium">This action cannot be undone.</span>
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                      onClick={() => handleDeleteRecord(record.id)}
                                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                      disabled={deletingRecord === record.id}
                                                    >
                                                      {deletingRecord === record.id ? (
                                                        <>
                                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                          Deleting...
                                                        </>
                                                      ) : (
                                                        'Delete Record'
                                                      )}
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {expandedRecords.has(record.id) && (
                                  <div className="relative border-t border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white">
                                    <div className="p-6 space-y-6">
                                      {/* Content Section */}
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Database className="h-4 w-4 text-slate-400" />
                                          <span className="text-sm font-medium text-slate-600">
                                            Content
                                          </span>
                                        </div>
                                        <div className="bg-slate-50/50 rounded-lg p-4 space-y-2 border border-slate-200/40">
                                          {renderContent(record.content)}
                                        </div>
                                      </div>
                                      
                                      {/* Metadata Section */}
                                      {record.metadata && (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 mb-2">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-600">
                                              Metadata
                                            </span>
                                          </div>
                                          <div className="bg-slate-50/50 rounded-lg p-4 space-y-2 border border-slate-200/40">
                                            {renderContent(record.metadata)}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Record details */}
                                      <div className="pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                                          <span>ID: {record.id}</span>
                                          <span>•</span>
                                          <span>Created: {formatDate(record.createdAt)}</span>
                                          {record.updatedAt && (
                                            <>
                                              <span>•</span>
                                              <span>Updated: {formatDate(record.updatedAt)}</span>
                                            </>
                                          )}
                                          {record.expiresAt && (
                                            <>
                                              <span>•</span>
                                              <span>Expires: {formatDate(record.expiresAt)}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DatabasePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Database</h1>
            <p className="text-muted-foreground mt-1">
              View and explore data records for your agents
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <DatabaseContent />
    </Suspense>
  );
}