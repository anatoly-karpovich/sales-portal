import { COUNTRIES } from '@/constants/dictionaries'

type CountryValue = (typeof COUNTRIES)[number]

export function getCountryOptions() {
  return [...COUNTRIES]
}

export function getDefaultCountry() {
  return COUNTRIES[0]
}

export function isCountryOption(value: string) {
  return COUNTRIES.includes(value as CountryValue)
}
