import { AppBar, Box, Button, CircularProgress, CssBaseline, IconButton, Menu, MenuItem, Stack, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useThemeMode } from '@/theme/theme-mode-context'
import { useAuth } from '@/features/auth/useAuth'
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell'

const menuItems = [
  { to: '/home', label: 'Home' },
  { to: '/orders', label: 'Orders' },
  { to: '/products', label: 'Products' },
  { to: '/customers', label: 'Customers' },
  { to: '/managers', label: 'Managers' },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, toggleMode } = useThemeMode()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileAnchor, setMobileAnchor] = useState<HTMLElement | null>(null)
  const mobileMenuOpen = Boolean(mobileAnchor)

  const handleLogout = () => {
    void (async () => {
      try {
        setIsLoggingOut(true)
        await logout()
        navigate('/login', { replace: true })
      } finally {
        setIsLoggingOut(false)
      }
    })()
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <IconButton color="inherit" sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }} onClick={(event) => setMobileAnchor(event.currentTarget)}>
            <MenuIcon />
          </IconButton>

          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mr: { xs: 1, md: 3 } }}>
            <Typography component={Link} to="/home" variant="h6" sx={{ textDecoration: 'none', color: 'text.primary' }}>
              Sales Portal
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, minWidth: 0, pr: 1, display: { xs: 'none', md: 'flex' } }}>
            {menuItems.map((item) => {
              const selected = location.pathname.startsWith(item.to)
              return (
                <Button
                  key={item.to}
                  component={Link}
                  to={item.to}
                  color={selected ? 'primary' : 'inherit'}
                  sx={{
                    width: 108,
                    minWidth: 108,
                    textTransform: 'none',
                    fontSize: selected ? '1rem' : '0.95rem',
                    fontWeight: selected ? 700 : 500,
                  }}
                >
                  {item.label}
                </Button>
              )
            })}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, md: 1.25 }}>
            <NotificationsBell />
            <IconButton color="inherit" onClick={toggleMode}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Typography sx={{ px: 0.5, display: { xs: 'none', sm: 'block' } }} variant="body2">
              {user?.firstName ?? 'User'}
            </Typography>
            <IconButton color="inherit" disabled={isLoggingOut} onClick={handleLogout} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {isLoggingOut ? <CircularProgress size={18} color="inherit" /> : <MeetingRoomOutlinedIcon />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Menu
        open={mobileMenuOpen}
        anchorEl={mobileAnchor}
        onClose={() => setMobileAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {menuItems.map((item) => {
          const selected = location.pathname.startsWith(item.to)
          return (
            <MenuItem
              key={item.to}
              selected={selected}
              onClick={() => {
                setMobileAnchor(null)
                navigate(item.to)
              }}
            >
              {item.label}
            </MenuItem>
          )
        })}
        <MenuItem
          disabled={isLoggingOut}
          onClick={() => {
            setMobileAnchor(null)
            handleLogout()
          }}
        >
          {isLoggingOut ? <CircularProgress size={16} /> : 'Logout'}
        </MenuItem>
      </Menu>

      <Box component="main" sx={{ p: { xs: 2, md: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  )
}
