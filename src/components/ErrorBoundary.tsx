import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container glass">
            <div className="error-icon-wrapper">
              <AlertTriangle className="error-icon" size={64} />
            </div>
            
            <h1 className="error-title">Oops! Something went wrong</h1>
            <p className="error-description">
              An unexpected error occurred. Don't worry, we've logged the error and you can try again.
            </p>

            {this.state.error && (
              <div className="error-details">
                <div className="error-message">
                  <strong>Error:</strong> {this.state.error.toString()}
                </div>
                {this.state.errorInfo && (
                  <details className="error-stack">
                    <summary>Stack Trace</summary>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </details>
                )}
              </div>
            )}

            <div className="error-actions">
              <button className="btn btn-primary" onClick={this.handleReset}>
                <Home size={18} />
                Try Again
              </button>
              <button className="btn btn-secondary" onClick={this.handleReload}>
                <RefreshCw size={18} />
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
