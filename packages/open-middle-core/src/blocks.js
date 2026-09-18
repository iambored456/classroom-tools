export function baseTenBlocks(n) {
  if (n === null) return '<div class="blocks"></div>'
  const hundreds = Math.floor(n / 100)
  const tens = Math.floor(n % 100 / 10)
  const ones = n % 10
  const flat = '<span class="hundred-slat">' + '<i></i>'.repeat(100) + '</span>'
  const rod = '<span class="rod">' + '<i></i>'.repeat(10) + '</span>'
  return `<div class="blocks" role="img" aria-label="${hundreds ? hundreds + ' hundred flats, ' : ''}${tens} ten rods and ${ones} one cubes">${hundreds ? `<div class="hundreds">${flat.repeat(hundreds)}</div>` : ''}<div class="rods">${rod.repeat(tens)}</div><div class="ones">${'<span class="cube"></span>'.repeat(ones)}</div></div>`
}
