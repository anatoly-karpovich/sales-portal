import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { type FormEvent, useMemo, useState } from 'react'
import { usersUiText } from '@/features/users/users.ui-text'

type Props = {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: { oldPassword: string; newPassword: string }) => Promise<void>
}

type ChangePasswordFormState = {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

type ChangePasswordTouchedState = Record<keyof ChangePasswordFormState, boolean>

const INITIAL_STATE: ChangePasswordFormState = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function getTouchedState(): ChangePasswordTouchedState {
  return {
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  }
}

function validateChangePassword(state: ChangePasswordFormState) {
  return {
    oldPasswordError:
      state.oldPassword.length < 8 ? usersUiText.validation.currentPasswordMinLength : null,
    newPasswordError:
      state.newPassword.length < 8 ? usersUiText.validation.newPasswordMinLength : null,
    confirmPasswordError:
      state.confirmPassword.length === 0
        ? usersUiText.validation.confirmPasswordRequired
        : state.confirmPassword !== state.newPassword
          ? usersUiText.validation.confirmPasswordMismatch
          : null,
  }
}

export function ChangePasswordDialog({ open, isSubmitting, onClose, onSubmit }: Props) {
  const [formState, setFormState] = useState<ChangePasswordFormState>(INITIAL_STATE)
  const [touched, setTouched] = useState<ChangePasswordTouchedState>(getTouchedState())

  const validation = useMemo(() => validateChangePassword(formState), [formState])

  const canSubmit =
    !validation.oldPasswordError &&
    !validation.newPasswordError &&
    !validation.confirmPasswordError &&
    !isSubmitting

  const markTouched = (field: keyof ChangePasswordTouchedState) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    void onSubmit({
      oldPassword: formState.oldPassword,
      newPassword: formState.newPassword,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      data-testid="change-password-dialog"
      TransitionProps={{
        onEnter: () => {
          setFormState(INITIAL_STATE)
          setTouched(getTouchedState())
        },
      }}
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle data-testid="change-password-dialog-title">
        {usersUiText.dialogs.changePasswordTitle}
      </DialogTitle>
      <DialogContent dividers data-testid="change-password-dialog-content">
        <Stack spacing={2} sx={{ pt: 0.5 }} data-testid="change-password-dialog-fields">
          <TextField
            type="password"
            label="Current Password"
            placeholder="Enter current password"
            autoComplete="current-password"
            value={formState.oldPassword}
            onChange={(event) =>
              setFormState((current) => ({ ...current, oldPassword: event.target.value }))
            }
            onBlur={() => markTouched('oldPassword')}
            error={touched.oldPassword && Boolean(validation.oldPasswordError)}
            helperText={touched.oldPassword ? (validation.oldPasswordError ?? ' ') : ' '}
            data-testid="change-password-dialog-current-password-input"
            inputProps={{ 'data-testid': 'change-password-dialog-current-password-input-field' }}
          />
          <TextField
            type="password"
            label="New Password"
            placeholder="Enter new password"
            autoComplete="new-password"
            value={formState.newPassword}
            onChange={(event) =>
              setFormState((current) => ({ ...current, newPassword: event.target.value }))
            }
            onBlur={() => markTouched('newPassword')}
            error={touched.newPassword && Boolean(validation.newPasswordError)}
            helperText={touched.newPassword ? (validation.newPasswordError ?? ' ') : ' '}
            data-testid="change-password-dialog-new-password-input"
            inputProps={{ 'data-testid': 'change-password-dialog-new-password-input-field' }}
          />
          <TextField
            type="password"
            label="Confirm New Password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={formState.confirmPassword}
            onChange={(event) =>
              setFormState((current) => ({ ...current, confirmPassword: event.target.value }))
            }
            onBlur={() => markTouched('confirmPassword')}
            error={touched.confirmPassword && Boolean(validation.confirmPasswordError)}
            helperText={touched.confirmPassword ? (validation.confirmPasswordError ?? ' ') : ' '}
            data-testid="change-password-dialog-confirm-password-input"
            inputProps={{ 'data-testid': 'change-password-dialog-confirm-password-input-field' }}
          />
        </Stack>
      </DialogContent>
      <DialogActions data-testid="change-password-dialog-actions">
        <Button
          type="submit"
          variant="contained"
          disabled={!canSubmit}
          data-testid="change-password-dialog-submit-button"
        >
          {usersUiText.dialogs.changePasswordConfirm}
        </Button>
        <Button onClick={onClose} disabled={isSubmitting} data-testid="change-password-dialog-cancel-button">
          {usersUiText.dialogs.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
