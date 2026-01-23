# Unified Configuration Wizard - Sequential Flow

## Overview
The configuration wizard now provides a **unified sequential flow** with Next/Back buttons throughout all steps. Users can navigate back and forth between configuration and metadata steps in a single continuous wizard experience.

## Key Features

✅ **Single Continuous Wizard** - All steps in one flow  
✅ **Next/Back Navigation** - Navigate freely between all steps  
✅ **Progress Indicator** - Visual progress bar showing all steps  
✅ **Flexible Configuration** - Supports workflows with or without parameters  
✅ **Metadata Integration** - Name and description as final step (for new instances)  
✅ **Pre-population** - Auto-generates instance names and descriptions  
✅ **Validation** - Real-time validation with helpful error messages  

## User Flows

### Flow 1: Create New Instance (`/agents/store`)

```
User clicks deployed agent card
         ↓
┌─────────────────────────────────────────────┐
│  Configuration Wizard Opens                 │
│  ┌───────────────────────────────────────┐  │
│  │ Step 1/3: Configure Workflow A        │  │
│  │ - Parameter 1 (Int32)   [____]        │  │
│  │ - Parameter 2 (String)  [____]        │  │
│  │                    [Cancel] [Next →]  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↓ Click Next
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐  │
│  │ Step 2/3: Configure Workflow B        │  │
│  │ - Parameter 3 (Decimal) [____]        │  │
│  │          [← Back] [Cancel] [Next →]   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↓ Click Next
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐  │
│  │ Step 3/3: Instance Details ✨         │  │
│  │ Name:        [Customer Support Bot] 🔄│  │
│  │ Description: [This instance...]       │  │
│  │     [← Back] [Cancel] [Create ✓]     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↓ Click Create Instance
    Instance Created!
    Redirect to /agents/running
```

### Flow 2: Activate Existing Agent (`/agents/running`)

```
User clicks "Activate Agent" on inactive agent
         ↓
┌─────────────────────────────────────────────┐
│  Configuration Wizard Opens                 │
│  (Pre-filled with existing config if any)   │
│  ┌───────────────────────────────────────┐  │
│  │ Step 1/2: Configure Workflow A        │  │
│  │ - Parameter 1 (Int32)   [100] ✓       │  │
│  │ - Parameter 2 (String)  [value] ✓     │  │
│  │                    [Cancel] [Next →]  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↓ Click Next
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐  │
│  │ Step 2/2: Configure Workflow B        │  │
│  │ - Parameter 3 (Decimal) [25.5] ✓      │  │
│  │     [← Back] [Cancel] [Activate ✓]    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↓ Click Activate
    Agent Activated!
    Agents list refreshed
```

## Progress Indicator

The wizard displays a visual progress indicator showing:
- ✅ Completed steps (green checkmark)
- 🔵 Current step (highlighted)
- ⚪ Upcoming steps (gray)
- ✨ Final metadata step (sparkle icon for new instances)

```
Example with 3 steps:
┌───┐─────┌───┐─────┌───┐
│ ✓ │─────│ 2 │─────│ ✨ │
└───┘     └───┘     └───┘
  ↑         ↑         ↑
 Done    Current   Metadata
```

## Navigation Behavior

### Next Button
- **Validates current step** before proceeding
- Shows **validation errors** if any
- Advances to next step on success
- Changes to **"Create Instance"** or **"Activate"** on final step

### Back Button
- **Always enabled** except on first step
- **No validation** when going back
- **Preserves entered data** from all steps

### Cancel Button
- Available on all steps
- **Discards all changes** and closes wizard
- **Confirms before closing** if user has entered data

## Step Types

### 1. Workflow Configuration Steps
- One step per workflow with parameters
- Supports multiple parameter types:
  - **Int32**: Whole numbers
  - **Decimal**: Numbers with decimals
  - **String**: Text input
- **Required** fields marked with *
- **Optional** fields validated only if filled
- Real-time validation feedback

### 2. Metadata Step (New Instances Only)
- **Instance Name**: Required, 3-100 characters
- **Description**: Optional, up to 500 characters
- **Auto-generation**: Click 🔄 to generate new name
- Pre-populated with smart suggestions

## Validation Rules

### Workflow Parameters
| Type    | Validation                           |
|---------|--------------------------------------|
| Int32   | Must be a valid whole number        |
| Decimal | Must be a valid number (with decimals) |
| String  | Non-empty for required fields        |

### Instance Metadata
| Field       | Rules                                    |
|-------------|------------------------------------------|
| Name        | 3-100 chars, letters/numbers/spaces/-/_ |
| Description | Optional, max 500 characters            |

## Component Props

### ActivationConfigWizard

```typescript
interface ActivationConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wizardData: ActivationWizardData | null;
  isLoading?: boolean;
  
  // Callback when wizard is completed
  onComplete: (
    workflowInputs: Record<string, Record<string, string>>,
    metadata?: InstanceMetadata
  ) => void;
  
  onCancel?: () => void;
  
  // Pre-populate workflow inputs
  initialWorkflowInputs?: Record<string, Record<string, string>>;
  
  // Include metadata step for new instances
  includeMetadataStep?: boolean;
  
  // Pre-populate instance name/description
  initialMetadata?: InstanceMetadata;
  
  // Function to generate new instance name
  onGenerateInstanceName?: () => InstanceMetadata;
  
  // Show loading state on submit button
  isSubmitting?: boolean;
}
```

## Implementation Details

### Store Page (`/agents/store`)

**Wizard Configuration:**
```typescript
<ActivationConfigWizard
  open={showConfigWizard}
  onOpenChange={setShowConfigWizard}
  wizardData={wizardData}
  isLoading={isLoadingWizard}
  onComplete={handleConfigWizardComplete}
  onCancel={handleConfigWizardCancel}
  includeMetadataStep={true}  // ← Enable metadata step
  initialMetadata={initialMetadata}
  onGenerateInstanceName={handleGenerateInstanceName}
  isSubmitting={isCreatingInstance}
/>
```

**onComplete Handler:**
- Receives both `workflowInputs` and `metadata`
- Creates instance with full configuration
- Shows success toast
- Redirects to `/agents/running`

### Running Page (`/agents/running`)

**Wizard Configuration:**
```typescript
<ActivationConfigWizard
  open={showActivationWizard}
  onOpenChange={setShowActivationWizard}
  wizardData={wizardData}
  isLoading={isLoadingWizard}
  initialWorkflowInputs={workflowInputs}  // ← Pre-fill
  onComplete={handleConfigWizardComplete}
  onCancel={handleConfigWizardCancel}
  // No metadata step - already has name/description
  isSubmitting={isActivating}
/>
```

**onComplete Handler:**
- Receives only `workflowInputs`
- Activates instance with configuration
- Shows success toast
- Refreshes agents list

## Benefits of Sequential Flow

### User Experience
✅ **Intuitive Navigation** - Natural flow with clear next steps  
✅ **Error Recovery** - Easy to go back and fix mistakes  
✅ **Progress Visibility** - Always know where you are  
✅ **Flexible Workflow** - Skip optional fields, edit previous steps  

### Developer Experience
✅ **Single Component** - One wizard handles all cases  
✅ **Composable** - Easy to add/remove steps  
✅ **Maintainable** - All logic in one place  
✅ **Reusable** - Same component for different flows  

## Edge Cases Handled

### No Configuration Required
- Wizard shows "No Configuration Needed" message
- Single "Continue" or "Activate" button
- Skips directly to metadata step (if applicable)

### Single Workflow
- No progress indicator needed
- Direct navigation to metadata step

### Pre-populated Data
- Running page: Loads existing configuration
- Store page: Generates smart defaults for name/description
- All fields editable with validation

### Validation Errors
- Inline error messages per field
- Prevent navigation until fixed
- Clear errors when user types

## Migration Notes

### Removed Components
- ❌ `AgentDetailsSheet` - No longer needed for creating instances
- ❌ Separate name/description dialog

### Updated Imports
```typescript
import { 
  ActivationConfigWizard, 
  ActivationWizardData,
  InstanceMetadata 
} from '@/components/features/agents';
```

## Testing Checklist

- [ ] Create instance with multiple workflows
- [ ] Create instance with single workflow
- [ ] Create instance with no workflows
- [ ] Navigate back/forward between steps
- [ ] Test validation on all field types
- [ ] Generate new instance names
- [ ] Cancel wizard at different steps
- [ ] Activate agent with pre-filled config
- [ ] Activate agent and update config
- [ ] Test with optional parameters
- [ ] Test network error handling
- [ ] Verify redirect after success
- [ ] Check toast notifications

## Future Enhancements

- [ ] Save draft configurations
- [ ] Workflow templates/presets
- [ ] Bulk instance creation
- [ ] Configuration history/versioning
- [ ] Step-specific help tooltips
- [ ] Keyboard shortcuts (Enter = Next, Esc = Cancel)
