/**
 * ErrorBoundary — catches unexpected React runtime errors.
 *
 * Why a class component?
 * React only exposes `componentDidCatch` and `getDerivedStateFromError`
 * as class lifecycle methods; there is no hooks equivalent (React 19).
 *
 * Placement: wrap the <AppRoutes> tree in App.jsx so that a crash inside
 * a page component does not blank the entire viewport.  The Navbar and
 * Sidebar intentionally live OUTSIDE the boundary so the user can still
 * navigate away from a broken page.
 *
 * Security note: never display raw error.stack to the user in production —
 * it can expose internal file paths and library versions.  We log to the
 * console in development only.
 */

import { Component } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    /**
     * Called during rendering when a descendant throws.
     * Updates state so the next render shows the fallback UI.
     */
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            // Only expose the short message — never the full stack trace
            errorMessage: error?.message || 'An unexpected error occurred.',
        };
    }

    /**
     * Called after the error has been caught.
     * Log in development; in production you would send to an error-tracking service.
     */
    componentDidCatch(error, info) {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary] Caught error:', error);
            console.error('[ErrorBoundary] Component stack:', info.componentStack);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="error-boundary-page">
                <div className="error-boundary-card animate-fade-in-up">
                    <div className="error-boundary-icon">
                        <AlertTriangle size={40} />
                    </div>
                    <h2>Something went wrong</h2>
                    <p className="text-muted mt-2">
                        An unexpected error occurred in this part of the app.
                    </p>
                    {import.meta.env.DEV && this.state.errorMessage && (
                        <pre className="error-boundary-detail">{this.state.errorMessage}</pre>
                    )}
                    <button className="btn btn-primary mt-4" onClick={this.handleReset}>
                        <RefreshCw size={16} /> Try Again
                    </button>
                </div>
            </div>
        );
    }
}
