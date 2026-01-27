"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Context to manage expanded state and header content
const SheetContext = React.createContext<{
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  headerIcon?: React.ReactNode
  headerTitle?: React.ReactNode
  headerDescription?: React.ReactNode
}>({
  isExpanded: false,
  setIsExpanded: () => {},
})

interface SheetProps extends React.ComponentProps<typeof SheetPrimitive.Root> {
  headerIcon?: React.ReactNode
  headerTitle?: React.ReactNode
  headerDescription?: React.ReactNode
}

function Sheet({ headerIcon, headerTitle, headerDescription, ...props }: SheetProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  
  return (
    <SheetContext.Provider value={{ isExpanded, setIsExpanded, headerIcon, headerTitle, headerDescription }}>
      <SheetPrimitive.Root data-slot="sheet" {...props} />
    </SheetContext.Provider>
  )
}

function useSheet() {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error("useSheet must be used within a Sheet component")
  }
  return context
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  const { isExpanded, headerIcon, headerTitle, headerDescription } = useSheet()
  const hasHeaderContent = headerIcon || headerTitle || headerDescription
  
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-gray-50 dark:bg-gray-900 data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col shadow-lg transition-all ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l",
          side === "right" && !isExpanded && "w-3/4 sm:max-w-4xl",
          side === "right" && isExpanded && "w-full max-w-full",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        )}
        {...props}
      >
        {/* Auto-render header if content is provided via Sheet props */}
        {hasHeaderContent && <SheetHeader />}
        
        {children}
        
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  const { isExpanded, setIsExpanded, headerIcon, headerTitle, headerDescription } = useSheet()
  
  // If header content is provided via context, render it automatically
  const hasContextContent = headerIcon || headerTitle || headerDescription
  
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex items-start justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b sticky top-0 z-10", className)}
      {...props}
    >
      <div className="flex-1 flex items-start gap-3">
        {hasContextContent ? (
          <>
            {headerIcon && <div className="shrink-0 mt-0.5">{headerIcon}</div>}
            <div className="flex-1 flex flex-col gap-1.5">
              {headerTitle && (
                <SheetPrimitive.Title className="text-foreground font-semibold text-base">
                  {headerTitle}
                </SheetPrimitive.Title>
              )}
              {headerDescription && (
                <SheetPrimitive.Description className="text-muted-foreground text-sm">
                  {headerDescription}
                </SheetPrimitive.Description>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-1.5">
            {children}
          </div>
        )}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="shrink-0 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
      >
        {isExpanded ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" x2="21" y1="10" y2="3" />
            <line x1="3" x2="10" y1="21" y2="14" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" x2="14" y1="3" y2="10" />
            <line x1="3" x2="10" y1="21" y2="14" />
          </svg>
        )}
      </button>
    </div>
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 px-6 py-4 border-t", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
