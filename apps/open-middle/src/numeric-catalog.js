// Student-facing diagrams transcribed from the September 2026 DOCX collection.
// Fixed printed digits are not taken from the movable digit bank.
const digits = Array.from({length:10}, (_,i)=>i)
export const slot = i => ({type:'slots', indices:[i]})
export const number = (i, count=2) => ({type:'slots',indices:Array.from({length:count},(_,j)=>i+j)})
export const fraction = (top,bottom) => ({type:'fraction',top,bottom})
const s=slot, n=number, f=fraction
const output={type:'output'}
const make=(id,title,slotCount,rows,extra={})=>({id,title,slotCount,rows,layout:'digit-task',category:'Number',digits,unique:true,instruction:'Use each digit at most once. Fill every space to make a true statement.',...extra})
export const numericQuestions = [
 make('13-blanks','Decomposing Numbers to 10 — Blanks',10,Array.from({length:5},(_,i)=>[s(i*2),'+',s(i*2+1),'=','10']),{unique:false,category:'Addition',instruction:'Add one digit in each circle to make ten. You may reuse digits, including within a row.',rule:'make-ten'}),
 make(16,'Adding Single Digits',3,[[s(0),'+',s(1),'=',s(2)]],{category:'Addition',rule:'single-add'}),
 make(22,'Multiple Equalities',10,Array.from({length:5},(_,i)=>[s(i*2),'+',s(i*2+1),...(i<4?['=']:[])]),{category:'Addition',instruction:'Use all ten digits once. Make five sums with the same value.',rule:'equal-sums'}),
 make(33,'Subtracting Two-Digit Numbers',4,[[n(0),'−',n(2),'=',output]],{digits:digits.slice(1),category:'Subtraction',instruction:'Choose four different digits from 1 to 9. Make the smallest positive difference or the largest difference.',modes:[['smallest','Smallest positive'],['largest','Largest']],rule:'difference',leading:[0,2]}),
 make(43,'Get the Smallest Difference',6,[[n(0,3),'−',n(3,3),'=',output]],{category:'Subtraction',instruction:'Use each digit at most once to make two three-digit numbers with the smallest positive difference. The answer may repeat digits.',rule:'difference',leading:[0,3]}),
 make(44,'Subtraction With Regrouping',4,[[n(0),'−',n(2),'≈','39']],{digits:digits.slice(1),category:'Subtraction',instruction:'Choose four different digits from 1 to 9. Make a difference as close to 39 as possible.',rule:'near-39'}),
 make(47,'Sums to 100',6,[[n(0),'+',n(2),'+',n(4),'≈','100']],{digits:digits.slice(1),category:'Addition',instruction:'Use each digit at most once. Make three two-digit numbers whose sum is as close to 100 as possible.',rule:'sum-100'}),
 make(53,'Largest Area Rectangle',3,[[{type:'label',text:'Length'},n(0),{type:'label',text:'Width'},s(2)]],{category:'Geometry',instruction:'Choose digits from 0 to 9 to make a rectangle with the largest possible area. Use each chosen digit at most once.',rule:'area',leading:[0],visual:'rectangle'}),
 make(58,'Area and Perimeter Double / Quadruple',4,[[{type:'label',text:'Smaller rectangle'},s(0),'×',s(1)],[{type:'label',text:'Larger rectangle'},s(2),'×',s(3)]],{category:'Geometry',instruction:'Use each digit at most once. Goal A: double the smaller rectangle’s perimeter. Goal B: quadruple its area. Try satisfying both.',modes:[['both','Both goals'],['perimeter','Double perimeter'],['area','Quadruple area']],rule:'scale-rectangles',visual:'rectangles'}),
 make(69,'Multiply and Divide Within a Hundred 1',5,[[s(0),'×',s(1),'=',n(2),'÷',s(4)]],{digits:digits.slice(2),category:'Multiplication',instruction:'Use digits 2 to 9 at most once. Make a true equation. Then try a common value greater than 30 or less than 30.',modes:[['any','Any true equation'],['greater','Greater than 30'],['less','Less than 30']],rule:'multiply-divide'}),
 make(71,'Multiplying Multiples of Ten 1',5,[[s(0),'×',{type:'group',parts:[s(1),'0']},'=',n(2,3)]],{category:'Multiplication',instruction:'Use each movable digit at most once. The printed 0 stays in place. Make a true equation with a product greater than 500, then less than 500.',modes:[['greater','Greater than 500'],['less','Less than 500']],rule:'multiple-ten',leading:[1,2]}),
 make(94,'Comparing Fractions',8,[[f(s(0),s(1)),'>',f(s(2),s(3))],[f(s(4),s(5)),'=',f(s(6),s(7))]],{digits:digits.slice(1),category:'Fractions',instruction:'Use digits 1 to 9 at most once across both statements. Make the comparison and equality true.',rule:'compare-fractions'}),
 make(109,'Equivalent Fractions',7,[[f(s(0),s(1)),'=',f(s(2),s(3)),'=',f(s(4),n(5))]],{category:'Fractions',instruction:'Use each digit at most once. Make three equivalent fractions.',rule:'equivalent-fractions',leading:[5]}),
 make(113,'Comparing Hundredths and Tenths, Fractions and Decimals 1',6,[[{type:'group',parts:['0.',n(0)]},'<',f(s(2),'10'),'<','0.65','<',f(n(3),'100'),'<',{type:'group',parts:['0.',s(5)]}]],{digits:digits.slice(1),category:'Decimals',rule:'ordered-decimals'}),
 make(114,'Comparing Hundredths and Tenths, Fractions and Decimals 2',6,[[{type:'group',parts:['0.',s(0)]},'<',{type:'group',parts:[f(s(1),'10'),'+',f(n(2),'100')]},'<',{type:'group',parts:['0.',n(4)]},'<','0.75']],{digits:digits.slice(1),category:'Decimals',rule:'ordered-sum'}),
 make(116,'Fraction and Decimal',4,[[f(s(0),s(1)),'=',{type:'group',parts:[s(2),'.',s(3)]}]],{category:'Fractions',instruction:'Use each digit at most once to make an equal fraction and decimal.',rule:'fraction-decimal'}),
 make(119,'Decomposing Tenths and Hundredths',5,[[f(s(0),'10'),'+',f(s(1),'10'),'+',f(s(2),'10'),'+',f(n(3),'100'),'=',{type:'group',parts:['1',f('1','10')]}]],{category:'Decimals',rule:'decompose-decimal'}),
 make(180,'Decimal Product Close to 50',4,[[{type:'group',parts:[s(0),'.',s(1)]},'×',{type:'group',parts:[s(2),'.',s(3)]},'=',output]],{digits:digits.slice(1),category:'Decimals',instruction:'Use each digit at most once. Make a product as close to 50 as possible.',rule:'product-50'}),
 make(219,'Order of Operations',4,[[s(0),'+','(',s(1),'−',s(2),')','×',s(3),'=',output]],{category:'Operations',instruction:'Use each digit at most once. Create a value greater than 20, then 40, then 60.',modes:[['20','Greater than 20'],['40','Greater than 40'],['60','Greater than 60']],rule:'order-operations'}),
 make(278,'Percent of a Quantity',6,[[f(n(0),n(2)),'=',{type:'group',parts:[n(4),'%']}]],{category:'Percent',rule:'percent-fraction',leading:[0,2,4]}),
 make(279,'Scaling a Number by a Percent',6,[[{type:'group',parts:[n(0),'%']},'of',n(2),'=',n(4)]],{unique:false,category:'Percent',instruction:'Use each digit freely to make a true sentence with three two-digit numbers. Challenge: use each movable digit at most once.',modes:[['free','Digits may repeat'],['unique','No repeated digits']],rule:'percent-of',leading:[0,2,4]}),
 make(353,'Probability with Bags of Marbles',5,[[{type:'label',text:'Bag A'},s(0),'red +',s(1),'blue'],[{type:'label',text:'Bag B'},s(2),'red +',n(3),'green']],{digits:digits.slice(1),category:'Probability',instruction:'Use digits 1 to 9 without repeating. Make the probability of drawing a red marble equal in both bags. The number of green marbles must have two digits.',rule:'marbles',visual:'marbles'}),
 make(357,'Rolling Different Dice with the Same Probability',4,[[{type:'label',text:'Sum'},s(0),{type:'label',text:'with two'},s(1),{type:'label',text:'sided dice'}],[{type:'label',text:'Sum'},s(2),{type:'label',text:'with two'},s(3),{type:'label',text:'sided dice'}]],{digits:digits.slice(1),category:'Probability',instruction:'Use each digit at most once. Make the two sums have the same probability using two fair dice numbered 1 to the number of sides. Choose possible sums and dice with at least two sides.',rule:'dice-probability'})
]

export const isUnique = (q,mode) => q.unique || mode==='unique'
export function placeNumeric(slots,digit,target,q,mode) {
 if(!q.digits.includes(digit)||!Number.isInteger(target)||target<0||target>=q.slotCount) throw new Error('Invalid digit or space')
 const next=[...slots], source=isUnique(q,mode)?next.indexOf(digit):-1
 if(source===target)return next
 if(source>=0)next[source]=next[target]
 next[target]=digit
 return next
}
export function diceWays(sum,sides) { return Math.max(0,Math.min(sides,sum-1)-Math.max(1,sum-sides)+1) }
const fmt = value => Number(value.toFixed(6)).toString()
export function evaluateNumeric(q,a,mode=q.modes?.[0][0]) {
 const result=(state,message,value=null)=>({state,message,value})
 if(a.length!==q.slotCount || a.some(v=>v===null))return result('incomplete','Fill every space, then check your work.')
 if(a.some(v=>!q.digits.includes(v)))return result('invalid','Use digits from the bank.')
 if(isUnique(q,mode)&&new Set(a).size!==a.length)return result('invalid','Use each digit only once.')
 if(q.leading?.some(i=>a[i]===0))return result('invalid','A multi-digit number cannot begin with zero.')
 const num=(i,count=2)=>a.slice(i,i+count).reduce((x,y)=>10*x+y,0)
 const check=(yes,message)=>result(yes?'success':'progress',message)
 const target=(value,goal,label='Value')=>result(value===goal?'success':'progress',`${label}: ${fmt(value)}. Distance from ${goal}: ${fmt(Math.abs(value-goal))}.`,fmt(value))
 switch(q.rule) {
 case 'make-ten': {const sums=Array.from({length:5},(_,i)=>a[i*2]+a[i*2+1]);return check(sums.every(x=>x===10),`Row sums: ${sums.join(', ')}. ${sums.every(x=>x===10)?'Every row makes ten.':'Each row needs to make ten.'}`)}
 case 'single-add': return check(a[0]+a[1]===a[2],`${a[0]} + ${a[1]} = ${a[0]+a[1]}. ${a[0]+a[1]===a[2]?'Your equation is true.':'Try another arrangement.'}`)
 case 'equal-sums': {const sums=Array.from({length:5},(_,i)=>a[i*2]+a[i*2+1]);return check(sums.every(x=>x===sums[0]),`Sums: ${sums.join(', ')}. ${sums.every(x=>x===sums[0])?'All five are equal.':'Make all five equal.'}`)}
 case 'difference': {const size=q.slotCount/2,d=num(0,size)-num(size,size),goal=mode==='largest'?86:size===2?2:3;if(d<=0)return result('invalid','Make the first number larger so the difference is positive.',String(d));return result(d===goal?'success':'progress',`Difference: ${d}. ${d===goal?'You found the '+(mode==='largest'?'largest':'smallest positive')+' possible difference.':'Keep exploring '+(mode==='largest'?'larger':'smaller positive')+' differences.'}`,String(d))}
 case 'near-39':return target(num(0)-num(2),39,'Difference')
 case 'sum-100':return target(num(0)+num(2)+num(4),100,'Sum')
 case 'area': {const area=num(0)*a[2];if(a[2]===0)return result('invalid','Both rectangle dimensions must be positive.');return result(area===(q.unique?783:891)?'success':'progress',`Area: ${num(0)} × ${a[2]} = ${area} square units. ${area===(q.unique?783:891)?'Largest possible area.':'Try another arrangement to increase the area.'}`,String(area))}
 case 'scale-rectangles':{if(a.includes(0))return result('invalid','Rectangle dimensions must be positive.');const p=2*(a[0]+a[1]),P=2*(a[2]+a[3]),r=a[0]*a[1],R=a[2]*a[3],per=P===2*p,area=R===4*r;return check(mode==='perimeter'?per:mode==='area'?area:per&&area,`Perimeters: ${p} and ${P}; ${per?'double':'not double'}. Areas: ${r} and ${R}; ${area?'quadruple':'not quadruple'}.`)}
 case 'multiply-divide': {const left=a[0]*a[1],right=num(2)/a[4],trueEquation=left*a[4]===num(2),meets=mode==='greater'?left>30:mode==='less'?left<30:true;return check(trueEquation&&meets,`Left side: ${left}. Right side: ${fmt(right)}. ${!trueEquation?'The sides must match.':!meets?'The equation is true; try the selected size goal.':'The equation meets your goal.'}`)}
 case 'multiple-ten': {const p=a[0]*a[1]*10,goal=mode==='greater'?p>500:p<500;return check(p===num(2,3)&&goal,`${a[0]} × ${a[1]*10} = ${p}. ${p!==num(2,3)?'Check the product digits.':!goal?'Try the selected size goal.':'Your equation meets the goal.'}`)}
 case 'compare-fractions':return check(a[0]*a[3]>a[2]*a[1]&&a[4]*a[7]===a[6]*a[5],`Comparison is ${a[0]*a[3]>a[2]*a[1]?'true':'false'}; equality is ${a[4]*a[7]===a[6]*a[5]?'true':'false'}.`)
 case 'equivalent-fractions':if(!a[1]||!a[3]||!num(5))return result('invalid','A denominator cannot be zero.');return check(a[0]*a[3]===a[2]*a[1]&&a[0]*num(5)===a[4]*a[1],`Fraction values: ${fmt(a[0]/a[1])}, ${fmt(a[2]/a[3])}, ${fmt(a[4]/num(5))}.`)
 case 'ordered-decimals':{const v=[num(0),a[2]*10,65,num(3),a[5]*10];return check(v.every((x,i)=>!i||v[i-1]<x),`${v.map(x=>fmt(x/100)).join(' < ')} ${v.every((x,i)=>!i||v[i-1]<x)?'is true.':'is not yet true.'}`)}
 case 'ordered-sum':{const v=[a[0]*10,a[1]*10+num(2),num(4),75];return check(v.every((x,i)=>!i||v[i-1]<x),`${v.map(x=>fmt(x/100)).join(' < ')} ${v.every((x,i)=>!i||v[i-1]<x)?'is true.':'is not yet true.'}`)}
 case 'fraction-decimal':if(!a[1])return result('invalid','A denominator cannot be zero.');return check(a[0]*10===a[1]*(a[2]*10+a[3]),`${a[0]}/${a[1]} = ${fmt(a[0]/a[1])}; your decimal is ${a[2]}.${a[3]}.`)
 case 'decompose-decimal':return target((10*(a[0]+a[1]+a[2])+num(3))/100,1.1,'Sum')
 case 'product-50':{const p=(a[0]*10+a[1])*(a[2]*10+a[3]),d=Math.abs(p-5000);return result(d===2?'success':'progress',`Product: ${fmt(p/100)}. Distance from 50: ${fmt(d/100)}.${d===2?' Closest possible!':''}`,fmt(p/100))}
 case 'order-operations':{const v=a[0]+(a[1]-a[2])*a[3];return result(v>Number(mode)?'success':'progress',`Value: ${v}; ${v>Number(mode)?'greater':'not greater'} than ${mode}. Parentheses, multiplication, then addition.`,String(v))}
 case 'percent-fraction':if(!num(2))return result('invalid','The denominator cannot be zero.');return check(num(0)*100===num(2)*num(4),`${num(0)}/${num(2)} = ${fmt(num(0)/num(2)*100)}%. Your percent is ${num(4)}%.`)
 case 'percent-of':return check(num(0)*num(2)===num(4)*100,`${num(0)}% of ${num(2)} = ${fmt(num(0)*num(2)/100)}. Your result is ${num(4)}.`)
 case 'marbles':return check(a[0]*(a[2]+num(3))===a[2]*(a[0]+a[1]),`P(red from A) = ${a[0]}/${a[0]+a[1]}; P(red from B) = ${a[2]}/${a[2]+num(3)}.`)
 case 'dice-probability':{if(a[1]<2||a[3]<2)return result('invalid','Use dice with at least two sides.');const w=diceWays(a[0],a[1]),v=diceWays(a[2],a[3]);if(!w||!v)return result('invalid','Choose a sum that can occur for each pair of dice.');return check(w*a[3]**2===v*a[1]**2,`Probabilities: ${w}/${a[1]**2} and ${v}/${a[3]**2}.`)}
 default:return result('invalid','This question has no evaluation rule.')
 }
}
