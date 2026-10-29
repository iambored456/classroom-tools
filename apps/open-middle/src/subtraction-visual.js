const weights = [100,10,1]
const names = ['hundred','ten','one']
const digitsOf = value => [Math.floor(value/100), Math.floor(value%100/10), value%10]

/** Cancel the shared amount; the unmatched amount keeps its sign. */
export function subtractionModel(slots) {
 const size = slots.length/2
 const amount = digits => digits.reduce((value,digit) => value*10+(digit??0),0)
 const left = amount(slots.slice(0,size)), right = amount(slots.slice(size))
 const difference = left-right
 const cancelled = digitsOf(Math.min(left,right))
 const unmatched = digitsOf(Math.abs(difference))
 const complete = slots.every(digit => digit !== null)
 return {
  left, right, difference, value:complete?difference:null, complete,
  empty:slots.every(digit => digit === null),
  columns:weights.map((weight,index) => ({weight, cancelled:cancelled[index], remaining:difference>=0?unmatched[index]:0, negative:difference<0?unmatched[index]:0})),
 }
}

function block(place,state) {
 const shape = ['hundred-slat','rod','cube'][place]
 const cells = state === 'negative' ? 0 : [100,10,0][place]
 return `<span class="${shape}${state==='remaining'?'':` nm-sub-${state}`}" aria-hidden="true">${'<i></i>'.repeat(cells)}</span>`
}

export function subtractionVisual(slots) {
 const model = subtractionModel(slots)
 if(model.empty)return '<div class="blocks nm-subtraction-visual"></div>'
 const groups = model.columns.map((column,place) => {
  if(!column.cancelled&&!column.remaining&&!column.negative)return ''
  return `<div class="${['hundreds','rods','ones'][place]}">${block(place,'cancelled').repeat(column.cancelled)}${block(place,'remaining').repeat(column.remaining)}${block(place,'negative').repeat(column.negative)}</div>`
 }).join('')
 const description = model.columns.map((column,place) => `${names[place]} blocks: ${column.remaining} remaining, ${column.cancelled} crossed out, ${column.negative} negative strikes`).join('; ')
 return `<div class="blocks nm-subtraction-visual" role="img" aria-label="${model.complete?'':'Partial arrangement. '}${model.left} minus ${model.right}. ${description}">${groups}</div>`
}
