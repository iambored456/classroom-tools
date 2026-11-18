import { mount } from 'svelte'
import GameCollection from './GameCollection.svelte'

mount(GameCollection, {
  target: document.getElementById('app')!,
  props: {
    title: 'Word Games',
    themeKey: 'word-games.dark-mode',
    games: [
      {
        id: 'classroom-wordle',
        name: 'Classroom Wordle',
        href: 'classroom-wordle/',
        preview: 'images/ClassroomWordle-screenshot.png',
        color: '#f2dba5',
        description: 'Guess the hidden word. Choose the difficulty or set your own answer.',
      },
      {
        id: 'classroom-connections',
        name: 'Classroom Connections',
        href: 'classroom-connections/',
        preview: 'images/ClassroomConnections-screenshot.png',
        color: '#dedafa',
        description: 'Sort 16 words into four groups. Choose the difficulty or create your own puzzle.',
      },
    ],
  },
})
