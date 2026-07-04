import type { AeronotesApi } from './index'

declare global {
  interface Window {
    aeronotes: AeronotesApi
  }
}
