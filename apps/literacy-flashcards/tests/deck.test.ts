import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { cards } from '../src/cards.ts'
import { eyeWordsCrop } from '../src/artwork.ts'
import { cardSets, createNonsenseSet, sessionStorageKey, setFromHash } from '../src/sets.ts'
import { nonsenseGroups, normalizeNonsenseSelection } from '../src/nonsense-words.ts'
import { CARD_COUNT, chooseAnotherCard, createSession, nextCard, previousCard, restoreSession } from '../src/deck.ts'

test('every supplied PDF card has a word, a cue, and both original image sides', () => {
  assert.equal(cards.length, CARD_COUNT)
  for (const card of cards) {
    assert.ok(card.word && card.cue)
    for (const side of ['front', 'back']) {
      const crop = eyeWordsCrop(card.id, side as 'front' | 'back')
      assert.ok(crop.width > 0 && crop.height > 0)
      assert.ok(crop.x > 0 && crop.y > 0)
      assert.ok(crop.x + crop.width < crop.sourceWidth && crop.y + crop.height < crop.sourceHeight)
      const file = new URL(`../public/cards/${String(card.id).padStart(3, '0')}-${side}.webp`, import.meta.url)
      const bytes = readFileSync(file)
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
      assert.equal(bytes.readUInt32LE(4) + 8, bytes.length)
    }
  }
})

test('finishing every card has no repeats and stops at 100', () => {
  let session = createSession()
  const seen = new Set<number>()
  for (let index = 0; index < CARD_COUNT; index++) {
    assert.equal(session.position, index)
    seen.add(session.order[session.position])
    session = nextCard(session)
  }
  assert.equal(seen.size, CARD_COUNT)
  assert.equal(nextCard(session).position, CARD_COUNT)
})

test('choosing another keeps skipped cards available and completed cards out of the deck', () => {
  let session = createSession(CARD_COUNT, () => 0.5)
  const completed = session.order.slice(0, 20)
  session = { ...session, position: 20 }
  const skipped = session.order[20]
  const changed = chooseAnotherCard(session, () => 0)
  assert.notEqual(changed.order[20], skipped)
  assert.equal(changed.position, 20)
  assert.deepEqual(changed.order.slice(0, 20), completed)
  assert.ok(changed.order.slice(21).includes(skipped))
  assert.equal(new Set(changed.order).size, CARD_COUNT)
  assert.equal(session.order[20], skipped)
  assert.equal(chooseAnotherCard({ ...session, position: 99 }).position, 99)
})

test('saved progress round trips and rejects corrupt or incompatible storage', () => {
  const session = { ...createSession(), position: 37 }
  assert.deepEqual(restoreSession(JSON.stringify(session)), session)
  for (const bad of [null, 'bad json', '{}', JSON.stringify({ ...session, position: -1 }),
    JSON.stringify({ ...session, order: Array(100).fill(1) }),
    JSON.stringify({ ...session, position: 101 }), JSON.stringify({ ...session, version: 2 })]) {
    assert.equal(restoreSession(bad), null)
  }
})

test('going back restores the last completed card and puts the current card back in the deck', () => {
  const initial = createSession(CARD_COUNT, () => 0.5)
  const advanced = nextCard(nextCard(initial))
  const current = advanced.order[advanced.position]
  const returned = previousCard(advanced)
  assert.equal(returned.position, 1)
  assert.equal(returned.order[returned.position], initial.order[1])
  assert.ok(!returned.order.slice(0, returned.position).includes(initial.order[1]))
  assert.ok(returned.order.slice(returned.position + 1).includes(current))
  assert.equal(advanced.position, 2)
  assert.deepEqual(restoreSession(JSON.stringify(returned)), returned)
  assert.equal(previousCard(previousCard(returned)).position, 0)
  assert.equal(nextCard(returned).order[nextCard(returned).position], current)
})

test('going back from completion reopens the last card, including after a reshuffle', () => {
  const session = createSession(CARD_COUNT, () => 0.5)
  const shuffled = chooseAnotherCard({ ...session, position: 98 }, () => 0)
  const finished = nextCard(nextCard(shuffled))
  const returned = previousCard(finished)
  assert.equal(returned.position, 99)
  assert.equal(returned.order[99], shuffled.order[99])
  assert.equal(nextCard(returned).position, CARD_COUNT)
})

test('Heart Words contains all 94 original cards and their UFLI image files', () => {
  const set = cardSets.find(set => set.id === 'heart-words')!
  assert.equal(set.cards.length, 94)
  assert.equal(new Set(set.cards.map(card => card.word)).size, 94)
  assert.equal(set.cards[0].word, 'the')
  assert.equal(set.cards[93].word, 'rough')
  for (const [index, card] of set.cards.entries()) {
    assert.equal(card.id, index + 1)
    const bytes = readFileSync(new URL(`../public/cards/heart-words/${String(card.id).padStart(3, '0')}.webp`, import.meta.url))
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length)
  }
})

test('every Heart Words sentence uses its target word and stays within three to five words', () => {
  const set = setFromHash('#heart-words')!
  for (const card of set.cards) {
    assert.ok(card.sentence, `Missing sentence for ${card.word}`)
    const words = card.sentence.match(/[a-z]+(?:['’][a-z]+)*/gi) ?? []
    assert.ok(words.length >= 3 && words.length <= 5, `${card.word}: ${card.sentence}`)
    assert.ok(words.some(word => word.toLowerCase() === card.word.toLowerCase()), `Missing target word: ${card.word}`)
    assert.match(card.sentence, /^[A-Z].*[.!?]$/)
  }
})

test('Reading Universe contains 308 single-sided original syllable cards', () => {
  const set = setFromHash('#closed-syllables')!
  assert.equal(set.name, 'Reading Universe - Closed Syllables')
  assert.equal(set.flippable, false)
  assert.equal(set.frontKind, 'single')
  assert.equal(set.cards.length, 308)
  assert.equal(new Set(set.cards.map(card => card.word)).size, 308)
  assert.equal(set.cards[0].word, 'ab')
  assert.equal(set.cards[307].word, 'sweb')
  for (const [index, card] of set.cards.entries()) {
    assert.equal(card.id, index + 1)
    const bytes = readFileSync(new URL(`../public/cards/closed-syllables/${String(card.id).padStart(3, '0')}.webp`, import.meta.url))
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length)
  }
  assert.ok(cardSets.filter(set => set.frontKind === 'image' || set.frontKind === 'symbols').every(set => set.flippable))
  assert.equal(new Set(cardSets.map(set => sessionStorageKey(set.id))).size, cardSets.length)
})

test('each set completes without repeats and Back reopens its own last card', () => {
  for (const set of cardSets) {
    const count = set.cards.length
    let session = createSession(count, () => 0.5)
    const seen = new Set<number>()
    for (let index = 0; index < count; index++) {
      seen.add(session.order[session.position])
      session = nextCard(session)
    }
    assert.equal(seen.size, count)
    assert.equal(session.position, count)
    assert.equal(nextCard(session).position, count)
    assert.equal(previousCard(session).position, count - 1)
    assert.deepEqual(restoreSession(JSON.stringify(session), count), session)
    assert.equal(chooseAnotherCard(session), session)
  }
})

test('the supplied nonsense lists keep their words and skill descriptions', () => {
  assert.deepEqual(nonsenseGroups.map(group => [group.id, group.words.length, group.syllables, group.rBlends, group.sBlends, group.lBlends]), [
    ['A', 50, '1', false, false, false],
    ['B', 100, '1', false, false, false],
    ['C', 181, '1', true, true, false],
    ['D', 30, '2, 3', true, true, true],
  ])
  assert.deepEqual(nonsenseGroups.map(group => [group.words[0], group.words.at(-1)]), [
    ['som', 'yaf'], ['baf', 'twug'], ['banp', 'wusp'], ['balquim', 'zulmar'],
  ])
  for (const group of nonsenseGroups) {
    assert.equal(new Set(group.words).size, group.words.length)
    assert.ok(group.words.every(word => /^[a-z]+$/.test(word)))
  }
  // These supplied entries must not be removed by a real-word filter.
  assert.ok(nonsenseGroups[1].words.includes('shop'))
  assert.ok(nonsenseGroups[2].words.includes('crisp'))
  assert.deepEqual(normalizeNonsenseSelection(['D', 'A', 'D', 'invalid', null]), ['A', 'D'])
  assert.deepEqual(normalizeNonsenseSelection([]), [])
})

test('all 15 nonsense set combinations draw only selected words without repeats and save separately', () => {
  const keys = new Set<string>()
  for (let mask = 1; mask < 16; mask++) {
    const groups = nonsenseGroups.filter((_, index) => mask & (1 << index))
    const ids = groups.map(group => group.id)
    const set = createNonsenseSet(ids)
    const expected = new Set(groups.flatMap(group => group.words))
    assert.equal(set.flippable, false)
    assert.equal(set.frontKind, 'text')
    assert.deepEqual(new Set(set.cards.map(card => card.word)), expected)
    assert.equal(set.cards.length, expected.size)
    assert.deepEqual(set.cards.map(card => card.id), Array.from({ length: expected.size }, (_, index) => index + 1))
    const key = sessionStorageKey(set.id, ids)
    keys.add(key)
    assert.equal(sessionStorageKey(set.id, [...ids].reverse()), key)
    const session = createSession(set.cards.length, () => .5)
    const drawn = session.order.map(id => set.cards[id - 1].word)
    assert.equal(new Set(drawn).size, expected.size)
    const advanced = nextCard(session)
    assert.deepEqual(restoreSession(JSON.stringify(advanced), expected.size), advanced)
    assert.equal(previousCard(advanced).order[0], session.order[0])
  }
  assert.equal(keys.size, 15)
  const mixed = createNonsenseSet(['A', 'B'])
  assert.equal(mixed.cards.filter(card => card.word === 'hob').length, 1)
  assert.equal(createNonsenseSet([]).cards.length, 0)
  assert.equal(setFromHash('#nonsense-words')?.id, 'nonsense-words')
  assert.equal(sessionStorageKey('eyewords', ['D']), 'literacy-flashcards.eyewords.v1')
})

test('EyeWords progress stays compatible and Heart Words uses a separate key and deck size', () => {
  assert.equal(sessionStorageKey('eyewords'), 'literacy-flashcards.eyewords.v1')
  assert.notEqual(sessionStorageKey('eyewords'), sessionStorageKey('heart-words'))
  const eye = { ...createSession(100), position: 37 }
  const heart = { ...createSession(94), position: 12 }
  const saved = new Map([
    [sessionStorageKey('eyewords'), JSON.stringify(eye)],
    [sessionStorageKey('heart-words'), JSON.stringify(heart)],
  ])
  assert.deepEqual(restoreSession(saved.get(sessionStorageKey('eyewords'))!, 100), eye)
  assert.deepEqual(restoreSession(saved.get(sessionStorageKey('heart-words'))!, 94), heart)
  assert.equal(restoreSession(JSON.stringify(eye), 94), null)
  assert.equal(restoreSession(JSON.stringify(heart), 100), null)
  assert.equal(heart.position, 12)
  assert.equal(setFromHash('#eyewords')?.id, 'eyewords')
  assert.equal(setFromHash('#heart-words')?.id, 'heart-words')
  assert.equal(setFromHash('#missing-set'), null)
})
