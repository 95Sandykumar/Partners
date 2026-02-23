'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#F5F5F7] text-[#1D1D1F]">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[#86868B]">
              A critical error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              className="mt-8 inline-flex items-center justify-center rounded-md bg-[#007AFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0066D6] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
