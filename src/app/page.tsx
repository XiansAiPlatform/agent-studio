import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Branding */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
              A
            </div>
            <span className="text-xl font-semibold">Agent Studio</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Build and Manage AI Agents
            </h1>
            <p className="text-xl text-muted-foreground">
              A powerful platform for creating, deploying, and managing intelligent AI agents. 
              Streamline your workflows with automation and intelligence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left">
            <div className="space-y-2 p-6 rounded-lg border bg-card">
              <h3 className="font-semibold text-lg">Intelligent Agents</h3>
              <p className="text-sm text-muted-foreground">
                Create and configure AI agents tailored to your specific needs
              </p>
            </div>
            <div className="space-y-2 p-6 rounded-lg border bg-card">
              <h3 className="font-semibold text-lg">Task Management</h3>
              <p className="text-sm text-muted-foreground">
                Track and manage tasks assigned to your agents in real-time
              </p>
            </div>
            <div className="space-y-2 p-6 rounded-lg border bg-card">
              <h3 className="font-semibold text-lg">Performance Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Monitor agent performance and optimize your workflows
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-6">
        <div className="text-center text-sm text-muted-foreground">
          © 2026 Agent Studio. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
