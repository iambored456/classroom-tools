export const CANADIAN_COINS = Object.freeze([
 {value:1,name:'Penny',label:'1¢',motif:'maple',tone:'copper'},
 {value:5,name:'Nickel',label:'5¢',motif:'beaver',tone:'silver'},
 {value:10,name:'Dime',label:'10¢',motif:'ship',tone:'silver'},
 {value:25,name:'Quarter',label:'25¢',motif:'caribou',tone:'silver'},
 {value:100,name:'Loonie',label:'$1',motif:'loon',tone:'gold'},
 {value:200,name:'Toonie',label:'$2',motif:'bear',tone:'bimetal'},
])
export const moneyQuestions = [
 {id:142,title:'Pocket Change',prompt:'Make $1.00 using Canadian pennies, nickels, and dimes. What coins could be in your pocket?',targetCents:100,denominations:[1,5,10],sourceUrl:'https://www.openmiddle.com/pocket-change/'},
 {id:143,title:'Pocket Change 2',prompt:'Make $1.44 using the same number of Canadian pennies, nickels, and dimes. How many of each coin do you need?',targetCents:144,denominations:[1,5,10],equalCounts:true,sourceUrl:'https://www.openmiddle.com/pocket-change-2/'},
 {id:144,title:'Pocket Change 3',prompt:'Make $1.00 using exactly 15 Canadian coins. What coins could be in your pocket?',targetCents:100,targetCount:15,denominations:[1,5,10,25,100,200],sourceUrl:'https://www.openmiddle.com/pocket-change-3/'},
].map(q=>({...q,kind:'money',layout:'money',category:'Money'}))
export const MAX_COINS = 200
export const formatMoney = cents => `$${(cents/100).toFixed(2)}`
export const clampPosition = value => Math.max(0,Math.min(1,Number.isFinite(value)?value:0))
export function restoreCoins(question,saved){
 if(!Array.isArray(saved))return []
 return saved.filter(coin=>coin&&question.denominations.includes(coin.value)&&Number.isFinite(coin.x)&&Number.isFinite(coin.y)).slice(0,MAX_COINS).map((coin,id)=>({id,value:coin.value,x:clampPosition(coin.x),y:clampPosition(coin.y)}))
}
export function evaluateMoney(question,coins){
 const counts=Object.fromEntries(question.denominations.map(value=>[value,0]))
 let totalCents=0
 for(const coin of coins){
  if(!question.denominations.includes(coin.value))throw new Error('Coin is not in this question’s bank.')
  counts[coin.value]++;totalCents+=coin.value
 }
 const equalCounts=!question.equalCounts||question.denominations.every(value=>counts[value]>0&&counts[value]===counts[question.denominations[0]])
 const correctCount=!question.targetCount||coins.length===question.targetCount
 const status=coins.length===0?'incomplete':totalCents===question.targetCents&&equalCounts&&correctCount?'success':'working'
 const remaining=question.targetCents-totalCents,messages=[]
 if(status==='success')messages.push(question.equalCounts?'You made $1.44 with the same number of each coin.':question.targetCount?'You made $1.00 with exactly 15 coins.':'You made $1.00. Can you find another combination?')
 else{
  messages.push(remaining>0?`${formatMoney(remaining)} more to reach the total.`:remaining<0?`${formatMoney(-remaining)} over the target.`:'The total is correct.')
  if(question.equalCounts)messages.push(equalCounts?'Coin counts are equal.':'Use the same number of pennies, nickels, and dimes.')
  if(question.targetCount)messages.push(`${coins.length} of ${question.targetCount} coins.`)
 }
 return {totalCents,count:coins.length,counts,status,message:messages.join(' ')}
}
