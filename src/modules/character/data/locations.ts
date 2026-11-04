// Re-export dynamic location service to prevent hardcoding
export {
  fetchAllCountries,
  fetchCitiesForCountry,
  type CountryItem,
} from '../services/locationService'
