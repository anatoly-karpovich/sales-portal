import { Component, type ErrorInfo } from 'react'
import { AppCrashFallbackPage } from '@/app/errors/AppCrashFallbackPage'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  errorMessage: string | null
}

function toErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: null,
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage: toErrorMessage(error),
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info)
  }

  private reset = () => {
    this.setState({
      hasError: false,
      errorMessage: null,
    })
  }

  private goHome = () => {
    window.location.hash = '/home'
    this.reset()
  }

  private reloadApp = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppCrashFallbackPage
          errorMessage={this.state.errorMessage}
          onRetry={this.reset}
          onGoHome={this.goHome}
          onReload={this.reloadApp}
        />
      )
    }

    return this.props.children
  }
}
