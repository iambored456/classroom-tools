import type { PlayFamily, PlayVariation, RugbyPlayDocument } from '../types'

export function buildVariationExport(variation: PlayVariation): string {
  return JSON.stringify(variation, null, 2)
}

export function buildFamilyExport(family: PlayFamily): string {
  return JSON.stringify(family, null, 2)
}

export function buildDocumentExport(document: RugbyPlayDocument): string {
  return JSON.stringify(document, null, 2)
}
