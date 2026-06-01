import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  IconButton,
  Menu,
  MenuList,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useThemeMode } from '@/theme/theme-mode-context'
import { useAuth } from '@/features/auth/useAuth'
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell'
import { navigationItems } from '@/app/config/navigation'

const INVENTORY_NAV_PATH = '/inventory'

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, toggleMode } = useThemeMode()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileAnchor, setMobileAnchor] = useState<HTMLElement | null>(null)
  const [mobileMenuView, setMobileMenuView] = useState<'root' | 'inventory'>('root')
  const [inventoryDesktopMenuOpen, setInventoryDesktopMenuOpen] = useState(false)
  const inventoryDesktopCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inventoryDesktopTriggerRef = useRef<HTMLDivElement | null>(null)
  const isInventoryDesktopTriggerHoveredRef = useRef(false)
  const isInventoryDesktopMenuHoveredRef = useRef(false)

  const mobileMenuOpen = Boolean(mobileAnchor)
  const toNavTestId = (path: string) => path.replace(/\//g, '-').replace(/^-+/, '') || 'home'
  const isNavItemSelected = (path: string) => location.pathname.startsWith(path)

  const inventoryNavigationItem = navigationItems.find(
    (item) => item.to === INVENTORY_NAV_PATH && item.children && item.children.length > 0,
  )
  const inventoryNavigationChildren = inventoryNavigationItem?.children ?? []

  useEffect(() => {
    return () => {
      if (inventoryDesktopCloseTimeoutRef.current) {
        clearTimeout(inventoryDesktopCloseTimeoutRef.current)
      }
    }
  }, [])

  const clearInventoryDesktopCloseTimeout = () => {
    if (inventoryDesktopCloseTimeoutRef.current) {
      clearTimeout(inventoryDesktopCloseTimeoutRef.current)
      inventoryDesktopCloseTimeoutRef.current = null
    }
  }

  const openInventoryDesktopMenu = () => {
    clearInventoryDesktopCloseTimeout()
    setInventoryDesktopMenuOpen(true)
  }

  const closeInventoryDesktopMenu = () => {
    clearInventoryDesktopCloseTimeout()
    setInventoryDesktopMenuOpen(false)
    isInventoryDesktopMenuHoveredRef.current = false
    isInventoryDesktopTriggerHoveredRef.current = false
  }

  const scheduleInventoryDesktopMenuClose = () => {
    clearInventoryDesktopCloseTimeout()
    inventoryDesktopCloseTimeoutRef.current = setTimeout(() => {
      if (
        !isInventoryDesktopTriggerHoveredRef.current &&
        !isInventoryDesktopMenuHoveredRef.current
      ) {
        setInventoryDesktopMenuOpen(false)
      }
      inventoryDesktopCloseTimeoutRef.current = null
    }, 200)
  }

  const handleInventoryDesktopTriggerMouseEnter = () => {
    isInventoryDesktopTriggerHoveredRef.current = true
    openInventoryDesktopMenu()
  }

  const handleInventoryDesktopTriggerMouseLeave = () => {
    isInventoryDesktopTriggerHoveredRef.current = false
    scheduleInventoryDesktopMenuClose()
  }

  const handleInventoryDesktopMenuMouseEnter = () => {
    isInventoryDesktopMenuHoveredRef.current = true
    clearInventoryDesktopCloseTimeout()
  }

  const handleInventoryDesktopMenuMouseLeave = () => {
    isInventoryDesktopMenuHoveredRef.current = false
    scheduleInventoryDesktopMenuClose()
  }

  const closeMobileMenu = () => {
    setMobileAnchor(null)
    setMobileMenuView('root')
  }

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
    <Box sx={{ minHeight: '100vh' }} data-testid="app-shell">
      <CssBaseline />
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        data-testid="app-shell-top-bar"
      >
        <Toolbar data-testid="app-shell-toolbar">
          <IconButton
            color="inherit"
            sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }}
            onClick={(event) => {
              setMobileAnchor(event.currentTarget)
              setMobileMenuView('root')
            }}
            data-testid="app-shell-mobile-menu-button"
          >
            <MenuIcon />
          </IconButton>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mr: { xs: 1, md: 3 } }}
            data-testid="app-shell-brand"
          >
            <Typography
              component={Link}
              to="/home"
              variant="h6"
              sx={{ textDecoration: 'none', color: 'text.primary' }}
              data-testid="app-shell-home-link"
            >
              Sales Portal
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flexGrow: 1, minWidth: 0, pr: 1, display: { xs: 'none', md: 'flex' } }}
            data-testid="app-shell-navigation"
          >
            {navigationItems.map((item) => {
              const selected = isNavItemSelected(item.to)

              if (!item.children?.length) {
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
                    data-testid={`app-shell-nav-${toNavTestId(item.to)}-link`}
                  >
                    {item.label}
                  </Button>
                )
              }

              const isInventoryItem = item.to === INVENTORY_NAV_PATH

              return (
                <Box
                  key={item.to}
                  ref={(element) => {
                    if (isInventoryItem) {
                      inventoryDesktopTriggerRef.current = element as HTMLDivElement | null
                    }
                  }}
                  onMouseEnter={handleInventoryDesktopTriggerMouseEnter}
                  onMouseLeave={handleInventoryDesktopTriggerMouseLeave}
                  data-testid={isInventoryItem ? 'app-shell-nav-inventory-trigger' : undefined}
                >
                  <Button
                    component={Link}
                    to={item.to}
                    color={selected ? 'primary' : 'inherit'}
                    endIcon={<ExpandMoreRoundedIcon fontSize="small" />}
                    sx={{
                      width: 128,
                      minWidth: 128,
                      textTransform: 'none',
                      fontSize: selected ? '1rem' : '0.95rem',
                      fontWeight: selected ? 700 : 500,
                    }}
                    data-testid={`app-shell-nav-${toNavTestId(item.to)}-link`}
                  >
                    {item.label}
                  </Button>
                </Box>
              )
            })}
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.5, md: 1.25 }}
            data-testid="app-shell-actions"
          >
            <NotificationsBell />
            <IconButton
              color="inherit"
              onClick={toggleMode}
              data-testid="app-shell-theme-toggle-button"
            >
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Button
              component={Link}
              to={user?._id ? `/managers/${user._id}` : '/managers'}
              color="inherit"
              disabled={!user?._id}
              sx={{
                px: 0.5,
                minWidth: 0,
                textTransform: 'none',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
              data-testid="app-shell-user-name"
            >
              <Typography variant="body2">{user?.firstName ?? 'Manager'}</Typography>
            </Button>
            <IconButton
              color="inherit"
              disabled={isLoggingOut}
              onClick={handleLogout}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
              data-testid="app-shell-logout-button"
            >
              {isLoggingOut ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <MeetingRoomOutlinedIcon />
              )}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Popper
        open={inventoryDesktopMenuOpen}
        anchorEl={inventoryDesktopTriggerRef.current}
        placement="bottom-start"
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
        modifiers={[
          {
            name: 'offset',
            options: { offset: [0, 6] },
          },
        ]}
      >
        <Paper
          onMouseEnter={handleInventoryDesktopMenuMouseEnter}
          onMouseLeave={handleInventoryDesktopMenuMouseLeave}
          variant="outlined"
        >
          <MenuList dense sx={{ py: 0.5 }}>
            {inventoryNavigationChildren.map((subItem) => (
              <MenuItem
                key={subItem.to}
                selected={isNavItemSelected(subItem.to)}
                onClick={() => {
                  closeInventoryDesktopMenu()
                  navigate(subItem.to)
                }}
                data-testid={`app-shell-nav-${subItem.testIdSuffix}-link`}
              >
                {subItem.label}
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>

      <Menu
        open={mobileMenuOpen}
        anchorEl={mobileAnchor}
        onClose={closeMobileMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        data-testid="app-shell-mobile-menu"
      >
        {mobileMenuView === 'root'
          ? navigationItems.map((item) => {
              const selected = isNavItemSelected(item.to)

              if (!item.children?.length) {
                return (
                  <MenuItem
                    key={item.to}
                    selected={selected}
                    onClick={() => {
                      closeMobileMenu()
                      navigate(item.to)
                    }}
                    data-testid={`app-shell-mobile-nav-${toNavTestId(item.to)}-link`}
                  >
                    {item.label}
                  </MenuItem>
                )
              }

              const isInventoryItem = item.to === INVENTORY_NAV_PATH

              return (
                <MenuItem
                  key={item.to}
                  selected={selected}
                  onClick={() => setMobileMenuView('inventory')}
                  sx={{ justifyContent: 'space-between', minWidth: 240 }}
                  data-testid={`app-shell-mobile-nav-${toNavTestId(item.to)}-link`}
                >
                  <Typography
                    data-testid={
                      isInventoryItem ? 'app-shell-mobile-nav-inventory-trigger' : undefined
                    }
                  >
                    {item.label}
                  </Typography>
                  <ChevronRightRoundedIcon fontSize="small" color="action" />
                </MenuItem>
              )
            })
          : null}

        {mobileMenuView === 'inventory' ? (
          <>
            <MenuItem
              onClick={() => setMobileMenuView('root')}
              data-testid="app-shell-mobile-nav-inventory-back-button"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <ChevronLeftRoundedIcon fontSize="small" />
                <Typography>Back</Typography>
              </Stack>
            </MenuItem>

            {inventoryNavigationChildren.map((subItem) => (
              <MenuItem
                key={subItem.to}
                selected={isNavItemSelected(subItem.to)}
                onClick={() => {
                  closeMobileMenu()
                  navigate(subItem.to)
                }}
                data-testid={`app-shell-mobile-nav-${subItem.testIdSuffix}-link`}
              >
                {subItem.label}
              </MenuItem>
            ))}
          </>
        ) : null}

        <MenuItem
          disabled={isLoggingOut}
          onClick={() => {
            closeMobileMenu()
            handleLogout()
          }}
          data-testid="app-shell-mobile-logout-button"
        >
          {isLoggingOut ? <CircularProgress size={16} /> : 'Logout'}
        </MenuItem>
      </Menu>

      <Box component="main" sx={{ p: { xs: 2, md: 3 } }} data-testid="app-shell-main">
        <Outlet />
      </Box>
    </Box>
  )
}
