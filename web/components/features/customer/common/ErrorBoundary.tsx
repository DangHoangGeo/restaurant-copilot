"use client";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 my-8 text-center">
          <div className="rounded-full bg-red-100 p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            There was a problem loading this content. You can try refreshing the page or try again later.
          </p>
          <div className="flex space-x-4">
            <Button onClick={this.handleRetry} variant="outline" className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
          {this.state.error && (
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded text-left overflow-auto max-w-full">
              <p className="font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
