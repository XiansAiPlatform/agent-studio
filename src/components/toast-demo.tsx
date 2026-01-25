"use client"

import { Button } from "@/components/ui/button"
import { showToast } from "@/lib/toast"
import { Card } from "@/components/ui/card"

export function ToastDemo() {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Toast Notifications Demo</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Professional minimalist toast design using shadcn/ui's Sonner component
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Persistent Toast for Styling */}
        <Button
          variant="default"
          className="col-span-2 bg-primary"
          onClick={() =>
            showToast.success({
              title: "Persistent Toast for Styling",
              description: "This toast stays visible for styling adjustments. Close it manually when done.",
              duration: Infinity,
            })
          }
        >
          🎨 Show Persistent Toast (For Styling)
        </Button>

        {/* Success Toast */}
        <Button
          variant="outline"
          className="border-l-4 border-l-[oklch(0.70_0.09_135)]"
          onClick={() =>
            showToast.success({
              title: "Agent deployed successfully",
              description: "Your changes are now live and available to users",
            })
          }
        >
          ✅ Show Success
        </Button>

        {/* Error Toast */}
        <Button
          variant="outline"
          className="border-l-4 border-l-destructive"
          onClick={() =>
            showToast.error({
              title: "Failed to delete agent",
              description: "Agent has active deployments. Please deactivate them first.",
            })
          }
        >
          ❌ Show Error
        </Button>

        {/* Warning Toast */}
        <Button
          variant="outline"
          className="border-l-4 border-l-[oklch(0.83_0.10_85)]"
          onClick={() =>
            showToast.warning({
              title: "Session expiring soon",
              description: "You will be logged out in 5 minutes due to inactivity",
            })
          }
        >
          ⚠️ Show Warning
        </Button>

        {/* Info Toast */}
        <Button
          variant="outline"
          className="border-l-4 border-l-[oklch(0.73_0.06_210)]"
          onClick={() =>
            showToast.info({
              title: "New feature available",
              description: "Check out the updated agent templates with AI suggestions",
            })
          }
        >
          ℹ️ Show Info
        </Button>

        {/* Error with Action */}
        <Button
          variant="outline"
          className="border-l-4 border-l-destructive"
          onClick={() =>
            showToast.error({
              title: "Connection failed",
              description: "Unable to reach the server. Please check your connection.",
              action: {
                label: "Retry",
                onClick: () => {
                  console.log("Retrying...")
                  showToast.info({
                    title: "Retrying connection...",
                  })
                },
              },
            })
          }
        >
          ❌ Error + Action
        </Button>

        {/* Success with Action */}
        <Button
          variant="outline"
          className="border-l-4 border-l-[oklch(0.70_0.09_135)]"
          onClick={() =>
            showToast.success({
              title: "Template saved",
              description: "Your agent template has been saved successfully",
              action: {
                label: "View",
                onClick: () => {
                  console.log("Viewing template...")
                },
              },
            })
          }
        >
          ✅ Success + Action
        </Button>

        {/* Loading Toast */}
        <Button
          variant="outline"
          onClick={() => {
            const toastId = showToast.loading({
              title: "Deploying agent...",
              description: "This may take a few seconds",
            })
            
            // Simulate async operation
            setTimeout(() => {
              showToast.dismiss(toastId)
              showToast.success({
                title: "Deployment complete!",
                description: "Agent is now active",
              })
            }, 3000)
          }}
        >
          🔄 Loading Toast
        </Button>

        {/* Long Text */}
        <Button
          variant="outline"
          className="border-l-4 border-l-destructive"
          onClick={() =>
            showToast.error({
              title: "Cannot delete agent 'Customer Support Agent'",
              description:
                "This agent has 3 active deployments across different tenants. You must deactivate all deployments before deleting the agent. Status code: 409 (conflict)",
              duration: 10000,
            })
          }
        >
          📝 Long Message
        </Button>
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-2">Features</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✅ Official shadcn/ui Sonner component</li>
          <li>✅ Custom 20px icons from Lucide React</li>
          <li>✅ Working close button in every toast</li>
          <li>✅ Clean 4px left border accent for status</li>
          <li>✅ Supports action buttons</li>
          <li>✅ Professional minimalist design</li>
          <li>✅ Theme-aware (works in light/dark mode)</li>
          <li>✅ Fully integrated with your component library</li>
        </ul>
      </div>
    </Card>
  )
}
