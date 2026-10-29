export type NonsenseGroupId = 'A' | 'B' | 'C' | 'D'
export type NonsenseGroup = {
  id: NonsenseGroupId
  syllables: string
  rBlends: boolean
  sBlends: boolean
  lBlends: boolean
  words: string[]
}

// Word lists and skill descriptions supplied for these four practice sets.
export const nonsenseGroups: NonsenseGroup[] = [
  {
    id: 'A', syllables: '1', rBlends: false, sBlends: false, lBlends: false,
    words: `
      som lat neg fip jaz sut mab rin heg wol
      vap yot dak sib pog lem ruf tuj kob nim
      sep gan hul bej cav fic pon vos jal meg
      rid lun tep yem hob sal gut faj kim der
      wab sok nag vet pud ril jom bex cud yaf
    `.trim().split(/\s+/),
  },
  {
    id: 'B', syllables: '1', rBlends: false, sBlends: false, lBlends: false,
    words: `
      baf bem bid bog bup daf den dig dob dup
      fam fet fim fob fup gap ged git gom gut
      hab hem hin hob hup jap jeb jin jom jup
      kav ked kim kon kup maf mem mip mop mup
      bamp demp fimp gomp hump jamp kemp mimp namp vump
      benk fank jenk kank nenk vunk bant fent gint hont
      jant vunt vand nund zond zung vong bict voct vaft
      shab shem shim shop shut chad cheb chig chop chup
      thab theb thig thok thun whab wheb whid whop whut
      phab pheg phim phop phut twad twep twib twok twug
    `.trim().split(/\s+/),
  },
  {
    id: 'C', syllables: '1', rBlends: true, sBlends: true, lBlends: false,
    words: `
      banp belp bimp bonf brab brank brasp brast brenk brent
      brift brilk brimp brint brisp brond bront brosp bruck brump brusk brust
      celk cosp crank crant crasp crelf cremp crent crift crilt
      crind crisp crond crost crulk crulp crusp crust
      denf dilt donk drep drank drant drast drest drift drilk
      drimp drint drisp dromp dronk dront drump drusk
      fank fesp filt fonk frab framp frank frant fresp frest
      frift frild frimp frint frisp frond fromp frusk frust
      galt gemp gosk gralp grank grast grest grent grift grimp grint gromp gronk grusk
      hilt honf hulm
      kilk
      skab skemp skent skep skesp skig skimp skont skom skost skrab skrit skust
      slaf slem slib slom
      smab smank smast smemp smep smig smint smisk smont smop smosp smust
      snab snank snast snemp snek snift snim snisp snop snont snosp snust
      spab spank spant spemp spend speg spift spik spisk spog spont spost spusk
      staf stank stasp steb stemp stent stib stift stisp stog stont stosp stusk
      swab swank swast swemp swift swisk swisp swont swusp
      trank trant tresp trift trimp trisp tront trusk
      vusp
      wusp
    `.trim().split(/\s+/),
  },
  {
    id: 'D', syllables: '2, 3', rBlends: true, sBlends: true, lBlends: true,
    words: `
      balquim brundel chaglin clorpit crulpen doprix dorvik drentix flomtek frumdex
      ganvex glinter hapsel jirbot kimplat lugnak nexrad pelgop plefkon shorbid
      snavrox spradix sulpel tamlen trospen trubel vibgor wisket zemtal zulmar
    `.trim().split(/\s+/),
  },
]

export function normalizeNonsenseSelection(ids: readonly unknown[]): NonsenseGroupId[] {
  return nonsenseGroups.filter(group => ids.includes(group.id)).map(group => group.id)
}

export function nonsenseCards(ids: readonly NonsenseGroupId[]) {
  const selected = normalizeNonsenseSelection(ids)
  const words = new Set(nonsenseGroups.filter(group => selected.includes(group.id)).flatMap(group => group.words))
  return [...words].map((word, index) => ({ id: index + 1, word }))
}
