import type { PairingRule } from './classes.ts'

type Grouping =
  | { groups: string[][] }
  | { reason: 'contradictory' | 'impossible' | 'limit' }

export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function makeGroups(present: readonly string[], requestedCount: number, rules: readonly PairingRule[]): Grouping {
  if (present.length === 0) return { groups: [] }

  const count = Math.min(requestedCount, present.length)
  const smallSize = Math.floor(present.length / count)
  const largerGroups = present.length % count
  const capacities = Array.from({ length: count }, (_, i) => smallSize + Number(i < largerGroups))

  // Build connected components from the active must-work-together rules.
  const parents = new Map(present.map(id => [id, id]))
  function root(id: string): string {
    let leader = id
    while (parents.get(leader) !== leader) leader = parents.get(leader)!
    parents.set(id, leader)
    return leader
  }

  const active = rules.filter(({ students }) => students.every(id => parents.has(id)))
  for (const { kind, students: [a, b] } of active) {
    if (kind === 'together') parents.set(root(a), root(b))
  }

  const components = new Map<string, { id: string; members: string[]; apart: Set<string> }>()
  for (const student of shuffled(present)) {
    const id = root(student)
    if (!components.has(id)) components.set(id, { id, members: [], apart: new Set() })
    components.get(id)!.members.push(student)
  }

  for (const { kind, students: [a, b] } of active) {
    if (kind !== 'apart') continue
    const first = root(a)
    const second = root(b)
    if (first === second) return { reason: 'contradictory' }
    components.get(first)!.apart.add(second)
    components.get(second)!.apart.add(first)
  }

  const free: string[] = []
  const constrained = [...components.values()].filter(component => {
    if (component.members.length > 1 || component.apart.size > 0) return true
    free.push(component.members[0])
    return false
  })
  constrained.sort((a, b) => b.members.length - a.members.length || b.apart.size - a.apart.size)

  const buckets = capacities.map(capacity => ({ capacity, members: [] as string[], placed: new Set<string>() }))
  let attemptsRemaining = 100_000

  function place(index: number): boolean {
    if (index === constrained.length) return true
    const { id, members, apart } = constrained[index]
    const emptyCapacities = new Set<number>()
    for (const bucket of shuffled(buckets)) {
      if (attemptsRemaining <= 0) return false
      attemptsRemaining -= 1
      if (bucket.members.length + members.length > bucket.capacity) continue
      if ([...bucket.placed].some(other => apart.has(other))) continue

      // Empty buckets of the same size are interchangeable during search.
      if (bucket.members.length === 0) {
        if (emptyCapacities.has(bucket.capacity)) continue
        emptyCapacities.add(bucket.capacity)
      }

      bucket.members.push(...members)
      bucket.placed.add(id)
      if (place(index + 1)) return true
      bucket.members.length -= members.length
      bucket.placed.delete(id)
    }
    return false
  }

  if (!place(0)) return { reason: attemptsRemaining <= 0 ? 'limit' : 'impossible' }

  // Unconstrained students can fill every remaining slot in any order.
  for (const bucket of buckets) {
    while (bucket.members.length < bucket.capacity) bucket.members.push(free.pop()!)
  }
  return { groups: shuffled(buckets.map(bucket => shuffled(bucket.members))) }
}
