import { Paper, Typography } from '@mui/material'

type Props = {
  title: string
  description: string
  testIdPrefix?: string
}

export function PagePlaceholder({ title, description, testIdPrefix = 'page-placeholder' }: Props) {
  return (
    <Paper sx={{ p: 3 }} data-testid={`${testIdPrefix}-container`}>
      <Typography variant="h5" gutterBottom data-testid={`${testIdPrefix}-title`}>
        {title}
      </Typography>
      <Typography color="text.secondary" data-testid={`${testIdPrefix}-description`}>
        {description}
      </Typography>
    </Paper>
  )
}
