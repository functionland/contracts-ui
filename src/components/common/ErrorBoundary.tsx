

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-4">
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => window.location.reload()}
                >
                  REFRESH
                </Button>
              }
            >
              <div className="space-y-2">
                <h3 className="font-medium">
                  Something went wrong
                </h3>
                <div className="text-sm opacity-75">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </div>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <pre className="mt-2 text-xs overflow-auto max-h-[200px] p-2 bg-gray-100 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </Alert>

            <div className="text-center">
              <Button
                variant="outlined"
                color="primary"
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
