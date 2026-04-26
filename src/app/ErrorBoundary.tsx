import { Component, type ReactNode } from 'react';
import { reportError } from '../lib/errors';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string | null | undefined }): void {
    reportError(error, { componentStack: info.componentStack ?? null });
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex h-full items-center justify-center bg-bg px-6"
        >
          <div className="card max-w-md p-6 text-center">
            <div className="mb-2 text-lg font-semibold">Something broke.</div>
            <p className="mb-4 text-sm text-fg-muted">
              A rendering error took down the UI. Your library is safe — reload to continue.
            </p>
            <pre className="mb-4 max-h-40 overflow-auto rounded-md bg-bg-sunken p-2 text-left text-xs text-fg-muted">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
