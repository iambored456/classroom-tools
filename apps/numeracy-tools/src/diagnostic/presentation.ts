import type { Item } from './types'

export const resultLabels = {
  demonstrated: 'Demonstrated',
  mixed: 'Needs another check',
  practise: 'Practise next',
  unassessed: 'Not assessed yet',
}

export const outcomeLabels = {
  correct: 'Correct',
  incorrect: 'Incorrect',
  skipped: 'Skipped',
}

export const supportLabels = {
  none: 'Work without a calculator or multiplication chart.',
  calculator: 'You may use a calculator.',
  chart: 'You may use a multiplication chart.',
  'calculator-and-chart': 'You may use a calculator and a multiplication chart.',
}

export function responseFields(answer: Item['answer']) {
  if (answer.kind === 'choice') return []
  if (answer.kind === 'roots') {
    return [{ label: answer.label ?? 'All distinct roots', hint: answer.label ? 'Separate values with commas.' : 'Separate roots with commas. Enter a repeated root once.' }]
  }
  const fields: { label: string; math?: string; hint?: string }[] = answer.fields.map(field => ({
    label: field.label,
    math: field.math,
    hint: field.format === 'rounded'
      ? `Round to ${field.digits} decimal places.${field.unit ? ` Include ${field.unit}.` : ''}`
      : field.unit ? `Include ${field.unit}.` : undefined,
  }))
  if (answer.roots) fields.push({
    label: answer.roots.label ?? 'All distinct roots',
    hint: answer.roots.label ? 'Separate values with commas.' : 'Separate roots with commas. Enter a repeated root once.',
  })
  return fields
}

export function describeAnswer(item: Item, values: string[]): string {
  if (item.answer.kind === 'choice') {
    const option = item.answer.options.find(option => option.id === values[0])
    return option ? [option.text, option.math].filter(Boolean).join(' ') : values[0] ?? ''
  }
  return responseFields(item.answer).map((field, i) => `${field.label} = ${values[i] ?? ''}`).join(' · ')
}

export function acceptedAnswer(item: Item): string[] {
  if (item.answer.kind === 'choice') return [item.answer.correct]
  if (item.answer.kind === 'roots') return [item.answer.expected.join(', ')]
  const answers = item.answer.fields.map(field => field.unit ? `${field.expected} ${field.unit}` : field.expected)
  if (item.answer.roots) answers.push(item.answer.roots.expected.join(', '))
  return answers
}
