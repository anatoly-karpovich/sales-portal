import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/features/auth/useAuth'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'

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
        ? (error.response?.data as { ErrorMessage?: string } | undefined)?.ErrorMessage ?? 'Login failed'
        : 'Login failed'
      enqueueSnackbar(message, { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 420, p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Sign in</Typography>
          <TextField label="Email" type="email" fullWidth value={username} onChange={(event) => setUsername(event.target.value)} />
          <TextField
            label="Password"
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
          />
          <Alert severity="info">Iteration 1 auth is active. Enter valid backend credentials.</Alert>
          <Button variant="contained" onClick={() => void onSubmit()} disabled={!canSubmit}>
            {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Login'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
