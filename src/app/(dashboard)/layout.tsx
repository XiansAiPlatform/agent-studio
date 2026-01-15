import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      {/* Fixed Header */}
      <Header />

      {/* Main Container - Takes full remaining height */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <Suspense fallback={<div className="w-64 border-r bg-background" />}>
          <Sidebar />
        </Suspense>

        {/* Main Content - Continuous scroll */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
