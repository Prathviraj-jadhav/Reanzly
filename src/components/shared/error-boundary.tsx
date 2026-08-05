"use client";

import { Component, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Optional label for the boundary - shown in the fallback so the user
   *  knows which section crashed (e.g. "Trips module", "Dashboard widgets"). */
  label?: string;
  /** Custom fallback render. Defaults to the monochrome inline fallback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary
 * ------------
 * Catch-and-render error boundary for client-side crashes. Prevents a single
 * broken module/widget from tearing down the entire shell - the user sees a
 * monochrome inline fallback with a "Retry" CTA instead of a white screen.
 *
 * Wrap each module route + each dashboard widget individually so a crash in
 * one is isolated. The fallback is deliberately minimal (Swiss/Scandinavian
 * monochrome, hairline border, no hue, 6px radius) so it composes cleanly
 * with the surrounding UI.
 *
 * Usage:
 *   <ErrorBoundary label="Trips">
 *     <TripsModule />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", this.props.label ?? "unknown", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return <DefaultFallback error={error} label={this.props.label} reset={this.reset} />;
  }
}

function DefaultFallback({
  error,
  label,
  reset,
}: {
  error: Error;
  label?: string;
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-[6px] border border-border bg-card p-4 sm:p-5",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-foreground"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-foreground">
            {label ? `${label} failed to load` : "Something went wrong"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            The error has been reported. Try again, or reload the page if it persists.
          </span>
        </div>
      </div>
      {process.env.NODE_ENV === "development" && (
        <pre className="max-h-32 w-full overflow-auto rounded-[5px] border border-border bg-background p-2 text-[10.5px] leading-snug text-muted-foreground scrollbar-thin">
          {error.message}
          {error.stack ? `\n\n${error.stack.split("\n").slice(1, 4).join("\n")}` : ""}
        </pre>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="tap flex h-8 items-center gap-1.5 rounded-[5px] bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          className="tap flex h-8 items-center rounded-[5px] border border-border px-3 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
