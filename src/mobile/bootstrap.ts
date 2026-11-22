import { resolveLocale, setLocale } from '@shared/i18n'
import { installMobileBridge } from './mobileBridge'

/**
 * Side-effect module — it MUST be the first import of main.tsx. The shared
 * stores call window.aeronotes as soon as they are imported, and import order
 * is evaluation order: the bridge has to exist before any of them loads.
 */
installMobileBridge()
setLocale(resolveLocale('system', [navigator.language]))
