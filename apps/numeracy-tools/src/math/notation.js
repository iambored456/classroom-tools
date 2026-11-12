// All math is authored here in TeX; generate-math.mjs produces local SVG assets.
export const fragments = {
  y: 'y', equals: '=', five: '5', fourXPlus: '4x\\; +', expression: '-2x + 7',
  leftBracket: '(', rightBracket: ')',
  solution: '(x,y) = (-1,9)',
  firstEquation: 'y = -2x + 7', firstCheck: '9 = -2(-1) + 7', firstTrue: '9 = 9',
  secondEquation: '4x + y = 5', secondCheck: '4(-1) + 9 = 5', secondTrue: '5 = 5',
}

export const solutionLines = [
  { left: '4x - 2x + 7', right: '5', description: '4x minus 2x plus 7 equals 5.' },
  { left: '2x + 7', right: '5', description: '2x plus 7 equals 5.' },
  { left: '2x + 7 - 7', right: '5 - 7', description: 'Subtract 7 from both sides: 2x plus 7 minus 7 equals 5 minus 7.' },
  { left: '2x', right: '-2', description: '2x equals negative 2.' },
  { left: '\\frac{2x}{2}', right: '\\frac{-2}{2}', description: 'Divide both sides by 2: 2x over 2 equals negative 2 over 2.' },
  { left: 'x', right: '-1', accent: true, description: 'x equals negative 1.' },
  { left: 'y', right: '-2x + 7', description: 'y equals negative 2x plus 7.' },
  { left: 'y', right: '-2(-1) + 7', description: 'Substitute x: y equals negative 2 times negative 1, plus 7.' },
  { left: 'y', right: '2 + 7', description: 'y equals 2 plus 7.' },
  { left: 'y', right: '9', accent: true, description: 'y equals 9.' },
]
