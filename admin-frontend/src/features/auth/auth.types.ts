export type AppUser = {
  _id: string
  username: string
  firstName: string
  lastName: string
  roles: string[]
  createdOn: string
}

export type AuthState = 'initializing' | 'authenticated' | 'unauthenticated'
