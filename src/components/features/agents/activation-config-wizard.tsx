'use client';

import { useState, useEffect as React_useEffect } from 'react';
import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2, Power, ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Sparkles, Play, Lock } from 'lucide-react';

export type WorkflowParameter = {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
};

export type WorkflowDefinition = {
  id: string;
  workflowType: string;
  name: string | null;
  summary?: string | null;
  parameterDefinitions: WorkflowParameter[];
  activable?: boolean;
};

export type ActivationWizardData = {
  agent: {
    id: string;
    name: string;
    description: string | null;
  };
  workflows: WorkflowDefinition[];
};

export type InstanceMetadata = {
  name: string;
  description: string;
};

interface ActivationConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wizardData: ActivationWizardData | null;
  isLoading?: boolean;
  onComplete: (workflowInputs: Record<string, Record<string, string>>, metadata?: InstanceMetadata) => void;
  onCancel?: () => void;
  // Optional: Pre-populate with existing configuration
  initialWorkflowInputs?: Record<string, Record<string, string>>;
  // Optional: Include metadata step for creating new instances
  includeMetadataStep?: boolean;
  initialMetadata?: InstanceMetadata;
  onGenerateInstanceName?: () => InstanceMetadata;
  isSubmitting?: boolean;
}

export function ActivationConfigWizard({
  open,
  onOpenChange,
  wizardData,
  isLoading = false,
  onComplete,
  onCancel,
  initialWorkflowInputs = {},
  includeMetadataStep = false,
  initialMetadata = { name: '', description: '' },
  onGenerateInstanceName,
  isSubmitting = false,
}: ActivationConfigWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, Record<string, string>>>(initialWorkflowInputs);
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [metadata, setMetadata] = useState<InstanceMetadata>(initialMetadata);
  const [metadataErrors, setMetadataErrors] = useState<{ name?: string; description?: string }>({});
  const [metadataStepVisited, setMetadataStepVisited] = useState(false);

  // Calculate total steps
  const totalSteps = (wizardData?.workflows.length || 0) + (includeMetadataStep ? 1 : 0);
  const isMetadataStep = includeMetadataStep && currentStep === (wizardData?.workflows.length || 0);
  const currentWorkflowIndex = isMetadataStep ? 0 : currentStep;
  
  // If no workflows and metadata step is included, show only metadata
  const showOnlyMetadata = includeMetadataStep && (wizardData?.workflows.length || 0) === 0;

  // Sync metadata state when initialMetadata prop changes
  React.useEffect(() => {
    if (open && initialMetadata && (initialMetadata.name || initialMetadata.description)) {
      setMetadata({ name: initialMetadata.name, description: initialMetadata.description });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMetadata.name, initialMetadata.description]);

  // Sync workflow inputs when the wizard opens with new initialWorkflowInputs
  React.useEffect(() => {
    if (open && initialWorkflowInputs) {
      setWorkflowInputs({ ...initialWorkflowInputs });
    }
    // Only sync when wizard opens, not on every initialWorkflowInputs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset state when wizard opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(0);
      setWorkflowInputs(initialWorkflowInputs);
      setValidationErrors({});
      setMetadata(initialMetadata);
      setMetadataErrors({});
      setMetadataStepVisited(false);
    }
    onOpenChange(newOpen);
  };

  // Auto-generate name when reaching metadata step for the first time
  // Only if no initial name was provided
  React.useEffect(() => {
    if (isMetadataStep && !metadataStepVisited && onGenerateInstanceName) {
      // Only generate if the current name is empty (no initial metadata was provided)
      if (!metadata.name || metadata.name.trim() === '') {
        const generated = onGenerateInstanceName();
        setMetadata(generated);
      }
      setMetadataStepVisited(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetadataStep, metadataStepVisited, onGenerateInstanceName]);

  // Validation functions
  const validateParameterValue = (value: string, type: string): { isValid: boolean; error?: string } => {
    if (!value || value.trim() === '') {
      return { isValid: false, error: 'This field is required' };
    }

    switch (type) {
      case 'Int32':
        const intValue = parseInt(value, 10);
        if (isNaN(intValue)) {
          return { isValid: false, error: 'Must be a valid integer' };
        }
        if (!Number.isInteger(Number(value))) {
          return { isValid: false, error: 'Must be a whole number' };
        }
        break;
      
      case 'Decimal':
        const decimalValue = parseFloat(value);
        if (isNaN(decimalValue)) {
          return { isValid: false, error: 'Must be a valid number' };
        }
        break;
      
      case 'String':
        // String validation - just check it's not empty (already done above)
        break;
      
      default:
        // For unknown types, just check it's not empty
        break;
    }

    return { isValid: true };
  };

  const validateMetadata = (): boolean => {
    const errors: { name?: string; description?: string } = {};
    let isValid = true;

    // Validate instance name
    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.name = 'Instance name is required';
      isValid = false;
    } else if (metadata.name.trim().length < 3) {
      errors.name = 'Instance name must be at least 3 characters';
      isValid = false;
    } else if (metadata.name.trim().length > 100) {
      errors.name = 'Instance name must be less than 100 characters';
      isValid = false;
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(metadata.name)) {
      errors.name = 'Only letters, numbers, spaces, hyphens, and underscores allowed';
      isValid = false;
    }

    setMetadataErrors(errors);
    return isValid;
  };

  const validateCurrentWorkflow = (): boolean => {
    if (!wizardData) return false;

    const currentWorkflow = wizardData.workflows[currentWorkflowIndex];
    if (!currentWorkflow) {
      // No workflow at this index - nothing to validate
      return true;
    }
    
    const inputs = workflowInputs[currentWorkflow.workflowType] || {};
    const errors: Record<string, string> = {};
    let isValid = true;

    currentWorkflow.parameterDefinitions.forEach((param) => {
      if (!param.optional) {
        const value = inputs[param.name] || '';
        const validation = validateParameterValue(value, param.type);
        
        if (!validation.isValid) {
          errors[param.name] = validation.error || 'Invalid value';
          isValid = false;
        }
      } else if (inputs[param.name]) {
        // Validate optional fields only if they have a value
        const validation = validateParameterValue(inputs[param.name], param.type);
        if (!validation.isValid) {
          errors[param.name] = validation.error || 'Invalid value';
          isValid = false;
        }
      }
    });

    setValidationErrors((prev) => ({
      ...prev,
      [currentWorkflow.workflowType]: errors,
    }));

    return isValid;
  };

  const validateCurrentStep = (): boolean => {
    // If no workflows exist, no validation needed for workflow config
    if (!wizardData || wizardData.workflows.length === 0) {
      if (isMetadataStep) {
        return validateMetadata();
      }
      return true; // No workflows to validate
    }
    
    if (isMetadataStep) {
      return validateMetadata();
    } else {
      return validateCurrentWorkflow();
    }
  };

  const handleWorkflowInputChange = (workflowType: string, paramName: string, value: string) => {
    setWorkflowInputs((prev) => ({
      ...prev,
      [workflowType]: {
        ...prev[workflowType],
        [paramName]: value,
      },
    }));

    // Clear validation error for this field when user types
    setValidationErrors((prev) => ({
      ...prev,
      [workflowType]: {
        ...prev[workflowType],
        [paramName]: '',
      },
    }));
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateName = () => {
    if (onGenerateInstanceName) {
      const generated = onGenerateInstanceName();
      setMetadata(generated);
      setMetadataErrors({});
    }
  };

  const handleComplete = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (includeMetadataStep) {
      onComplete(workflowInputs, metadata);
    } else {
      onComplete(workflowInputs);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      handleOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-[600px]">
          <SheetHeader className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Power className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-lg">Activate a new agent</SheetTitle>
                <SheetDescription className="text-sm mt-1">
                  {wizardData ? wizardData.agent.name : 'Loading...'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading configuration...</span>
          </div>
        )}

        {!isLoading && wizardData && wizardData.workflows.length === 0 && !includeMetadataStep && (
          <>
            <div className="flex-1 px-6 py-8">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">No Configuration Needed</h3>
                <p className="text-muted-foreground">
                  This agent doesn&apos;t require any workflow parameters. Click Activate below to proceed.
                </p>
              </div>
            </div>

            <Separator />

            <div className="px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleComplete} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {!isLoading && wizardData && totalSteps > 0 && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {/* Progress Indicator - Only show if more than one step */}
                {totalSteps > 1 && (
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalSteps }).map((_, index) => {
                      const isCurrentStep = index === currentStep;
                      const isPastStep = index < currentStep;
                      const isLastStep = index === totalSteps - 1;
                      
                      return (
                        <div key={index} className="flex items-center flex-1">
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
                              isCurrentStep
                                ? 'border-primary bg-primary text-primary-foreground'
                                : isPastStep
                                ? 'border-green-600 bg-green-600 text-white'
                                : 'border-muted bg-background text-muted-foreground'
                            }`}
                          >
                            {isPastStep ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : isLastStep && includeMetadataStep ? (
                              <Sparkles className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          {index < totalSteps - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-2 ${
                                isPastStep ? 'bg-green-600' : 'bg-muted'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Current Step Content */}
                {isMetadataStep ? (
                  // Metadata Step (Name & Description)
                  <div className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h3 className="font-semibold text-lg">Describe your agent</h3>
                      {totalSteps > 1 && !showOnlyMetadata && (
                        <p className="text-sm text-muted-foreground mt-1.5">
                          Step {currentStep + 1} of {totalSteps}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-3 border-t pt-3">
                        {showOnlyMetadata 
                          ? 'This agent doesn\'t require configuration. Provide a name and description to create your instance.'
                          : 'Provide a name and description for this agent instance.'}
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="instance-name" className="flex items-center gap-2 text-sm font-medium">
                          Name of the agent
                          <span className="text-red-500">*</span>

                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="instance-name"
                            placeholder="e.g., Customer Support Bot"
                            value={metadata.name}
                            onChange={(e) => {
                              setMetadata({ ...metadata, name: e.target.value });
                              setMetadataErrors({ ...metadataErrors, name: undefined });
                            }}
                            maxLength={100}
                            className={metadataErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                          />
                          {onGenerateInstanceName && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={handleGenerateName}
                              title="Generate new name"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {metadataErrors.name ? (
                          <p className="text-xs text-red-500">{metadataErrors.name}</p>
                        ) : (
                          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md p-2.5">
                            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              This name cannot be changed after creation
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="instance-description" className="text-sm font-medium">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="instance-description"
                          placeholder="Describe what this instance will be used for"
                          value={metadata.description}
                          onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                          rows={4}
                          maxLength={500}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {metadata.description.length}/500 characters
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Workflow Configuration Step
                  (() => {
                    const currentWorkflow = wizardData.workflows[currentWorkflowIndex];
                    const workflowDisplayName = currentWorkflow.name || currentWorkflow.workflowType.split(':').pop() || 'Workflow';
                    return (
                      <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h3 className="font-semibold text-lg">
                            Configure &apos;{workflowDisplayName}&apos;
                          </h3>
                          {totalSteps > 1 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Step {currentStep + 1} of {totalSteps}
                            </p>
                          )}
                          {currentWorkflow.summary && (
                            <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                              {currentWorkflow.summary}
                            </p>
                          )}
                        </div>

                        <div className="space-y-4">
                          {currentWorkflow.parameterDefinitions.map((param) => {
                            const hasError = validationErrors[currentWorkflow.workflowType]?.[param.name];
                            return (
                              <div key={param.name} className="space-y-2">
                                <Label htmlFor={param.name}>
                                  {param.name}
                                  {!param.optional && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {param.description && (
                                  <p className="text-xs text-muted-foreground">{param.description}</p>
                                )}
                                <Input
                                  id={param.name}
                                  type={param.type === 'Int32' || param.type === 'Decimal' ? 'number' : 'text'}
                                  step={param.type === 'Decimal' ? '0.01' : undefined}
                                  placeholder={`Enter ${param.name.toLowerCase()}`}
                                  value={
                                    workflowInputs[currentWorkflow.workflowType]?.[param.name] || ''
                                  }
                                  onChange={(e) =>
                                    handleWorkflowInputChange(
                                      currentWorkflow.workflowType,
                                      param.name,
                                      e.target.value
                                    )
                                  }
                                  required={!param.optional}
                                  className={hasError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                {hasError ? (
                                  <p className="text-xs text-red-500">{hasError}</p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Type: {param.type}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            <Separator />

            <div className="px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <div>
                  {!showOnlyMetadata && (
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 0 || isSubmitting}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  {currentStep < totalSteps - 1 ? (
                    <Button onClick={handleNext} disabled={isSubmitting}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleComplete} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {includeMetadataStep ? 'Running...' : 'Activating...'}
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          {includeMetadataStep ? 'Activate' : 'Activate'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
