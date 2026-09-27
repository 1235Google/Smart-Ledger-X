import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onFallback?: (reason?: string) => void;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class FaceAuthErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Face authentication encountered an unexpected error',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FaceAuthErrorBoundary] Caught error:', error, errorInfo);
    if (this.props.onFallback) {
      this.props.onFallback(error.message || 'Face scanner error, switching to PIN');
    }
  }

  private handleFallbackClick = () => {
    if (this.props.onFallback) {
      this.props.onFallback('User opted for PIN following scanner recovery');
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-[#1e2027] border border-red-500/20 rounded-3xl text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <AlertTriangle size={24} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Biometric Scanner Notice</h3>
            <p className="text-xs text-slate-400 mt-1">
              Face authentication is temporarily unavailable. Please enter your PIN to continue.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={this.handleFallbackClick}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound size={14} />
              <span>Use PIN Instead</span>
            </button>
            <button
              type="button"
              onClick={this.handleRetry}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Retry scanner"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FaceAuthErrorBoundary;
