export const question34 = {
  id: 34,
  title: 'Sum Square',
  digits: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  slotCount: 8,
  instruction: 'Use each digit only once. Create four equations that equal the same answer.',
  lines: [
    { name: 'top', slots: [0, 1, 2] },
    { name: 'right', slots: [2, 4, 7] },
    { name: 'bottom', slots: [5, 6, 7] },
    { name: 'left', slots: [0, 3, 5] },
  ],
  layout: 'sum-square',
}
