import type { AnswerSpec, Item } from './types'

export const bankVersion = '2026.11.1'
export const items: Item[] = []

type BankNotes = Pick<Item, 'prerequisites' | 'domain' | 'misconception' | 'instruction' | 'solutionMath'>

type Draft = [
  family: string,
  prompt: string,
  math: string,
  answer: AnswerSpec,
  solution: string,
  notes?: BankNotes,
]

function add(skillId: string, support: Item['support'], drafts: Draft[], misconception?: string) {
  for (const [family, prompt, math, answer, solution, notes] of drafts) {
    items.push({ id: skillId + '-' + family, skillId, family, prompt, math, answer, solution, misconception, support, ...notes })
  }
}

type Value = number | string
type LabeledValue = [label: string, value: Value]

function fields(...values: LabeledValue[]): Extract<AnswerSpec, { kind: 'fields' }> {
  return { kind: 'fields', fields: values.map(([label, value]) => ({ label, expected: String(value) })) }
}

function number(label: string, value: Value): AnswerSpec {
  return fields([label, value])
}

function set(label: string, ...values: Value[]): Extract<AnswerSpec, { kind: 'roots' }> {
  return { kind: 'roots', label, expected: values.map(String) }
}

function withSet(label: string, values: Value[], ...steps: LabeledValue[]): AnswerSpec {
  return { ...fields(...steps), roots: { label, expected: values.map(String) } }
}

function choice(correct: string, ...options: [id: string, text: string, math?: string][]): AnswerSpec {
  return { kind: 'choice', correct, options: options.map(([id, text, math]) => ({ id, text, math })) }
}

add('N04', 'none', [
  ['two-facts', 'Find the two products.', '6\\times7\\qquad 8\\times9', fields(['6 × 7', 42], ['8 × 9', 72]), 'Six groups of 7 total 42. Eight groups of 9 total 72.'],
  ['equal-rows', 'A tray has five rows of eight counters. How many counters are there?', '', number('Counters', 40), 'Five groups of 8 total 40.'],
  ['square-array', 'The small squares in a grid form 7 rows and 7 columns. How many are there?', '', number('Small squares', 49), 'There are 7 × 7 = 49 small squares.'],
  ['read-turnaround', 'Complete both facts.', '3\\times9\\qquad 9\\times4', fields(['3 × 9', 27], ['9 × 4', 36]), 'Three groups of 9 total 27. Four groups of 9 total 36.'],
], 'Adding the two factors gives a sum instead of the total in equal groups.')

add('N05', 'none', [
  ['inverse-facts', 'Find the two quotients.', '42\\div6\\qquad 72\\div9', fields(['42 ÷ 6', 7], ['72 ÷ 9', 8]), '6 × 7 = 42 and 9 × 8 = 72.'],
  ['groups-of-five', 'A teacher needs to put 45 tiles into bags of 5. How many bags will be filled?', '', number('Bags', 9), '45 ÷ 5 = 9 since 5 × 9 = 45.'],
  ['missing-factor', 'Find the number that makes the multiplication fact true.', '8\\times\\text{□}=56', number('Missing factor', 7), 'Divide 56 by 8 to find the missing factor, 7.'],
  ['sharing', 'Divide 32 pencils equally among four tables. How many pencils go on each table?', '', number('Pencils at each table', 8), '32 ÷ 4 = 8 since 4 groups of 8 make 32.'],
], 'The divisor is the known factor. The quotient is the missing factor.')

add('N06', 'none', [
  ['all-pairs', 'List the smaller factor in every positive factor pair of 24. Separate your answers with commas.', '', set('Smaller factors', 1, 2, 3, 4), 'The pairs are 1 × 24, 2 × 12, 3 × 8, and 4 × 6.'],
  ['divisors', 'From the given list, enter every divisor of 42. Separate your answers with commas.', '2,\\ 4,\\ 6,\\ 8,\\ 14', set('Divisors of 42 from the list', 2, 6, 14), '42 ÷ 2 = 21, 42 ÷ 6 = 7, and 42 ÷ 14 = 3. Dividing by 4 or 8 leaves a remainder.'],
  ['square-pair', 'List the smaller factor in every positive factor pair of 36. Include the equal pair. Separate your answers with commas.', '', set('Smaller factors', 1, 2, 3, 4, 6), 'The pairs are 1 × 36, 2 × 18, 3 × 12, 4 × 9, and 6 × 6.'],
  ['missing-pair', 'These are the first two positive factor pairs of 27. Complete the second pair.', '1\\times27\\qquad 3\\times\\text{□}', number('Partner of 3', 9), 'Since 27 ÷ 3 = 9, the second pair is 3 × 9.'],
], 'A factor divides the product with no remainder. The pair containing 1 also counts.')

add('N07', 'none', [
  ['two-composites', 'Find the greatest common factor.', '18,\\ 24', number('Greatest common factor', 6), 'Both numbers are divisible by 6. Their common positive factors are 1, 2, 3, and 6.'],
  ['divides-evenly', 'Find the greatest common factor.', '8,\\ 40', number('Greatest common factor', 8), '8 is a factor of both numbers. A common factor cannot be greater than 8 here.'],
  ['only-one', 'Find the greatest common factor.', '15,\\ 28', number('Greatest common factor', 1), 'The factors of 15 are 1, 3, 5, and 15. Only 1 divides 28.'],
  ['three-numbers', 'Find the greatest common factor of all three numbers.', '30,\\ 45,\\ 75', number('Greatest common factor', 15), '30 = 2 × 15, 45 = 3 × 15, and 75 = 5 × 15. The common factors of 30 and 45 are 1, 3, 5, and 15.'],
], 'A common factor has to divide every number in the question.')

add('N08', 'none', [
  ['opposite-and-order', 'Give the opposite of −4, then enter the larger of −4 and −2.', '', fields(['Opposite of −4', 4], ['Larger of −4 and −2', -2]), 'The opposite of −4 is 4. On a number line, −2 is to the right of −4.'],
  ['below-zero', 'The temperature is −7 °C at dawn and −3 °C at noon. Enter the warmer temperature and its opposite. Use numbers only.', '', fields(['Warmer temperature', -3], ['Opposite of the warmer temperature', 3]), '−3 °C is warmer because −3 > −7. The opposite of −3 is 3.'],
  ['cross-zero', 'Enter the smallest of the four numbers and the opposite of zero.', '7,\\ -3,\\ 0,\\ -10', fields(['Smallest number', -10], ['Opposite of zero', 0]), '−10 is furthest left. Zero is its own opposite.'],
  ['opposite-pair', 'Find the opposite of 9 and the larger of that pair of opposite numbers.', '', fields(['Opposite of 9', -9], ['Larger number', 9]), 'The opposite of 9 is −9. The positive number lies to the right of the negative number.'],
], 'Among negative numbers, farther from zero means smaller.')

add('N09', 'none', [
  ['different-signs', 'Evaluate both expressions.', '-7+4\\qquad 3-(-5)', fields(['−7 + 4', -3], ['3 − (−5)', 8]), 'Adding 4 moves four places right from −7. Subtracting −5 is adding 5.'],
  ['below-zero', 'A temperature of 2 °C drops by 7 degrees and then rises by 3 degrees. Enter the temperature after each change. Use numbers only.', '', fields(['After the drop', -5], ['After the rise', -2]), '2 − 7 = −5 and −5 + 3 = −2.'],
  ['same-sign-and-subtract', 'Evaluate both expressions.', '-4+(-9)\\qquad -6-8', fields(['−4 + (−9)', -13], ['−6 − 8', -14]), 'Adding a negative moves left. Subtracting a positive also moves left.'],
  ['subtract-negative', 'Evaluate both expressions.', '-8-(-3)\\qquad 6+(-6)', fields(['−8 − (−3)', -5], ['6 + (−6)', 0]), 'Subtracting −3 means adding 3. A number and its opposite add to zero.'],
], 'Subtracting a negative number adds its positive opposite.')

add('N10', 'none', [
  ['same-and-opposite', 'Evaluate the product and quotient.', '(-6)(-4)\\qquad 24\\div(-6)', fields(['(−6)(−4)', 24], ['24 ÷ (−6)', -4]), 'Two negative factors give a positive product. Opposite signs give a negative quotient.'],
  ['missing-signed-factors', 'Find the two missing numbers.', '5\\times\\text{□}=-35\\qquad \\text{□}\\div 4=-6', fields(['Missing factor', -7], ['Missing dividend', -24]), '5(−7) = −35. (−24) ÷ 4 = −6.'],
  ['negative-dividend', 'Evaluate the product and quotient.', '(-7)(3)\\qquad (-36)\\div(-9)', fields(['(−7)(3)', -21], ['(−36) ÷ (−9)', 4]), 'A negative and a positive give a negative product. Two negatives give a positive quotient.'],
  ['negative-times-zero', 'Evaluate the product and quotient.', '(-8)(0)\\qquad (-28)\\div 4', fields(['(−8)(0)', 0], ['(−28) ÷ 4', -7]), 'Any number times zero is zero. A negative divided by a positive is negative.'],
], 'Compare the signs of the two numbers before assigning the sign of the result.')

add('N11', 'none', [
  ['reduce-by-six', 'Write the fraction in lowest terms. Enter its numerator and denominator.', '\\frac{12}{18}', fields(['Numerator', 2], ['Denominator', 3]), 'Divide 12 and 18 by their greatest common factor, 6.'],
  ['negative-numerator', 'Write the fraction in lowest terms with a positive denominator.', '\\frac{-15}{35}', fields(['Numerator', -3], ['Denominator', 7]), 'Divide both by 5 and keep the negative sign in the numerator.'],
  ['part-of-a-group', 'A box holds 30 tiles. Eighteen are blue. What fraction are blue? Give the fraction in lowest terms.', '', fields(['Numerator', 3], ['Denominator', 5]), '18 of 30 is 18/30. Dividing both numbers by 6 gives 3/5.'],
  ['equivalent-to-one', 'Write the fraction in lowest terms. Enter its numerator and denominator.', '\\frac{14}{14}', fields(['Numerator', 1], ['Denominator', 1]), 'Both numbers can be divided by 14 to get 1/1, which equals 1.'],
], 'Divide the numerator and denominator by the same nonzero factor.')

add('N12', 'none', [
  ['unlike-denominators', 'Subtract. Give an exact answer.', '\\frac12-\\frac23', number('Difference', '-1/6'), 'Use denominator 6. The difference is 3/6 − 4/6 = −1/6.'],
  ['reciprocal', 'Divide. Give an exact answer.', '\\frac34\\div\\frac12', number('Quotient', '3/2'), 'Multiply by the reciprocal of 1/2. The quotient is (3/4) × 2 = 3/2.'],
  ['signed-product', 'Multiply. Give an exact answer.', '\\left(-\\frac25\\right)\\left(\\frac34\\right)', number('Product', '-3/10'), 'The product is −6/20, which equals −3/10.'],
  ['mixed-sign-sum', 'Add. Give an exact answer.', '-\\frac38+\\frac34', number('Sum', '3/8'), 'Convert 3/4 to 6/8, then add −3/8 + 6/8 = 3/8.'],
], 'Add or subtract fractions with a common denominator. Divide by multiplying by the reciprocal.')


add('N16', 'none', [
  ['power-product', 'Pick the product represented by the power.', '2^4', choice('four-twos', ['four-twos', 'Four factors of 2', '2\\cdot2\\cdot2\\cdot2'], ['two-fours', 'Two factors of 4', '4\\cdot4'], ['scale', '2 times 4', '2\\cdot4'], ['sum', 'Four 2s added', '2+2+2+2']), 'The exponent 4 counts the four factors of the base 2.'],
  ['negative-base-square', 'Evaluate both squares.', '7^2\\qquad(-7)^2', fields(['7²', 49], ['(−7)²', 49]), '7 × 7 = 49 and (−7) × (−7) = 49. The parentheses make −7 the base.'],
  ['spot-squares', 'Enter all the perfect squares in the list. Separate your answers with commas.', '20,\\ 25,\\ 32,\\ 49,\\ 50', set('Perfect squares', 25, 49), '25 = 5² and 49 = 7². None of the other numbers is a whole number times itself.'],
  ['cube-pair', 'Use the parentheses to read each base. Evaluate both powers.', '(-2)^3\\qquad(-2)^4', fields(['(−2)³', -8], ['(−2)⁴', 16]), 'Three factors of −2 give −8. Four factors of −2 give 16.'],
], 'An exponent counts repeated factors. Parentheses show whether a negative sign is part of the base.')

add('N17', 'none', [
  ['principal-root', 'Evaluate the principal square root.', '\\sqrt{49}', number('Principal square root', 7), '7 × 7 = 49. The radical symbol asks for the nonnegative square root.'],
  ['estimate-root', 'The square root lies between two consecutive whole numbers. Enter the lower and upper bounds.', '\\sqrt{20}', fields(['Lower bound', 4], ['Upper bound', 5]), '4² = 16 and 5² = 25, so 4 < √20 < 5.'],
  ['square-area', 'A square has an area of 81 square tiles. How many tiles long is each side?', '', number('Tiles along one side', 9), 'Each side is √81 = 9 tiles long.'],
  ['root-of-zero', 'Evaluate the principal square root.', '\\sqrt{0}', number('Principal square root', 0), '0² = 0, so √0 = 0.'],
], 'The principal square root is nonnegative. To estimate it, find perfect squares on either side.')

add('N18', 'none', [
  ['leading-negative', 'Evaluate both expressions.', '(-3)^2\\qquad -3^2', fields(['(−3)²', 9], ['−3²', -9]), 'In (−3)², −3 is the base. In −3², square 3 first, then take its opposite.'],
  ['multiply-before-add', 'Evaluate the expression.', '4+(-3)\\cdot 5', number('Value', -11), 'Multiply −3 by 5 to get −15 before adding 4.'],
  ['nested-group', 'Evaluate the expression.', '\\left(2-5\\right)^2-4', number('Value', 5), 'First 2 − 5 = −3. Its square is 9, and 9 − 4 = 5.'],
  ['negative-outside', 'Evaluate the expression.', '-2^2+3(-2)', number('Value', -10), 'Take the opposite of 2² and multiply 3 by −2 before adding −4 + (−6) = −10.'],
], 'Calculate grouped operations and powers before applying operations outside them.')

add('A01', 'none', [
  ['implied-negative-one', 'Read the coefficient of the squared term and the constant.', '-x^2+4x-7', fields(['Coefficient of x²', -1], ['Constant', -7]), 'The minus sign gives −1x². The signed term with no variable is −7.'],
  ['separate-coefficient-exponent', 'Read the coefficient of the term containing x and the exponent on x.', '7-3x^4', fields(['Coefficient of the x term', -3], ['Exponent on x', 4]), '−3 multiplies the power. The exponent 4 applies to x.'],
  ['missing-linear', 'Read the coefficient of x², the coefficient of x, and the constant.', '5x^2+9', fields(['Coefficient of x²', 5], ['Coefficient of x', 0], ['Constant', 9]), 'There is no x term, so its coefficient is 0. The other coefficients are 5 and 9.'],
  ['implied-one', 'Read the coefficient and exponent of x in the first term. Then enter the constant.', 'x-8', fields(['Coefficient of x', 1], ['Exponent of x', 1], ['Constant', -8]), 'The first term is 1x¹. The constant is −8.'],
], 'A sign belongs to its term. An unwritten coefficient or exponent on x is 1. A missing term has coefficient 0.')

add('A02', 'none', [
  ['different-powers', 'Collect like terms. Enter the coefficients of the simplified expression.', '3x^2-x+2x^2+4x', fields(['Coefficient of x²', 5], ['Coefficient of x', 3]), 'Add 3 + 2 for x² and −1 + 4 for x. The result is 5x² + 3x.'],
  ['keep-the-power', 'Which expression is the sum after collecting like terms?', '3m^3+4m^3', choice('keep-exponent', ['multiply-exponents', 'Multiply the exponents', '7m^9'], ['keep-exponent', 'Keep the common exponent', '7m^3'], ['add-exponents', 'Add the exponents', '7m^6']), 'Adding like terms gives (3 + 4)m³. The exponent stays 3.'],
  ['cancel-variable', 'Enter the coefficient of x and the constant after collecting like terms.', '7x-4-7x+10', fields(['Coefficient of x', 0], ['Constant', 6]), 'The coefficients of x sum to zero. The constants sum to 6.'],
  ['two-variables', 'Collect like terms. Enter the coefficient of each variable.', '-4y+3x-2x-5y', fields(['Coefficient of x', 1], ['Coefficient of y', -9]), 'x and y are different variables. Collect 3x − 2x and −4y − 5y separately.'],
  ['sign-and-constant', 'Collect like terms. Enter the coefficient of each power and the constant.', '-2+x^3+3x-5x^3-4x', fields(['Coefficient of x³', -4], ['Coefficient of x', -1], ['Constant', -2]), '1 − 5 = −4 for x³ and 3 − 4 = −1 for x. The constant stays −2.'],
], 'When you add like terms, add the coefficients and keep the variable powers.')

add('A03', 'none', [
  ['negative-input-square', 'Substitute the stated value. Enter the value of the power term and of the whole expression.', '2x^2-3x\\quad\\text{at }x=-2', fields(['Value of x²', 4], ['Value of 2x² − 3x', 14]), '2(−2)² − 3(−2) = 2(4) + 6 = 14.'],
  ['two-signed-inputs', 'Substitute both values and find the result.', '2a-b\\quad\\text{at }a=-3,\\ b=-4', number('Value of 2a − b', -2), '2(−3) − (−4) = −6 + 4 = −2.'],
  ['fraction-input', 'Substitute the stated value and give an exact result.', '6t+1\\quad\\text{at }t=\\frac12', number('Value of 6t + 1', 4), '6(1/2) + 1 = 3 + 1 = 4.', { prerequisites: ['N12'] }],
  ['outer-negative', 'Substitute the stated value. Enter the value of the power term and of the whole expression.', '-p^2+7\\quad\\text{at }p=-4', fields(['Value of p²', 16], ['Value of −p² + 7', -9]), 'Replacing p by (−4) gives −(−4)² + 7 = −16 + 7 = −9.'],
], 'Use parentheses around a substituted negative, including when it is raised to a power.')

add('A04', 'none', [
  ['product-two-powers', 'Multiply. Enter the coefficient and exponent of the simplified expression.', '(2x^3)(3x^2)', fields(['Coefficient', 6], ['Exponent on x', 5]), 'Multiply coefficients 2 × 3 and add exponents 3 + 2. The product is 6x⁵.'],
  ['implicit-first-power', 'Multiply. Enter the coefficient and exponent of the simplified expression.', '(-4a)(2a^4)', fields(['Coefficient', -8], ['Exponent on a', 5]), '−4 × 2 = −8 and a has exponent 1, so the product is −8a⁵.'],
  ['two-bases', 'Find the exponent of each variable in the product.', '(m^2n)(mn^3)', fields(['Exponent on m', 3], ['Exponent on n', 4]), 'Add powers of m separately from powers of n. The product is m³n⁴.'],
  ['three-factors', 'Enter the coefficient and exponent of the simplified expression.', '(3y)(-y^2)(-2y^3)', fields(['Coefficient', 6], ['Exponent on y', 6]), 'The coefficients give 3(−1)(−2) = 6. The exponents add to 1 + 2 + 3 = 6.'],
], 'Multiplication of powers with the same base adds the exponents. It multiplies the coefficients.')

add('A05', 'none', [
  ['one-base-cancels', 'Divide. Enter the coefficient and both exponents, using zero for a cancelled base.', '\\frac{12x^5y^2}{3x^2y^2}', fields(['Coefficient', 4], ['Exponent on x', 3], ['Exponent on y', 0]), '12 ÷ 3 = 4. The exponent differences are 5 − 2 = 3 and 2 − 2 = 0, so the quotient is 4x³.', { domain: 'x and y are nonzero.' }],
  ['negative-coefficient', 'Divide. Enter the coefficient and exponent of the quotient.', '\\frac{-15a^4}{5a}', fields(['Coefficient', -3], ['Exponent on a', 3]), '−15 ÷ 5 = −3, and 4 − 1 = 3. The quotient is −3a³.', { domain: 'a is nonzero.' }],
  ['larger-denominator-power', 'Divide and write the result in the form of a coefficient times a power of t. The exponent may be negative.', '\\frac{6t^2}{3t^5}', fields(['Coefficient', 2], ['Exponent on t', -3]), '2 − 5 = −3, so the quotient is 2t⁻³ = 2/t³.', { domain: 't is nonzero.' }],
  ['both-bases-remain', 'Divide. Enter the coefficient and the exponent on each base.', '\\frac{20p^6q^4}{-4p^2q^3}', fields(['Coefficient', -5], ['Exponent on p', 4], ['Exponent on q', 1]), 'The coefficient is 20 ÷ (−4) = −5. The exponent differences are 6 − 2 = 4 and 4 − 3 = 1.', { domain: 'p and q are nonzero.' }],
], 'Subtract the denominator exponent from the numerator exponent for each nonzero base.')

add('A06', 'none', [
  ['cube-monomial', 'Simplify the power. Enter its coefficient and exponent on x.', '(2x^2)^3', fields(['Coefficient', 8], ['Exponent on x', 6]), 'Cube the coefficient 2 and multiply 2 × 3 for the power of x. The result is 8x⁶.'],
  ['negative-even-power', 'Simplify the power. Enter the coefficient and exponent on y.', '(-3y^3)^2', fields(['Coefficient', 9], ['Exponent on y', 6]), 'Square the base coefficient −3 to get 9, and multiply 3 × 2 for the exponent.'],
  ['two-bases-power', 'Find both exponents after raising the product to the stated power.', '(ab^2)^4', fields(['Exponent on a', 4], ['Exponent on b', 8]), 'Use the fourth power on each factor, so the result is a⁴b⁸.'],
  ['odd-power', 'Simplify the power. Enter the coefficient and exponent on m.', '(-m^2)^3', fields(['Coefficient', -1], ['Exponent on m', 6]), 'The coefficient is (−1)³ = −1, and the exponent is 2 × 3 = 6.'],
], 'Raise every factor to the outside power. Multiply the exponents of a power raised to a power.')

add('A07', 'none', [
  ['monomial-linear', 'Expand. Enter the coefficients of the expanded expression.', '3x(2x-5)', fields(['Coefficient of x²', 6], ['Coefficient of x', -15]), '3x times 2x is 6x². 3x times −5 is −15x.'],
  ['negative-scalar', 'Expand. Enter the coefficient of t and the constant.', '-4(3t+2)', fields(['Coefficient of t', -12], ['Constant', -8]), '−4 multiplies both 3t and 2. The result is −12t − 8.'],
  ['three-terms', 'Distribute to all three terms. Enter the resulting coefficients.', '2m(m^2-m+3)', fields(['Coefficient of m³', 2], ['Coefficient of m²', -2], ['Coefficient of m', 6]), 'Multiplying each bracket term by 2m gives 2m³ − 2m² + 6m.', { prerequisites: ['A04'] }],
  ['negative-variable-factor', 'Expand. Enter the coefficients of the two resulting terms.', '-x^2(x+4)', fields(['Coefficient of x³', -1], ['Coefficient of x²', -4]), 'The products are (−x²)(x) = −x³ and (−x²)(4) = −4x².', { prerequisites: ['A04'] }],
  ['constant-first', 'Expand. Enter the coefficient of p and of p².', '5p(3-p)', fields(['Coefficient of p', 15], ['Coefficient of p²', -5]), '5p times 3 gives 15p. 5p times −p gives −5p².'],
], 'The factor outside the brackets multiplies every term inside.')

add('A08', 'none', [
  ['all-three-signs', 'Remove the brackets. Enter the resulting coefficients and constant.', '-(2x^2-3x+4)', fields(['Coefficient of x²', -2], ['Coefficient of x', 3], ['Constant', -4]), 'Multiply each term by −1 to get −2x² + 3x − 4.'],
  ['negative-first-term', 'Remove the brackets. Enter the coefficient of y and the constant.', '-(-y-6)', fields(['Coefficient of y', 1], ['Constant', 6]), 'Each negative term becomes positive, giving y + 6.'],
  ['leading-constant', 'Remove the brackets. Enter the constant and coefficient of p.', '-(9-2p)', fields(['Constant', -9], ['Coefficient of p', 2]), 'The sign of 9 changes to negative. The sign of −2p changes to positive.'],
  ['two-variables-negative', 'Remove the brackets. Enter the coefficient of a and of b.', '-(5a+4b)', fields(['Coefficient of a', -5], ['Coefficient of b', -4]), 'Both terms change sign, giving −5a − 4b.'],
], 'A minus sign before brackets changes the sign of every term inside.')

add('A09', 'none', [
  ['monic-mixed-signs', 'Expand and collect like terms. Enter the coefficients.', '(x+2)(x-3)', fields(['Coefficient of x²', 1], ['Coefficient of x', -1], ['Constant', -6]), 'The four products are x², −3x, 2x, and −6. The middle terms sum to −x.'],
  ['non-monic', 'Expand and collect like terms. Enter the coefficients.', '(2t-1)(3t+4)', fields(['Coefficient of t²', 6], ['Coefficient of t', 5], ['Constant', -4]), '6t² + 8t − 3t − 4 simplifies to 6t² + 5t − 4.'],
  ['conjugates', 'Expand and collect like terms. Enter the coefficients.', '(y-5)(y+5)', fields(['Coefficient of y²', 1], ['Coefficient of y', 0], ['Constant', -25]), 'The middle terms −5y and 5y cancel. The constant is −25.'],
  ['repeated-binomial', 'Expand and collect like terms. Enter the coefficients.', '(2p-3)(2p-3)', fields(['Coefficient of p²', 4], ['Coefficient of p', -12], ['Constant', 9]), 'The two middle products are each −6p. The result is 4p² − 12p + 9.'],
], 'Every term of the first binomial multiplies every term of the second.')

add('A10', 'none', [
  ['quadratic-difference', 'Subtract the second expression. Enter the simplified coefficients.', '(3x^2+2x-5)-(x^2-4x+1)', fields(['Coefficient of x²', 2], ['Coefficient of x', 6], ['Constant', -6]), 'After distributing the minus, collect 3x² + 2x − 5 − x² + 4x − 1.'],
  ['variable-cancels', 'Subtract and simplify. Enter the coefficient of y and the constant.', '(5y-3)-(5y-8)', fields(['Coefficient of y', 0], ['Constant', 5]), '5y − 3 − 5y + 8 = 5. Both terms in the second set of brackets change sign.'],
  ['missing-terms', 'Subtract and simplify. Enter the resulting coefficients and constant.', '(2m^2-1)-(-3m+5)', fields(['Coefficient of m²', 2], ['Coefficient of m', 3], ['Constant', -6]), 'The subtracted terms become +3m and −5, so the result is 2m² + 3m − 6.'],
  ['two-variables-difference', 'Subtract and simplify. Enter the coefficient of each variable.', '(3a+2b)-(4a-b)', fields(['Coefficient of a', -1], ['Coefficient of b', 3]), '3a + 2b − 4a + b = −a + 3b.'],
], 'Distribute the subtraction before collecting like terms.')


add('A11', 'none', [
  ['undo-subtract', 'What number should be added to both sides to make the first equation look like the second?', 'x-7=-10\\quad\\longrightarrow\\quad x=-3', number('Number added to both sides', 7), 'Add 7 to both sides. The left becomes x and the right becomes −3.'],
  ['undo-division', 'What number should multiply both sides to remove the denominator?', '\\frac{x}{4}=-3', number('Number used to multiply both sides', 4), 'Multiply both sides by 4. Then x = −12.'],
  ['different-both-sides', 'Which operation keeps the equation balanced and removes the constant from the left?', '2x+6=20', choice('subtract-six', ['divide-left', 'Divide just the left side by 6'], ['subtract-six', 'Subtract 6 from both sides'], ['subtract-left', 'Subtract 6 from the left side only'], ['add-six', 'Add 6 to both sides']), 'Apply the same subtraction to both sides to get 2x = 14.'],
  ['undo-negative-factor', 'To isolate y, what number should divide both sides?', '-5y=30', number('Number used to divide both sides', -5), 'Dividing both sides by −5 gives y = −6.'],
], 'An operation maintains equality when applied to both sides. Use an inverse operation to undo a term or factor.')

add('A12', 'none', [
  ['unknown-on-two-sides', 'Solve the equation. After subtracting 2x and 1 from both sides, give the remaining constant on the right, then give x.', '5x+1=2x-8', fields(['Right side of 3x = …', -9], ['Value of x', -3]), 'Subtract 2x and 1 from both sides to get 3x = −9. Divide by 3.', { prerequisites: ['A02'] }],
  ['negative-multiplier', 'Solve the equation. Remove the constant on the left first. Enter the new right-hand side, then the solution.', '-3t+5=17', fields(['Right side of −3t = …', 12], ['Value of t', -4]), 'Subtract 5 from both sides to get −3t = 12. Divide by −3.'],
  ['undo-addition', 'Solve the equation by isolating p. Enter the number added to both sides and the value of p.', 'p-8=11', fields(['Number added to both sides', 8], ['Value of p', 19]), 'Add 8 to each side. Then p = 19.'],
  ['brackets-and-rational', 'Expand the brackets. Enter the constant after expanding, and find the exact solution.', '4(2p-3)=6', fields(['Constant from expanding the left', -12], ['Value of p', '9/4']), 'Expand to 8p − 12 = 6. Add 12 and divide by 8. Then p = 18/8 = 9/4.', { prerequisites: ['A07'] }],
  ['inverse-balance', 'Solve the equation. Enter the value of t and the number that multiplies both sides to isolate it.', '\\frac{t}{3}=-6', fields(['Value of t', -18], ['Multiplier', 3]), 'Multiply both sides by 3 to get t = −18.'],
], 'When isolating the variable, keep the same operation on both sides and divide by the signed coefficient.')

add('A14', 'none', [
  ['expanded-constant-right', 'Rearrange to put zero on the right. Enter the coefficients on the left.', 'x^2+5x+4=10', fields(['Coefficient of x²', 1], ['Coefficient of x', 5], ['Constant', -6]), 'Subtract 10 from both sides. Then x² + 5x − 6 = 0.'],
  ['linear-right', 'Subtract the right-hand side to put zero on the right. Enter the coefficients on the left.', 'x^2+6=3x', fields(['Coefficient of x²', 1], ['Coefficient of x', -3], ['Constant', 6]), 'Subtract 3x from both sides. Then x² − 3x + 6 = 0.'],
  ['expand-left', 'Expand and subtract the right-hand side to put zero on the right. Enter the coefficients on the left.', '2x(x-1)=x^2+3', fields(['Coefficient of x²', 1], ['Coefficient of x', -2], ['Constant', -3]), 'Expand the left to 2x² − 2x. Subtract x² + 3 and collect to get x² − 2x − 3 = 0.', { prerequisites: ['A07', 'A08', 'A02'] }],
  ['collect-both-sides', 'Subtract the right-hand side to put zero on the right. Enter the coefficients on the left.', '4x^2-3x=2x^2-x-8', fields(['Coefficient of x²', 2], ['Coefficient of x', -2], ['Constant', 8]), 'Subtract 2x², add x, and add 8 on both sides. Then 2x² − 2x + 8 = 0.', { prerequisites: ['A08', 'A02'] }],
  ['square-on-right', 'Subtract the right-hand side to put zero on the right. Enter the coefficients on the left.', '2x+7=x^2', fields(['Coefficient of x²', -1], ['Coefficient of x', 2], ['Constant', 7]), 'Subtract x² from each side, then write the result as −x² + 2x + 7 = 0.'],
], 'Move a term by performing the same inverse operation on both sides. Subtracting a whole expression changes every sign.')

add('A18', 'none', [
  ['check-true', 'Substitute x = 2 into the original equation. Enter the value of the left-hand side and 1 if it equals the right-hand side, or 0 if it does not.', 'x^2+2x=8', fields(['Value of left-hand side', 8], ['Equality holds (1 for yes, 0 for no)', 1]), '2² + 2(2) = 8, which matches the right-hand side.'],
  ['check-false', 'Substitute y = −2 into the original equation. Enter the value of each side.', 'y^2+3y=2-y', fields(['Left-hand side', -2], ['Right-hand side', 4]), 'The left gives 4 − 6 = −2. The right gives 2 − (−2) = 4. The sides differ, so y = −2 fails the check.'],
  ['check-zero-root', 'Which row correctly substitutes x = 0 and checks the original equation?', '3x^2-6x+4=4', choice('zero-check', ['wrong', 'It fails because zero cannot be a root.'], ['no-match', 'The left becomes 0, so it fails.'], ['zero-check', 'The left becomes 4, and the right is 4, so it works.']), 'Both variable terms vanish. The original equation reads 4 = 4.'],
  ['check-fraction', 'Check t = 1/2 in the original equation. Enter the exact value of each side.', '4t^2+2t=3-2t', fields(['Left-hand side', 2], ['Right-hand side', 2]), 'The left is 4(1/2)² + 2(1/2) = 2. The right is 3 − 2(1/2) = 2.', { prerequisites: ['N12'] }],
], 'To check a solution, replace the variable in the equation as it was given and compare both sides.')

add('F01', 'calculator', [
  ['two-positive-terms', 'Factor out the greatest common monomial. Enter a positive outside coefficient and the values for the shown factor form.', '6x^3+9x^2\\quad\\longrightarrow\\quad ax^b(cx+d)', fields(['a, outside coefficient', 3], ['b, outside exponent', 2], ['c, inside coefficient of x', 2], ['d, inside constant', 3]), 'The greatest common monomial is 3x². Dividing the terms by it leaves 2x + 3.'],
  ['one-constant-term', 'Factor out the greatest common monomial, with a positive outside coefficient. Enter the values for the shown factor form.', '18t^2-12\\quad\\longrightarrow\\quad a(bt^2+c)', fields(['a, outside coefficient', 6], ['b, inside coefficient of t²', 3], ['c, inside constant', -2]), 'The constant term has no t, so the greatest common monomial is 6. The product is 6(3t² − 2).'],
  ['three-terms', 'Factor out the greatest common monomial. Enter the values for the shown factor form, using a positive outside coefficient.', '10y^3-15y^2-5y\\quad\\longrightarrow\\quad ay^b(cy^2+dy+e)', fields(['a, outside coefficient', 5], ['b, outside exponent', 1], ['c, inside coefficient of y²', 2], ['d, inside coefficient of y', -3], ['e, inside constant', -1]), 'The common monomial is 5y. Dividing all three terms gives 2y² − 3y − 1.'],
  ['two-variable-gcf', 'Factor out the greatest common monomial. Enter the values for the shown form, using a positive outside coefficient.', '8a^2b+12ab^2\\quad\\longrightarrow\\quad kab(ma+nb)', fields(['k, outside coefficient', 4], ['m, inside coefficient of a', 2], ['n, inside coefficient of b', 3]), 'The common monomial is 4ab. The two remaining terms are 2a and 3b.'],
], 'Use the greatest shared numerical divisor and the lowest exponent of each shared variable.')

add('F02', 'calculator', [
  ['opposite-positive-sum', 'Find two integers with the stated product and sum.', 'p=-12,\\quad s=1', set('Two integers, separated by a comma', -3, 4), '−3 × 4 = −12 and −3 + 4 = 1.'],
  ['negative-pair', 'Find the two integers that multiply to 20 and add to −9.', '', set('Two integers, separated by a comma', -4, -5), 'The positive product and negative sum require two negative integers. −4 and −5 work.'],
  ['opposite-negative-sum', 'Find two integers with the stated product and sum.', 'p=-18,\\quad s=-7', set('Two integers, separated by a comma', 2, -9), '−9 × 2 = −18 and −9 + 2 = −7.'],
  ['equal-pair', 'Find two integers that multiply to 16 and add to 8. If the integers are equal, enter their value once.', '', set('Distinct values, separated by a comma', 4), '4 × 4 = 16 and 4 + 4 = 8.'],
], 'A negative product requires opposite signs. Always check that the signed pair also has the requested sum.')

add('F03', 'calculator', [
  ['mixed-signs', 'Factor into (x + p)(x + q). Enter the two signed constants in the factors.', 'x^2+x-12', set('p and q, separated by a comma', -3, 4), 'The constants −3 and 4 multiply to −12 and add to 1. The factors are (x − 3)(x + 4).'],
  ['negative-sum', 'Factor into (x + p)(x + q). Enter the two signed constants in the factors.', 'x^2-7x+10', set('p and q, separated by a comma', -5, -2), '−5 and −2 multiply to 10 and add to −7. The factors are (x − 5)(x − 2).'],
  ['constant-first', 'Factor into (t + p)(t + q). Enter the two signed constants in the factors.', '18+9t+t^2', set('p and q, separated by a comma', 3, 6), 'After ordering the terms, look for factors of 18 that sum to 9. They are 3 and 6.'],
  ['opposite-larger-negative', 'Factor into (m + p)(m + q). Enter the two signed constants in the factors.', 'm^2-5m-14', set('p and q, separated by a comma', -7, 2), 'The constants −7 and 2 multiply to −14 and add to −5. The factors are (m − 7)(m + 2).'],
], 'The signed constants in the factors have product c and sum b for x² + bx + c.')

add('F04', 'calculator', [
  ['two-variables', 'Group the first two terms and the last two terms. Enter the values in the shown grouped form.', 'xy+3x+2y+6\\quad\\longrightarrow\\quad x(y+a)+b(y+a)', fields(['a, constant in the common binomial', 3], ['b, outside constant in the second group', 2]), 'The groups factor as x(y + 3) + 2(y + 3), so the full factorization is (x + 2)(y + 3).'],
  ['subtract-second-group', 'Group the first two terms and the last two terms. Enter the values in the shown grouped form.', '3x^2+6x-5x-10\\quad\\longrightarrow\\quad 3x(x+a)+b(x+a)', fields(['a, constant in the common binomial', 2], ['b, outside constant in the second group', -5]), '−5 goes outside the second group so the shared bracket is x + 2. The factors are (3x − 5)(x + 2).'],
  ['regroup-reordered', 'Regroup the terms, then enter the values in the shown form.', '2xy+3x+6y+9\\quad\\longrightarrow\\quad 2y(x+a)+b(x+a)', fields(['a, constant in the common binomial', 3], ['b, outside constant in the second group', 3]), 'Group 2xy with 6y and 3x with 9. Both groups share x + 3. The factors are (2y + 3)(x + 3).'],
  ['shared-negative-constant', 'Group to give an identical binomial in both groups. Enter the values in the shown form.', '4t^2-12t+2t-6\\quad\\longrightarrow\\quad 4t(t+a)+b(t+a)', fields(['a, constant in the common binomial', -3], ['b, outside constant in the second group', 2]), 'The binomial t − 3 appears in both groups. The factorization is (4t + 2)(t − 3) = 2(2t + 1)(t − 3).'],
], 'Factor each group until its remaining binomial matches the other group. Extracting a negative can help the signs match.')


const realRoots = { domain: 'Find all distinct real roots.' }

add('F05', 'calculator', [
  ['mixed-middle-split', 'Use the AC method. Find the signed constants in (3x + p)(2x + q) and the two signed coefficients used to split the middle term.', '6x^2+x-2', withSet('Coefficients for the middle split, separated by a comma', [4, -3], ['p, constant in the factor beginning with 3x', 2], ['q, constant in the factor beginning with 2x', -1]), 'ac = −12. Split x into 4x − 3x, then group 2x(3x + 2) − (3x + 2). The factors are (3x + 2)(2x − 1).'],
  ['both-middle-parts-positive', 'Use the AC method. Find the signed constants in (3x + p)(x + q) and the two signed coefficients used to split the middle term.', '3x^2+14x+8', withSet('Coefficients for the middle split, separated by a comma', [12, 2], ['p, constant in the factor beginning with 3x', 2], ['q, constant in the factor beginning with x', 4]), 'ac = 24. Split 14x into 12x + 2x. The groups give (3x + 2)(x + 4).'],
  ['both-middle-parts-negative', 'Use the AC method. Find the signed constants in (5t + p)(t + q) and the two signed coefficients used to split the middle term.', '5t^2-13t+6', withSet('Coefficients for the middle split, separated by a comma', [-10, -3], ['p, constant in the factor beginning with 5t', -3], ['q, constant in the factor beginning with t', -2]), 'ac = 30. Split −13t into −10t − 3t. Both groups contain t − 2, giving (5t − 3)(t − 2).'],
  ['reordered-ac', 'Use the AC method. Find the signed constants in (4m + p)(2m + q) and the two signed coefficients used to split the middle term.', '-3+2m+8m^2', withSet('Coefficients for the middle split, separated by a comma', [6, -4], ['p, constant in the factor beginning with 4m', 3], ['q, constant in the factor beginning with 2m', -1]), 'ac = −24. Split 2m into 6m − 4m and group 2m(4m + 3) − (4m + 3). The factors are (4m + 3)(2m − 1).'],
], 'The split coefficients multiply to a times c and add to b. Group the split expression before multiplying the factors back to check.')

add('F06', 'calculator', [
  ['variable-square-first', 'Factor the difference of squares in the shown form. Use positive values of a and b.', '9x^2-25=(ax-b)(ax+b)', fields(['a, coefficient of x', 3], ['b, positive constant', 5]), '9x² = (3x)² and 25 = 5², so the factors are (3x − 5) and (3x + 5).'],
  ['constant-square-first', 'Factor the difference of squares in the shown form. Use positive values of a and b.', '49-4t^2=(a-bt)(a+bt)', fields(['a, positive constant', 7], ['b, coefficient of t', 2]), 'Take the square roots 7 and 2t. The factors are (7 − 2t)(7 + 2t).'],
  ['two-squared-variables', 'Factor the difference of squares in the shown form. Use positive values of a and b.', '16m^2-n^2=(am-bn)(am+bn)', fields(['a, coefficient of m', 4], ['b, coefficient of n', 1]), 'The squared quantities are 4m and n, so the factors are (4m − n)(4m + n).'],
  ['choose-conjugates', 'Which expression is a correct factorization?', '121-y^2', choice('conjugates', ['plus-twice', 'Two plus signs', '(11+y)(11+y)'], ['conjugates', 'Opposite signs', '(11-y)(11+y)'], ['minus-twice', 'Two minus signs', '(11-y)(11-y)']), 'Use 11 and y, with one plus sign and one minus sign so the middle terms cancel.'],
], 'The binomial factors have opposite signs between the same two quantities. Squaring one binomial would introduce a middle term.')

add('F07', 'calculator', [
  ['negative-middle', 'Write the trinomial in the shown form. Use a positive a and a signed b.', '4x^2-12x+9=(ax+b)^2', fields(['a, coefficient of x', 2], ['b, signed constant', -3]), 'The outer terms are (2x)² and 3². The middle term −12x comes from 2(2x)(−3), so the square is (2x − 3)².'],
  ['fill-middle', 'Find the missing coefficient of y so the trinomial equals the given square.', 'y^2+ky+25=(y-5)^2', number('k, coefficient of y', -10), 'Two copies of the product y(−5) give a middle term of −10y.'],
  ['positive-middle', 'Write the trinomial in the shown form. Use a positive a and a signed b.', '9t^2+12t+4=(at+b)^2', fields(['a, coefficient of t', 3], ['b, signed constant', 2]), 'The end terms are (3t)² and 2². The middle term is 2(3t)(2) = 12t, so the square is (3t + 2)².'],
  ['reject-false-square', 'Choose the correction for a student who wrote the proposed equality.', 'x^2+5x+9=(x+3)^2', choice('middle', ['middle', 'The right side has a middle term of 6x, so the equality fails.'], ['constant', 'The right side has a constant of 3, so the equality fails.'], ['works', 'The equality holds because both end terms are squares.']), 'The end terms alone do not establish a perfect square. The required middle term for (x + 3)² is 2(x)(3) = 6x.'],
], 'The middle term must equal twice the product of the two quantities inside the squared bracket, including the sign.')

add('F08', 'calculator', [
  ['retain-zero', 'Apply the zero-product rule. In the equation from the second factor, give the right side of 3x = …, then list all distinct roots.', 'x(3x+2)=0', withSet('All distinct roots', [0, '-2/3'], ['Right side of 3x = …', -2]), 'The factors give x = 0 or 3x + 2 = 0. Solve the second equation to get x = −2/3.', { ...realRoots, prerequisites: ['A12'] }],
  ['opposite-signed-linear-factors', 'Set each factor to zero. Enter the right side of 2x = … from the first factor and list all distinct roots.', '(2x-3)(x+4)=0', withSet('All distinct roots', ['3/2', -4], ['Right side of 2x = …', 3]), '2x − 3 = 0 gives x = 3/2. x + 4 = 0 gives x = −4.', { ...realRoots, prerequisites: ['A12'] }],
  ['one-zero-factor', 'Use the factored equation. List all distinct values that make at least one factor zero.', 'p(p-6)=0', set('All distinct roots', 0, 6), 'Either p = 0 or p − 6 = 0, which gives p = 6.', realRoots],
  ['repeated-factor', 'Use the factored equation. List all distinct values that make the repeated factor zero.', '(y+5)(y+5)=0', set('All distinct roots', -5), 'Both factors give y + 5 = 0. The only distinct root is −5.', realRoots],
  ['nonzero-constant-factor', 'Identify the constant factor that never becomes zero, then list all distinct roots.', '-4(t+3)(t-1)=0', withSet('All distinct roots', [-3, 1], ['Constant factor', -4]), 'The constant −4 cannot be zero. The variable factors vanish when t = −3 or t = 1.', realRoots],
], 'For a product equal to zero, look for all ways any factor can become zero. Dividing by a variable can discard its zero value.')

add('F09', 'calculator', [
  ['isolate-positive-square', 'Isolate the square, then list all distinct real roots.', '4x^2=36', withSet('All distinct roots', [-3, 3], ['Right side of x² = …', 9]), 'Divide by 4 to get x² = 9. Both 3 and −3 square to 9.', realRoots],
  ['square-already-isolated', 'List all distinct real roots.', 'p^2=64', set('All distinct roots', -8, 8), 'The two numbers whose square is 64 are −8 and 8.', realRoots],
  ['square-equals-zero', 'Isolate the square, then list all distinct real roots.', '3y^2+5=5', withSet('All distinct roots', [0], ['Right side of y² = …', 0]), 'Subtract 5 and divide by 3 to get y² = 0. Only zero squares to zero.', realRoots],
  ['square-equals-negative', 'Isolate the square and choose the result over the real numbers.', '2t^2+11=3', choice('none', ['two', 'Two real roots, −2 and 2', 't^2=4'], ['one', 'One real root, 0', 't^2=0'], ['none', 'No real roots', 't^2=-4']), 'Subtract 11 and divide by 2 to get t² = −4. The square of a real number is nonnegative.', realRoots],
], 'A positive square has positive and negative roots. A square equal to zero has one distinct root. A negative square has no real roots.')


function solveByFactoring(
  family: string,
  equation: string,
  factorForm: string,
  roots: Value[],
  steps: LabeledValue[],
  solution: string,
  prerequisites: string[],
  instruction = '',
): Draft {
  return [
    family,
    'Solve by factoring. Complete the factorization of the expression equal to zero in the form ' + factorForm + ', then list all distinct real roots.',
    equation,
    withSet('All distinct real roots', roots, ...steps),
    solution,
    { ...realRoots, prerequisites, instruction },
  ]
}

add('F10', 'calculator', [
  solveByFactoring(
    'rearrange-and-factor', '3x^2+5x=2', '(3x + p)(x + q)',
    ['1/3', -2], [['p, constant of the 3x factor', -1], ['q, constant of the x factor', 2]],
    'Subtract 2 from both sides. Factor 3x² + 5x − 2 as (3x − 1)(x + 2). The roots are 1/3 and −2.', ['A14', 'F05', 'A12'],
  ),
  solveByFactoring(
    'check-original-equation', 'x^2+5x+4=10', '(x + p)(x + q)',
    [-6, 1], [['p, smaller signed constant', -1], ['q, larger signed constant', 6], ['Value of the original left-hand side at your larger root', 10]],
    'Subtract 10 and factor as (x − 1)(x + 6) = 0. The roots are 1 and −6. Substituting 1 gives 1 + 5 + 4 = 10.', ['A14', 'F03', 'A18'],
    'Subtract the right side first. Then use the original equation to check your larger root.',
  ),
  solveByFactoring(
    'monic-opposite-signs', 'x^2-x-12=0', '(x + p)(x + q)',
    [-3, 4], [['p, smaller signed constant', -4], ['q, larger signed constant', 3]],
    'Use −4 and 3, which multiply to −12 and add to −1. The factors give roots 4 and −3.', ['F03'],
  ),
  solveByFactoring(
    'common-positive-monomial', '6x^2+18x=0', 'ax(x + b)',
    [0, -3], [['a, outside coefficient', 6], ['b, signed constant in brackets', 3]],
    'Factor out 6x to get 6x(x + 3) = 0. So x = 0 or x = −3.', ['F01'],
  ),
  solveByFactoring(
    'square-difference-monic', 'x^2-81=0', '(x − a)(x + a)',
    [-9, 9], [['a, positive constant in the factors', 9]],
    'Since 81 = 9², the two factors are x − 9 and x + 9. The roots are ±9.', ['F06'],
  ),
  solveByFactoring(
    'square-positive-middle', 'x^2+14x+49=0', '(x + a)²',
    [-7], [['a, signed constant in the factor', 7]],
    'The middle term is 2(x)(7), so use (x + 7)² = 0. Its only distinct root is −7.', ['F07'],
  ),
  solveByFactoring(
    'ac-negative-product', '6x^2+7x-3=0', '(3x + p)(2x + q)',
    ['1/3', '-3/2'], [['p, constant of the 3x factor', -1], ['q, constant of the 2x factor', 3]],
    'Split 7x into 9x − 2x to get (3x − 1)(2x + 3) = 0. Then x = 1/3 or x = −3/2.', ['F05', 'A12'],
  ),
  solveByFactoring(
    'common-negative-monomial', '-4x^2+8x=0', 'ax(x + b)',
    [0, 2], [['a, signed outside coefficient', -4], ['b, signed constant in brackets', -2]],
    'Extract −4x to get −4x(x − 2) = 0. The roots are 0 and 2.', ['F01'],
  ),
  solveByFactoring(
    'monic-both-positive-factors', 'x^2+9x+20=0', '(x + p)(x + q)',
    [-4, -5], [['p, smaller signed constant', 4], ['q, larger signed constant', 5]],
    'The factors are (x + 4)(x + 5). The roots are −4 and −5.', ['F03'],
  ),
  solveByFactoring(
    'square-difference-constant-first', '25-x^2=0', '(a − x)(a + x)',
    [-5, 5], [['a, positive constant in the factors', 5]],
    'Factor as (5 − x)(5 + x) = 0. The roots are 5 and −5.', ['F06'],
  ),
  solveByFactoring(
    'square-negative-middle', 'x^2-8x+16=0', '(x + a)²',
    [4], [['a, signed constant in the factor', -4]],
    'The constant term is 4² and the middle term is −2(x)(4). Then (x − 4)² = 0, so x = 4.', ['F07'],
  ),
  solveByFactoring(
    'ac-positive-product', '8x^2-14x+3=0', '(4x + p)(2x + q)',
    ['1/4', '3/2'], [['p, constant of the 4x factor', -1], ['q, constant of the 2x factor', -3]],
    'Split −14x into −12x − 2x to get (4x − 1)(2x − 3) = 0. Then x = 1/4 or x = 3/2.', ['F05', 'A12'],
  ),
  solveByFactoring(
    'common-monomial-reordered', '-40x+8x^2=0', 'ax(x + b)',
    [0, 5], [['a, outside coefficient', 8], ['b, signed constant in brackets', -5]],
    'The common factor 8x leaves x − 5 regardless of the original term order. The roots are 0 and 5.', ['F01'],
  ),
  solveByFactoring(
    'monic-both-negative-factors', 'x^2-11x+30=0', '(x + p)(x + q)',
    [5, 6], [['p, smaller signed constant', -6], ['q, larger signed constant', -5]],
    'The two numbers with product 30 and sum −11 are −6 and −5. The roots are 6 and 5.', ['F03'],
  ),
  solveByFactoring(
    'square-difference-nonmonic', '4x^2-100=0', '(ax − b)(ax + b)',
    [-5, 5], [['a, positive coefficient of x', 2], ['b, positive constant', 10]],
    'The two squares give (2x − 10)(2x + 10). A factor vanishes at x = 5 or x = −5.', ['F06'],
  ),
  solveByFactoring(
    'square-out-of-order', '36-12x+x^2=0', '(x + a)²',
    [6], [['a, signed constant in the factor', -6]],
    'Order the terms to get x² − 12x + 36. This is (x − 6)², so x = 6 is the only distinct root.', ['F07'],
  ),
  solveByFactoring(
    'ac-missing-products', '12x^2-5x-2=0', '(3x + p)(4x + q)',
    ['2/3', '-1/4'], [['p, constant of the 3x factor', -2], ['q, constant of the 4x factor', 1]],
    'The AC pair is −8 and 3, giving (3x − 2)(4x + 1) = 0. So x = 2/3 or x = −1/4.', ['F05', 'A12'],
  ),
  solveByFactoring(
    'group-negative-parts', 'x^2-2x-8x+16=0', '(x + p)(x + q)',
    [2, 8], [['p, smaller signed constant', -8], ['q, larger signed constant', -2]],
    'The groups x(x − 2) and −8(x − 2) share x − 2. Their factors give roots 2 and 8.', ['F04'],
  ),
  solveByFactoring(
    'group-one-shared-binomial', 'x^2+11x-x-11=0', '(x + p)(x + q)',
    [-11, 1], [['p, smaller signed constant', -1], ['q, larger signed constant', 11]],
    'Group as x(x + 11) − (x + 11). The factors are x − 1 and x + 11, giving roots 1 and −11.', ['F04'],
  ),
  solveByFactoring(
    'group-nonmonic', '3x^2+12x-18x-72=0', '(3x + p)(x + q)',
    [-4, 6], [['p, constant of the 3x factor', -18], ['q, constant of the x factor', 4]],
    'The groups are 3x(x + 4) − 18(x + 4). The factors vanish at 6 and −4.', ['F04'],
  ),
], 'First arrange the equation to equal zero. Factor the entire expression on the other side. Find every way a factor can be zero.')

function strategy(
  family: string,
  math: string,
  prerequisites: string[],
  solution: string,
  correctIndex: number,
  options: [method: string, factorization: string][],
): Draft {
  return [
    family,
    'Which row names a valid strategy and gives the complete factorization?',
    math,
    choice(String(correctIndex + 1), ...options.map(([method, factorization], index): [string, string, string] => [String(index + 1), method, factorization])),
    solution,
    { prerequisites },
  ]
}

add('F11', 'calculator', [
  strategy('extract-then-difference', '3x^2-27', ['F01', 'F06'], 'Extract 3, then factor x² − 9. The resulting factors are 3(x − 3)(x + 3).', 2, [
    ['Difference of squares', '(3x-9)(3x+9)'],
    ['Common factor', '3(x^2-9)'],
    ['Common factor, then difference of squares', '3(x-3)(x+3)'],
  ]),
  strategy('common-factor-linear', '12x^2-18x', ['F01'], 'The coefficients share 6 and both terms contain x. The result is 6x(2x − 3).', 0, [
    ['Common monomial factor', '6x(2x-3)'],
    ['Common monomial factor', '3x(4x-6)'],
    ['Difference of squares', '(6x-3)(2x+6)'],
  ]),
  strategy('single-leading-one', 'x^2+4x-21', ['F03'], 'Since the leading coefficient is 1, find a pair that multiplies to −21 and adds to 4. That pair is 7 and −3.', 1, [
    ['Product and sum', '(x+3)(x-7)'],
    ['Product and sum', '(x+7)(x-3)'],
    ['Perfect square', '(x+2)^2'],
  ]),
  strategy('single-conjugate', '1-16x^2', ['F06'], 'Both terms are squares, with a subtraction between them. Undo the product of conjugates to get (1 − 4x)(1 + 4x).', 2, [
    ['Perfect square', '(1-4x)^2'],
    ['Difference of squares', '(1-16x)(1+16x)'],
    ['Difference of squares', '(1-4x)(1+4x)'],
  ]),
  strategy('single-square', 'x^2+18x+81', ['F07'], 'The end terms are x² and 9². The middle term 18x is 2(x)(9), so the complete factorization is (x + 9)².', 0, [
    ['Perfect square trinomial', '(x+9)^2'],
    ['Difference of squares', '(x-9)(x+9)'],
    ['Perfect square trinomial', '(x+81)^2'],
  ]),
  strategy('single-ac', '15x^2+7x-2', ['F05'], 'AC gives a pair with product −30 and sum 7. Split 7x into 10x − 3x, then group into (5x − 1)(3x + 2).', 1, [
    ['AC method', '(5x+1)(3x-2)'],
    ['AC method', '(5x-1)(3x+2)'],
    ['Monic trinomial method', '(x+2)(x-1)'],
  ]),
  strategy('common-factor-two-variables', '14ab+21a', ['F01'], 'Both terms include 7a, leaving 2b + 3.', 1, [
    ['Common monomial factor', '7(2ab+3a)'],
    ['Common monomial factor', '7a(2b+3)'],
    ['Common monomial factor', '7b(2a+3)'],
  ]),
  strategy('single-monic-both-negative', 'x^2-13x+42', ['F03'], 'A positive product with a negative sum calls for two negatives. Use −6 and −7.', 0, [
    ['Product and sum', '(x-6)(x-7)'],
    ['Product and sum', '(x+6)(x+7)'],
    ['Perfect square trinomial', '(x-6)^2'],
  ]),
  strategy('two-squared-bases', '25p^2-36q^2', ['F06'], 'Use the square roots 5p and 6q, with opposite signs in the two brackets.', 0, [
    ['Difference of squares', '(5p-6q)(5p+6q)'],
    ['Perfect square', '(5p-6q)^2'],
    ['Difference of squares', '(25p-36q)(25p+36q)'],
  ]),
  strategy('non-monic-square', '16x^2-40x+25', ['F07'], 'The square roots of the outer terms are 4x and 5. The middle term uses the negative product, so write (4x − 5)².', 2, [
    ['Perfect square trinomial', '(4x+5)^2'],
    ['Difference of squares', '(4x-5)(4x+5)'],
    ['Perfect square trinomial', '(4x-5)^2'],
  ]),
  strategy('ac-positive-terms', '6x^2+11x+3', ['F05'], 'The product 18 and sum 11 give the pair 2 and 9. Group into (3x + 1)(2x + 3).', 2, [
    ['AC method', '(3x+3)(2x+1)'],
    ['AC method', '(3x-1)(2x-3)'],
    ['AC method', '(3x+1)(2x+3)'],
  ]),
  strategy('common-factor-no-variable', '6x^2+15', ['F01'], 'The common monomial is the number 3. The remaining sum 2x² + 5 has no real linear factors.', 2, [
    ['Common monomial factor', '3x(2x+5)'],
    ['Difference of squares', '(2x-5)(2x+5)'],
    ['Common factor', '3(2x^2+5)'],
  ]),
  strategy('monic-constant-first', '27+12x+x^2', ['F03'], 'After ordering the terms, use the pair 3 and 9. Their product is 27 and their sum is 12.', 2, [
    ['Perfect square trinomial', '(x+6)^2'],
    ['Product and sum', '(x-3)(x-9)'],
    ['Product and sum', '(x+3)(x+9)'],
  ]),
  strategy('difference-large-square', 'x^2-144', ['F06'], 'Use x² − 12² and factor as (x − 12)(x + 12).', 1, [
    ['Perfect square', '(x-12)^2'],
    ['Difference of squares', '(x-12)(x+12)'],
    ['Difference of squares', '(x-72)(x+72)'],
  ]),
  strategy('perfect-square-two-variables', '25a^2+30ab+9b^2', ['F07'], 'The middle term is twice the product (5a)(3b). All three terms form (5a + 3b)².', 1, [
    ['Difference of squares', '(5a-3b)(5a+3b)'],
    ['Perfect square trinomial', '(5a+3b)^2'],
    ['Perfect square trinomial', '(5a-3b)^2'],
  ]),
  strategy('ac-both-negative-factors', '10x^2-19x+6', ['F05'], 'Split the middle term using −15 and −4. Then 5x(2x − 3) − 2(2x − 3) gives (5x − 2)(2x − 3).', 0, [
    ['AC method', '(5x-2)(2x-3)'],
    ['AC method', '(5x-3)(2x-2)'],
    ['Perfect square trinomial', '(5x-3)^2'],
  ]),
  strategy('group-positive-terms', 'pq+5p+6q+30', ['F04'], 'Group as p(q + 5) + 6(q + 5). Both groups share q + 5, leaving (p + 6)(q + 5).', 2, [
    ['Grouping', '(p+5)(q+6)'],
    ['Grouping', '(p+6)(q+30)'],
    ['Grouping', '(p+6)(q+5)'],
  ]),
  strategy('group-mixed-signs', '2mn-3m+8n-12', ['F04'], 'Group as m(2n − 3) + 4(2n − 3). The factors are m + 4 and 2n − 3.', 0, [
    ['Grouping', '(m+4)(2n-3)'],
    ['Grouping', '(m-4)(2n+3)'],
    ['Grouping', '(2m+4)(n-3)'],
  ]),
  strategy('group-split-middle', '3t^2+9t-2t-6', ['F04'], 'The first group is 3t(t + 3), and the second is −2(t + 3). The complete factorization is (3t − 2)(t + 3).', 1, [
    ['Grouping', '(3t+2)(t-3)'],
    ['Grouping', '(3t-2)(t+3)'],
    ['Grouping', '(3t-6)(t+3)'],
  ]),
], 'Look for a common factor first. Then use the remaining expression’s structure to select a method.')

