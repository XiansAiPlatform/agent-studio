# Unified Configuration Wizard Implementation

## Overview
This document describes the implementation of a unified configuration wizard that is shared between the "Create New Instance" flow on `/agents/store` and the "Activate Agent" flow on `/agents/running`.

## Changes Made

### 1. New Shared Component: `ActivationConfigWizard`
**Location:** `src/components/features/agents/activation-config-wizard.tsx`

A reusable wizard component that handles the configuration of agent workflows with parameters. Features include:

- **Multi-step workflow configuration** with progress indicators
- **Validation** for required and optional fields
- **Type-safe inputs** supporting Int32, Decimal, and String types
- **Pre-population support** for existing configurations
- **Responsive UI** with proper error handling

**Exported Types:**
- `ActivationWizardData`: Contains agent info and workflow definitions
- `WorkflowDefinition`: Defines a single workflow with its parameters
- `WorkflowParameter`: Defines individual parameters with types and validation rules

### 2. Updated `/agents/store` Flow

**Changes to:** `src/app/(dashboard)/agents/store/page.tsx`

**New Flow:**
1. User clicks on a deployed agent card
2. **Configuration wizard opens first** (if workflows have parameters)
3. User configures all workflow parameters
4. **Then name/description sheet opens** with pre-populated suggestions
5. User provides instance name and description
6. Instance is created with both configuration and metadata

**Key Changes:**
- Added configuration wizard state management
- Modified `handleDeploymentClick` to load and show configuration wizard
- New `handleConfigWizardComplete` to transition from config to name/description
- Updated `handleCreateInstance` to include workflow configuration in the API call

### 3. Updated `/agents/running` Flow

**Changes to:** `src/app/(dashboard)/agents/running/page.tsx`

**Simplified Flow:**
1. User clicks "Activate Agent" on an inactive agent
2. Configuration wizard opens
3. User configures workflow parameters (pre-populated if previously configured)
4. Agent is activated with the configuration

**Key Changes:**
- Replaced inline wizard implementation with shared `ActivationConfigWizard`
- Removed duplicate validation logic
- Simplified state management
- Maintained support for pre-populating from existing configurations

### 4. Enhanced Agent Details Sheet

**Changes to:** `src/app/(dashboard)/agents/store/components/agent-details-sheet.tsx`

**New Features:**
- Added `hasConfiguration` prop to indicate configuration is complete
- Shows a success banner when configuration is complete
- Updated UI text to reflect the two-step process

## User Experience

### Creating a New Instance (Store Page)
```
1. Click on deployed agent card
   ↓
2. Configure workflows (wizard)
   ↓
3. Click "Continue"
   ↓
4. Provide name & description
   ↓
5. Click "Create Instance"
   ↓
6. Redirected to /agents/running with new instance highlighted
```

### Activating an Agent (Running Page)
```
1. Click "Activate Agent" on inactive agent
   ↓
2. Configure workflows (wizard, pre-populated if exists)
   ↓
3. Click "Continue" (or "Activate" if last step)
   ↓
4. Agent activated
   ↓
5. Agents list refreshed with updated status
```

## Benefits

1. **Code Reusability**: Single wizard component used in both locations
2. **Consistency**: Same UX for configuration across the app
3. **Maintainability**: Configuration logic centralized in one place
4. **Better UX**: Clear two-step process (configure → name) for creating instances
5. **Validation**: Centralized validation logic with type-specific rules
6. **Pre-population**: Supports loading existing configurations

## API Integration

Both flows use the same API endpoints:

### Create Instance with Configuration
```typescript
POST /api/tenants/{tenantId}/agent-activations
{
  "name": "instance-name",
  "agentName": "agent-name",
  "description": "optional description",
  "workflowConfiguration": {
    "workflows": [
      {
        "workflowType": "workflow-type",
        "inputs": [
          { "name": "param1", "value": "value1" },
          { "name": "param2", "value": "value2" }
        ]
      }
    ]
  }
}
```

### Activate Agent with Configuration
```typescript
POST /api/tenants/{tenantId}/agent-activations/{activationId}/activate
{
  "workflowConfiguration": {
    "workflows": [...]
  }
}
```

## Technical Details

### State Management
- **Wizard Data**: Stores agent info and workflow definitions
- **Workflow Inputs**: Stores user-entered parameter values
- **Validation Errors**: Tracks validation state per workflow/parameter

### Validation Rules
- **Int32**: Must be a valid whole number
- **Decimal**: Must be a valid number (allows decimals)
- **String**: Non-empty string (for required fields)
- **Optional fields**: Only validated if user provides a value

### Progress Tracking
- Multi-step wizard shows progress indicator
- Each step must be validated before proceeding
- Users can navigate back to previous steps
- Configuration is preserved when navigating between steps

## Files Changed

1. ✅ `src/components/features/agents/activation-config-wizard.tsx` (new)
2. ✅ `src/components/features/agents/index.ts` (new)
3. ✅ `src/app/(dashboard)/agents/store/page.tsx` (modified)
4. ✅ `src/app/(dashboard)/agents/running/page.tsx` (modified)
5. ✅ `src/app/(dashboard)/agents/store/components/agent-details-sheet.tsx` (modified)

## Testing Recommendations

1. **Create Instance Flow**
   - Test with agent having multiple workflows
   - Test with agent having no workflow parameters
   - Test validation (required fields, type validation)
   - Test name/description generation
   - Verify configuration is saved correctly

2. **Activate Agent Flow**
   - Test activation with new configuration
   - Test activation with pre-populated configuration
   - Test editing existing configuration
   - Verify activation status updates correctly

3. **Edge Cases**
   - Agent with no workflows
   - Agent with optional-only parameters
   - Navigation between steps
   - Canceling wizard at different stages
   - Network errors during configuration load
