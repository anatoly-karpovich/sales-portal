import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import { Link } from 'react-router-dom'

const actionCards = [
  {
    title: 'Orders',
    description: 'Manage and process orders from customers and managers.',
    actionLabel: 'View Orders',
    to: '/orders',
    icon: <ChecklistOutlinedIcon sx={{ fontSize: 44 }} />,
  },
  {
    title: 'Products',
    description: 'Manage and update product listings, including editing and deleting.',
    actionLabel: 'View Products',
    to: '/products',
    icon: <Inventory2OutlinedIcon sx={{ fontSize: 44 }} />,
  },
  {
    title: 'Customers',
    description: 'View and manage customer information and interactions.',
    actionLabel: 'View Customers',
    to: '/customers',
    icon: <PeopleOutlineIcon sx={{ fontSize: 44 }} />,
  },
]

export function HomeActionCards() {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(3, minmax(0, 1fr))',
        },
      }}
      data-testid="home-action-cards"
    >
      {actionCards.map((card) => (
        <Paper
          key={card.title}
          sx={{ p: 3, textAlign: 'center', display: 'flex' }}
          data-testid={`home-action-card-${card.title.toLowerCase()}`}
        >
          <Stack
            spacing={1.25}
            alignItems="center"
            sx={{ flex: 1 }}
            data-testid={`home-action-card-${card.title.toLowerCase()}-content`}
          >
            {card.icon}
            <Typography
              variant="h6"
              sx={{ fontWeight: 700 }}
              data-testid={`home-action-card-${card.title.toLowerCase()}-title`}
            >
              {card.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minHeight: { xs: 'auto', md: 56 } }}
              data-testid={`home-action-card-${card.title.toLowerCase()}-description`}
            >
              {card.description}
            </Typography>
            <Box sx={{ mt: 'auto', pt: 1 }}>
              <Button
                component={Link}
                to={card.to}
                variant="contained"
                sx={{ textTransform: 'none' }}
                data-testid={`home-action-card-${card.title.toLowerCase()}-button`}
              >
                {card.actionLabel}
              </Button>
            </Box>
          </Stack>
        </Paper>
      ))}
    </Box>
  )
}
