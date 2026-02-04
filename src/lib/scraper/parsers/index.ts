import { RetailerParser } from './types'
import { farmaciaTeiParser } from './farmacia-tei'
import { helpnetParser } from './helpnet'
import { catenaParser } from './catena'
import { remediumFarmParser } from './remedium-farm'
import { drmaxParser } from './drmax'
import { springFarmaParser } from './spring-farma'
import { biscuitPharmaParser } from './biscuit-pharma'
import { davFarmaParser } from './dav-farma'
import { ducfarmParser } from './ducfarm'
import { pfarmaParser } from './pfarma'
import { alshefaParser } from './alshefa'
import { genericParser } from './generic'

// Registru de parsere pentru fiecare retailer
// Cheia este domeniul (fără www)
const parserRegistry: Record<string, RetailerParser> = {
  'farmaciatei.ro': farmaciaTeiParser,
  'comenzi.farmaciatei.ro': farmaciaTeiParser,
  'helpnet.ro': helpnetParser,
  'catena.ro': catenaParser,
  'remediumfarm.ro': remediumFarmParser,
  'drmax.ro': drmaxParser,
  'springfarma.com': springFarmaParser,
  'biscuitpharma.ro': biscuitPharmaParser,
  'farmaciiledav.ro': davFarmaParser,
  'ducfarm.ro': ducfarmParser,
  'pfarma.ro': pfarmaParser,
  'al-shefafarm.ro': alshefaParser,
}

/**
 * Obține parser-ul potrivit pentru un URL
 * Dacă nu există unul specific, returnează parser-ul generic
 */
export function getParserForUrl(url: string): RetailerParser {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace(/^www\./, '')

    return parserRegistry[domain] || genericParser
  } catch {
    return genericParser
  }
}

/**
 * Înregistrează un parser nou
 */
export function registerParser(domain: string, parser: RetailerParser): void {
  parserRegistry[domain.replace(/^www\./, '')] = parser
}

/**
 * Lista tuturor parser-elor înregistrate
 */
export function getAllParsers(): Record<string, RetailerParser> {
  return { ...parserRegistry }
}

export {
  farmaciaTeiParser,
  helpnetParser,
  catenaParser,
  remediumFarmParser,
  drmaxParser,
  springFarmaParser,
  biscuitPharmaParser,
  davFarmaParser,
  ducfarmParser,
  pfarmaParser,
  alshefaParser,
  genericParser
}
export type { RetailerParser, ParseResult } from './types'
