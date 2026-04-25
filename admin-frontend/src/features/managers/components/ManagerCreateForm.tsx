import { Button, Paper, Stack, TextField, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { ManagerCreatePayload } from '@/api/modules/managers.api'
import { managersUiText } from '@/features/managers/managers.ui-text'

type Props = {
  isSubmitting: boolean
  onSubmit: (payload: ManagerCreatePayload) => Promise<void>
}

type ManagerCreateFormState = {
  username: string
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
}

type ManagerCreateFormTouched = Record<keyof ManagerCreateFormState, boolean>

const INITIAL_STATE: ManagerCreateFormState = {
  username: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
}

function getTouchedState(): ManagerCreateFormTouched {
  return {
    username: false,
    firstName: false,
    lastName: false,
    password: false,
    confirmPassword: false,
  }
}

function validateManagerCreateForm(state: ManagerCreateFormState) {
  const username = state.username.trim()
  const firstName = state.firstName.trim()
  const lastName = state.lastName.trim()
  const password = state.password
  const confirmPassword = state.confirmPassword

  return {
    usernameError: username.length === 0 ? managersUiText.validation.usernameRequired : null,
    firstNameError: firstName.length === 0 ? managersUiText.validation.firstNameRequired : null,
    lastNameError: lastName.length === 0 ? managersUiText.validation.lastNameRequired : null,
    passwordError: password.length < 8 ? managersUiText.validation.passwordMinLength : null,
    confirmPasswordError:
      confirmPassword.length === 0
        ? managersUiText.validation.confirmPasswordRequired
        : confirmPassword !== password
          ? managersUiText.validation.confirmPasswordMismatch
          : null,
  }
}

export function ManagerCreateForm({ isSubmitting, onSubmit }: Props) {
  const [formState, setFormState] = useState<ManagerCreateFormState>(INITIAL_STATE)
  const [touched, setTouched] = useState<ManagerCreateFormTouched>(getTouchedState())

  const validation = useMemo(() => validateManagerCreateForm(formState), [formState])

  const canSubmit =
    !validation.usernameError &&
    !validation.firstNameError &&
    !validation.lastNameError &&
    !validation.passwordError &&
    !validation.confirmPasswordError &&
    !isSubmitting

  const markTouched = (field: keyof ManagerCreateFormTouched) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const resetForm = () => {
    setFormState(INITIAL_STATE)
    setTouched(getTouchedState())
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="managers-upsert-form-create">
      <Stack spacing={2.5} data-testid="managers-upsert-form-content">
        <Button
          component={Link}
          to="/managers"
          variant="text"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
          data-testid="managers-upsert-back-to-list-link"
        >
          {managersUiText.createPage.backToManagers}
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="managers-upsert-form-title">
          {managersUiText.createPage.title}
        </Typography>

        <Stack spacing={2} data-testid="managers-upsert-form-fields">
          <TextField
            label={managersUiText.createPage.fields.username}
            placeholder={managersUiText.createPage.placeholders.username}
            value={formState.username}
            onChange={(event) =>
              setFormState((current) => ({ ...current, username: event.target.value }))
            }
            onBlur={() => markTouched('username')}
            error={touched.username && Boolean(validation.usernameError)}
            helperText={touched.username ? (validation.usernameError ?? ' ') : ' '}
            data-testid="managers-upsert-username-input"
            inputProps={{ 'data-testid': 'managers-upsert-username-input-field' }}
          />

          <TextField
            label={managersUiText.createPage.fields.firstName}
            placeholder={managersUiText.createPage.placeholders.firstName}
            value={formState.firstName}
            onChange={(event) =>
              setFormState((current) => ({ ...current, firstName: event.target.value }))
            }
            onBlur={() => markTouched('firstName')}
            error={touched.firstName && Boolean(validation.firstNameError)}
            helperText={touched.firstName ? (validation.firstNameError ?? ' ') : ' '}
            data-testid="managers-upsert-first-name-input"
            inputProps={{ 'data-testid': 'managers-upsert-first-name-input-field' }}
          />

          <TextField
            label={managersUiText.createPage.fields.lastName}
            placeholder={managersUiText.createPage.placeholders.lastName}
            value={formState.lastName}
            onChange={(event) =>
              setFormState((current) => ({ ...current, lastName: event.target.value }))
            }
            onBlur={() => markTouched('lastName')}
            error={touched.lastName && Boolean(validation.lastNameError)}
            helperText={touched.lastName ? (validation.lastNameError ?? ' ') : ' '}
            data-testid="managers-upsert-last-name-input"
            inputProps={{ 'data-testid': 'managers-upsert-last-name-input-field' }}
          />

          <TextField
            type="password"
            label={managersUiText.createPage.fields.password}
            placeholder={managersUiText.createPage.placeholders.password}
            value={formState.password}
            onChange={(event) =>
              setFormState((current) => ({ ...current, password: event.target.value }))
            }
            onBlur={() => markTouched('password')}
            error={touched.password && Boolean(validation.passwordError)}
            helperText={touched.password ? (validation.passwordError ?? ' ') : ' '}
            data-testid="managers-upsert-password-input"
            inputProps={{ 'data-testid': 'managers-upsert-password-input-field' }}
          />

          <TextField
            type="password"
            label={managersUiText.createPage.fields.confirmPassword}
            placeholder={managersUiText.createPage.placeholders.confirmPassword}
            value={formState.confirmPassword}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            onBlur={() => markTouched('confirmPassword')}
            error={touched.confirmPassword && Boolean(validation.confirmPasswordError)}
            helperText={touched.confirmPassword ? (validation.confirmPasswordError ?? ' ') : ' '}
            data-testid="managers-upsert-confirm-password-input"
            inputProps={{ 'data-testid': 'managers-upsert-confirm-password-input-field' }}
          />
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          data-testid="managers-upsert-form-actions"
        >
          <Button
            variant="contained"
            onClick={() =>
              void onSubmit({
                username: formState.username.trim(),
                password: formState.password,
                firstName: formState.firstName.trim(),
                lastName: formState.lastName.trim(),
              })
            }
            disabled={!canSubmit}
            data-testid="managers-upsert-save-button"
          >
            {managersUiText.createPage.actions.save}
          </Button>
          <Button onClick={resetForm} data-testid="managers-upsert-clear-button">
            {managersUiText.createPage.actions.clear}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}


