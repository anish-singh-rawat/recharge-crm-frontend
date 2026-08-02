import { Component } from 'react'
import { AlertCircle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center">
            <AlertCircle size={22} className="text-[#DC2626]" />
          </div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Something went wrong</h3>
          <p className="text-xs text-[#94A3B8] max-w-sm text-center">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-[#2563EB] hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
