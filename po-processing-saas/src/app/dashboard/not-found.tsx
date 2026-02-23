import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard page doesn&apos;t exist.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
