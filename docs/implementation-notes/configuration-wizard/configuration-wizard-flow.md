# Configuration Wizard Flow Diagram

## Create New Instance Flow (Store Page)

```
┌─────────────────────────────────────────────────────────────────┐
│                    /agents/store Page                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks deployed agent card
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ActivationConfigWizard Component                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Step 1: Configure Workflow A                            │  │
│  │  - Parameter 1 (Int32)   [_____]                         │  │
│  │  - Parameter 2 (String)  [_____]                         │  │
│  │                                    [Cancel] [Next ➜]     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Step 2: Configure Workflow B                            │  │
│  │  - Parameter 3 (Decimal) [_____]                         │  │
│  │                      [← Back] [Cancel] [Continue ✓]      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Continue"
                              │ (Configuration saved)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                AgentDetailsSheet Component                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ✓ Configuration Complete                                │  │
│  │    Agent workflows have been configured.                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Instance Details                                         │  │
│  │  Instance Name *  [Customer Support Bot]  [🔄]           │  │
│  │  Description      [This instance handles customer...]    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│                        [Create Instance ✓]                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Call: Create activation with
                              │ workflow configuration + metadata
                              ▼
                    ┌──────────────────────┐
                    │  Success Toast       │
                    │  Redirect to         │
                    │  /agents/running     │
                    └──────────────────────┘
```

## Activate Agent Flow (Running Page)

```
┌─────────────────────────────────────────────────────────────────┐
│                   /agents/running Page                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Inactive Agent Card                                    │    │
│  │  Status: Inactive                                       │    │
│  │  [View Actions]                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Activate Agent"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ActivationConfigWizard Component                    │
│         (Pre-populated with existing config if any)              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Step 1: Configure Workflow A                            │  │
│  │  - Parameter 1 (Int32)   [100] ← pre-filled             │  │
│  │  - Parameter 2 (String)  [existing] ← pre-filled        │  │
│  │                                    [Cancel] [Next ➜]     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Step 2: Configure Workflow B                            │  │
│  │  - Parameter 3 (Decimal) [25.5] ← pre-filled            │  │
│  │                      [← Back] [Cancel] [Continue ✓]      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Continue"
                              │ API Call: Activate with configuration
                              ▼
                    ┌──────────────────────┐
                    │  Success Toast       │
                    │  Agent Activated     │
                    │  List refreshed      │
                    └──────────────────────┘
```

## Component Reusability

```
┌────────────────────────────────────────────────────────────────┐
│         ActivationConfigWizard (Shared Component)              │
│                                                                 │
│  Props:                                                         │
│  - open: boolean                                                │
│  - wizardData: ActivationWizardData                            │
│  - isLoading: boolean                                           │
│  - initialWorkflowInputs?: Record<...>                         │
│  - onComplete: (inputs) => void                                 │
│  - onCancel: () => void                                         │
│                                                                 │
│  Features:                                                      │
│  ✓ Multi-step navigation                                       │
│  ✓ Progress indicator                                          │
│  ✓ Field validation                                            │
│  ✓ Type-specific inputs                                        │
│  ✓ Pre-population support                                      │
│  ✓ Error handling                                              │
└────────────────────────────────────────────────────────────────┘
           ▲                                    ▲
           │                                    │
           │ Used by                            │ Used by
           │                                    │
┌──────────┴────────────┐          ┌───────────┴─────────────┐
│  /agents/store        │          │  /agents/running        │
│                       │          │                         │
│  For creating new     │          │  For activating         │
│  instances with       │          │  existing instances     │
│  configuration        │          │  with configuration     │
└───────────────────────┘          └─────────────────────────┘
```

## Data Flow

```
1. Store Page Flow:
   ┌─────────────┐
   │ User Action │ Click deployed agent
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │  API Call   │ Fetch agent deployment details
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │   Wizard    │ Configure workflows
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │Name/Desc    │ Provide instance metadata
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │  API Call   │ POST /agent-activations
   │             │ { name, agentName, description,
   │             │   workflowConfiguration }
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │  Redirect   │ /agents/running?newInstance=id
   └─────────────┘

2. Running Page Flow:
   ┌─────────────┐
   │ User Action │ Click "Activate Agent"
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │  API Call   │ Fetch agent deployment details
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │  API Call   │ Fetch current activation (for pre-fill)
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │   Wizard    │ Configure workflows (pre-filled)
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │  API Call   │ POST /agent-activations/{id}/activate
   │             │ { workflowConfiguration }
   └──────┬──────┘
          ▼
   ┌─────────────┐
   │  Refresh    │ Reload agents list
   └─────────────┘
```

## Validation Flow

```
User enters value
      ▼
┌──────────────┐
│ Type Check   │ Int32, Decimal, String
└──────┬───────┘
       ▼
┌──────────────┐
│ Required?    │
└──┬─────────┬─┘
   │ Yes     │ No
   ▼         ▼
┌─────┐   ┌──────┐
│Check│   │Allow │
│empty│   │empty │
└──┬──┘   └───┬──┘
   ▼          ▼
┌─────────────┐
│Show error or│
│accept value │
└─────────────┘
```

## Navigation & State

### Step State Machine
- **Step 1**: Back disabled, Next enabled (if valid)
- **Middle steps**: Back and Next enabled
- **Last step**: Final button ("Create Instance" or "Activate"), Next disabled

### Progress Indicator
- `●` = Current step | `✓` = Complete | Number = Upcoming
- Metadata step (new instance) uses ✨ icon
