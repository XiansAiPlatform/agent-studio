# Toast Notifications

Professional minimalist toast notifications using shadcn/ui's Sonner component.

## Overview

We use the official **shadcn/ui Sonner** component, fully integrated with our Nordic theme and component library.

## Quick Start

```typescript
import { showToast } from '@/lib/toast'

// Success
showToast.success({
  title: "Changes saved",
  description: "Your settings have been updated"
})

// Error
showToast.error({
  title: "Failed to save",
  description: "Please try again"
})

// Warning
showToast.warning({
  title: "Session expiring",
  description: "You'll be logged out in 5 minutes"
})

// Info
showToast.info({
  title: "New feature available"
})

// Loading
const toastId = showToast.loading({
  title: "Saving...",
  description: "Please wait"
})
// Later: showToast.dismiss(toastId)
```

## With Action Buttons

```typescript
showToast.error({
  title: "Connection failed",
  description: "Unable to reach server",
  action: {
    label: "Retry",
    onClick: () => refetch()
  }
})
```

## Design

### Visual Style
- **Position**: Bottom-right
- **Width**: 400-500px (wider for better readability)
- **Background**: Card with subtle color tints (5% opacity light, 10% dark)
- **Border**: 1px solid + 4px left accent
- **Icons**: 20px Lucide React icons
- **Padding**: 16px
- **Shadow**: Subtle shadow-lg
- **Close button**: Always visible with smooth transitions

### Status Colors
- ✅ **Success**: Green left border + subtle green tinted background (5%/10%)
- ❌ **Error**: Red left border + subtle red tinted background (5%/10%)
- ⚠️ **Warning**: Orange left border + subtle orange tinted background (5%/10%)
- ℹ️ **Info**: Blue left border + subtle blue tinted background (5%/10%)

The subtle background tints provide better visual distinction while maintaining a professional, minimalist appearance. Light mode uses 5% opacity, dark mode uses 10% for better visibility.

## API Reference

### showToast.success()
```typescript
showToast.success({
  title: string              // Required
  description?: string       // Optional
  duration?: number         // Optional (default: 4000ms)
  action?: {               // Optional
    label: string
    onClick: () => void
  }
})
```

### showToast.error()
```typescript
showToast.error({
  title: string              // Required
  description?: string       // Optional
  duration?: number         // Optional (default: 6000ms)
  action?: {               // Optional
    label: string
    onClick: () => void
  }
})
```

### showToast.warning()
```typescript
showToast.warning({
  title: string
  description?: string
  duration?: number         // Default: 5000ms
  action?: { label: string, onClick: () => void }
})
```

### showToast.info()
```typescript
showToast.info({
  title: string
  description?: string
  duration?: number         // Default: 4000ms
  action?: { label: string, onClick: () => void }
})
```

### showToast.loading()
```typescript
const toastId = showToast.loading({
  title: string
  description?: string
})

// Dismiss when done
showToast.dismiss(toastId)
```

### showToast.dismiss()
```typescript
// Dismiss specific toast
showToast.dismiss(toastId)

// Dismiss all toasts
showToast.dismiss()
```

## Examples

### Form Submission
```typescript
const handleSubmit = async (data: FormData) => {
  try {
    await saveData(data)
    showToast.success({
      title: "Form submitted",
      description: "Your data has been saved"
    })
  } catch (error) {
    showToast.error({
      title: "Submission failed",
      description: error.message
    })
  }
}
```

### Async Operation with Loading
```typescript
const handleDeploy = async () => {
  const toastId = showToast.loading({
    title: "Deploying agent...",
    description: "This may take a few seconds"
  })
  
  try {
    await deployAgent()
    showToast.dismiss(toastId)
    showToast.success({
      title: "Deployment successful",
      description: "Agent is now active"
    })
  } catch (error) {
    showToast.dismiss(toastId)
    showToast.error({
      title: "Deployment failed",
      description: error.message,
      action: {
        label: "Retry",
        onClick: handleDeploy
      }
    })
  }
}
```

### Using toast.promise
```typescript
import { toast } from '@/lib/toast'

toast.promise(
  saveSettings(),
  {
    loading: 'Saving settings...',
    success: 'Settings saved!',
    error: 'Failed to save settings'
  }
)
```

## Customization

### Component Location
`/src/components/ui/sonner.tsx`

### Modify Icons
```typescript
icons={{
  success: <YourIcon className="size-5" />,
  // ...
}}
```

### Modify Styling
Edit the `classNames` in `toastOptions`:
```typescript
toastOptions={{
  classNames: {
    toast: "your-custom-classes",
    success: "your-success-classes",
    // ...
  }
}}
```

## Best Practices

### Do's ✅
- Use appropriate toast types for different messages
- Keep titles concise (< 50 characters)
- Use descriptions for additional details
- Provide action buttons for recoverable errors
- Use loading toasts for async operations

### Don'ts ❌
- Don't use for critical errors (use Dialog instead)
- Don't show too many toasts at once
- Don't auto-dismiss important actions
- Don't use overly long messages
- Don't rely solely on color for information

## Accessibility

- ✅ Proper ARIA attributes
- ✅ Keyboard accessible
- ✅ Screen reader friendly
- ✅ High contrast support
- ✅ Respects reduced motion preferences
- ✅ Close button clearly visible

## Files

- `/src/components/ui/sonner.tsx` - Toaster component
- `/src/lib/toast.tsx` - Toast utility functions
- `/src/components/toast-demo.tsx` - Demo component
- `/docs/TOAST.md` - This documentation

## Demo

Test all toast types:
```typescript
import { ToastDemo } from '@/components/toast-demo'

<ToastDemo />
```

## Support

For issues or questions:
1. Check this documentation
2. Review `/src/components/ui/sonner.tsx`
3. Check shadcn/ui Sonner docs: https://ui.shadcn.com/docs/components/sonner
