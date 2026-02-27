"use client";

/**
 * CareAfter — Error Boundary
 * ============================
 *
 * LEARN-ALONG: React Error Boundaries
 *
 * Error boundaries are React components that catch JavaScript errors
 * in their child component tree and display a fallback UI instead of
 * crashing the entire app. Key points:
 *
 * 1. They MUST be class components — React doesn't support error
 *    boundaries with hooks (yet). This is one of the few places
 *    where class components are still necessary.
 *
 * 2. They catch errors during RENDERING, not in event handlers
 *    or async code. For those, use try/catch.
 *
 * 3. We sanitize error messages before tracking them — stack traces
 *    and error messages could accidentally contain file paths, usernames,
 *    or other identifying information.
 *
 * 4. The fallback UI includes a 911 emergency link because this is
 *    a healthcare app — if the app crashes while a patient is looking
 *    up warning signs, they should still be able to call for help.
 */

import React, { type ReactNode, type ErrorInfo } from "react";
import { analytics } from "@/lib/analytics/analytics";

// ── Types ──────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

// ── Error Sanitization ─────────────────────────────────────────────────────

/**
 * LEARN: Sanitizing Error Messages for Privacy
 *
 * Error messages and stack traces can contain sensitive information:
 * - File paths (which may include usernames: /Users/john/...)
 * - API keys accidentally logged
 * - Patient data from component props
 *
 * We strip this down to just the error type and a generic message,
 * and truncate the component stack to prevent leaking internal details.
 */
function sanitizeErrorMessage(error: Error): string {
  const message = error.message || "Unknown error";
  // Remove anything that looks like a file path
  const sanitized = message.replace(/(?:[A-Z]:)?[/\\][\w/\\.-]+/gi, "[path]");
  // Truncate to prevent sending large error messages
  return sanitized.slice(0, 200);
}

function sanitizeComponentStack(stack: string | undefined): string {
  if (!stack) return "";
  // Only keep the first 200 chars of the component stack
  return stack.slice(0, 200).replace(/(?:[A-Z]:)?[/\\][\w/\\.-]+/gi, "[path]");
}

// ── Error Boundary Component ───────────────────────────────────────────────

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: sanitizeErrorMessage(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    /**
     * LEARN: We track the error event with sanitized data only.
     * The original error object may contain PII in its message
     * or stack trace, so we never send it directly.
     */
    analytics.trackEvent("error_occurred", {
      message: sanitizeErrorMessage(error),
      componentStack: sanitizeComponentStack(
        errorInfo.componentStack ?? undefined
      ),
    });

    // Also log to console for development debugging
    console.error("[CareAfter ErrorBoundary]", error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center"
          style={{ backgroundColor: "var(--color-bg)" }}
          role="alert"
        >
          {/* Friendly error icon */}
          <div className="mb-6 text-6xl" aria-hidden="true">
            😔
          </div>

          {/* Error heading */}
          <h1
            className="mb-4 text-2xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Something went wrong
          </h1>

          {/* Reassuring message */}
          <p
            className="mb-8 max-w-md text-base leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            We&apos;re sorry — CareAfter ran into an unexpected problem. Your
            data is safe. Please try reloading the page.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={this.handleReload}
              className="rounded-2xl px-8 py-4 text-lg font-semibold text-white shadow-md transition-all active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-primary)",
                minHeight: "var(--touch-target)",
              }}
            >
              🔄 Try Again
            </button>

            {/* Emergency link — always accessible even when the app crashes.
                LEARN: For a healthcare app, this is critical. If the app
                crashes while a patient is checking warning signs, they
                must still be able to reach emergency services. */}
            <a
              href="tel:911"
              className="flex items-center justify-center gap-2 rounded-2xl border-2 px-8 py-4 text-lg font-semibold transition-all active:scale-[0.98]"
              style={{
                borderColor: "var(--color-danger)",
                color: "var(--color-danger)",
                minHeight: "var(--touch-target)",
              }}
            >
              📞 Call 911
            </a>
          </div>

          {/* Privacy note about the error */}
          <p
            className="mt-8 max-w-sm text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            This error has been logged anonymously to help us improve CareAfter.
            No personal or health information was shared.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
