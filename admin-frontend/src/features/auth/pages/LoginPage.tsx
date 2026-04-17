import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/features/auth/useAuth'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { authUiText } from '@/features/auth/auth.ui-text'

export function LoginPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !isSubmitting

  const onSubmit = async () => {
    if (!canSubmit) {
      return
    }

    try {
      setIsSubmitting(true)
      await login(username, password)
      navigate('/home', { replace: true })
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { ErrorMessage?: string } | undefined)?.ErrorMessage ?? authUiText.login.failed
        : authUiText.login.failed
      enqueueSnackbar(message, { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }} data-testid="login-page">
      <Paper sx={{ width: '100%', maxWidth: 420, p: 3 }} data-testid="login-page-card">
        <Stack spacing={2} data-testid="login-page-form">
          <Typography variant="h5" data-testid="login-page-title">{authUiText.login.title}</Typography>
          <TextField
            label={authUiText.login.emailLabel}
            type="email"
            fullWidth
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            data-testid="login-page-email-input"
            inputProps={{ 'data-testid': 'login-page-email-input-field' }}
          />
          <TextField
            label={authUiText.login.passwordLabel}
            type="password"
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void onSubmit()
              }
            }}
            data-testid="login-page-password-input"
            inputProps={{ 'data-testid': 'login-page-password-input-field' }}
          />
          <Alert severity="info" data-testid="login-page-hint-alert">{authUiText.login.hint}</Alert>
          <Button variant="contained" onClick={() => void onSubmit()} disabled={!canSubmit} data-testid="login-page-submit-button">
            {isSubmitting ? <CircularProgress size={18} color="inherit" /> : authUiText.login.submitLabel}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
