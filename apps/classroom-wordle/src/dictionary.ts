import wordList from './data/english-words.txt?raw'

// Bundled locally so checking a guess never depends on a network request.
const recognizedWords = new Set(wordList.trim().split(/\s+/))

export const isRecognizedWord = (word: string): boolean =>
  recognizedWords.has(word.toLowerCase())
