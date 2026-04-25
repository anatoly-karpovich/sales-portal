import { AppProviders } from '@/app/providers/AppProviders'
import { AppErrorBoundary } from '@/app/errors/AppErrorBoundary'
import { AppRouter } from '@/app/router/AppRouter'

export function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <AppRouter />
      </AppErrorBoundary>
    </AppProviders>
  )
}
