import { SnackbarProvider } from 'notistack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeModeProvider } from '@/theme/ThemeModeProvider'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ApiEventsProvider } from '@/app/providers/ApiEventsProvider'
import { NotificationsProvider } from '@/features/notifications/NotificationsProvider'

type Props = {
  children: React.ReactNode
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  })
}

const queryClient = createQueryClient()

export function AppProviders({ children }: Props) {
  return (
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider maxSnack={3} autoHideDuration={4000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <ApiEventsProvider>
            <AuthProvider>
              <NotificationsProvider>{children}</NotificationsProvider>
            </AuthProvider>
          </ApiEventsProvider>
        </SnackbarProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  )
}
