export type Banks = [string[], string[], string[], string[]]
export type Selection = [string, string, string, string]
export const labels = ['Initial', 'Middle', 'Final', '+ Ending'] as const
export const basicBanks: Banks = [
  'b c d f g h j k l m n p r s t v w y z'.split(' '),
  'a e i o u y'.split(' '),
  'b d g k m n p s t x'.split(' '),
  ['e'],
]
export const allBanks: Banks = [
  [...basicBanks[0], ...'ch sh th ph wh sc sk sl sm sn sp st sw br cr dr fr gr pr tr bl cl fl gl pl tw shr thr scr spl spr squ str gn kn wr qu'.split(' ')],
  [...basicBanks[1], ...'ar er ir or ur ai ea ee ie oa oi oo ou ow au aw ei eu ew ue ui aigh augh igh eigh ough oe ay ey oy'.split(' ')],
  [...basicBanks[2], ...'c f l r z ff ll ss zz v ct ft lt nt pt st xt ld lf lp mp sp sk nch nd ch ph sh th ck ng mb nk dge tch'.split(' ')],
  ['e', 's', 'es'],
]
export const emptySelection = (): Selection => ['', '', '', '']
export const copyBanks = (banks: Banks): Banks => banks.map(bank => [...bank]) as Banks
export const parseBank = (value: string): string[] => [...new Set(value.split(/[,\n]/).map(tile => tile.trim()).filter(Boolean))]
export const blend = (selection: Selection) => selection.join('')
export function toggleTile(selection: Selection, bank: number, tile: string): Selection {
  const nextTile = selection[bank] === tile ? '' : tile
  return selection.map((value, index) => index === bank ? nextTile : value) as Selection
}
export function isBanks(value: unknown): value is Banks {
  return Array.isArray(value) && value.length === 4 && value.every(bank => Array.isArray(bank) && bank.length <= 100 && bank.every(tile => typeof tile === 'string' && tile.length > 0 && tile.length <= 24))
}
export function isSelection(value: unknown, banks: Banks): value is Selection {
  return Array.isArray(value) && value.length === 4 && value.every((tile, i) => typeof tile === 'string' && (tile === '' || banks[i].includes(tile)))
}
