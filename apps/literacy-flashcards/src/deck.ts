export const CARD_COUNT = 100
export type DeckSession = { version: 1; order: number[]; position: number }

export function createSession(cardCount = CARD_COUNT, random = Math.random): DeckSession {
  const order = Array.from({ length: cardCount }, (_, index) => index + 1)
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[order[index], order[other]] = [order[other], order[index]]
  }
  return { version: 1, order, position: 0 }
}

export function restoreSession(value: string | null, cardCount = CARD_COUNT): DeckSession | null {
  try {
    const candidate = JSON.parse(value ?? 'null')
    if (candidate?.version !== 1 || !Array.isArray(candidate.order) ||
      candidate.order.length !== cardCount || new Set(candidate.order).size !== cardCount ||
      !candidate.order.every((id: unknown) => Number.isInteger(id) && Number(id) >= 1 && Number(id) <= cardCount) ||
      !Number.isInteger(candidate.position) || candidate.position < 0 || candidate.position > cardCount) return null
    return { version: 1, order: [...candidate.order], position: candidate.position }
  } catch {
    return null
  }
}

export function nextCard(session: DeckSession): DeckSession {
  return { ...session, position: Math.min(session.order.length, session.position + 1) }
}

export function previousCard(session: DeckSession): DeckSession {
  return { ...session, position: Math.max(0, session.position - 1) }
}

export function chooseAnotherCard(session: DeckSession, random = Math.random): DeckSession {
  const count = session.order.length
  if (session.position >= count - 1) return session
  const order = [...session.order]
  const other = session.position + 1 + Math.floor(random() * (count - session.position - 1))
  ;[order[session.position], order[other]] = [order[other], order[session.position]]
  return { ...session, order }
}
