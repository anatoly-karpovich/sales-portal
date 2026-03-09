import { Paper, Typography } from '@mui/material'

type Props = {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: Props) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Paper>
  )
}
