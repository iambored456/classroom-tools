import rugbyPlayDocument from '../data/rugbyPlays.json'
import type { PlayFamily, RugbyPlayDocument } from '../types'

export const defaultRugbyPlayDocument = rugbyPlayDocument as RugbyPlayDocument
export const londonPlayFamily = defaultRugbyPlayDocument.playFamilies.find(
  (family): family is PlayFamily => family.id === 'london',
)!
