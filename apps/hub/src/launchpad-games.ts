import { mount } from 'svelte'
import GameCollection from './GameCollection.svelte'

const games = [
  { id: 'whack-a-mole', name: 'Whack-a-Mole', preview: 'WhackaMole', color: '#f1cbbd', players: '1 player', description: 'Hit each lit pad as fast as you can before time runs out.' },
  { id: 'snake', name: 'Snake', preview: 'Snake', color: '#e3efb9', players: '1 player', description: 'Collect food without hitting the walls or your own tail.' },
  { id: 'reversi', name: 'Reversi', preview: 'Reversi', color: '#c2e8d8', players: '1–2 players', description: 'Trap and flip your opponent’s pieces to control the board.' },
  { id: 'paint-war', name: 'Paint War', preview: 'PaintWar', color: '#f3c5d9', players: '1–2 players', description: 'Tap pads to claim more squares than your opponent.' },
  { id: 'finger-twister', name: 'Finger Twister', preview: 'FingerTwister', color: '#e5e8b8', players: '1–2 players', description: 'Hold each new lit pad without letting go of the others.' },
]


mount(GameCollection, {
  target: document.getElementById('app')!,
  props: {
    title: 'Launchpad Games',
    themeKey: 'launchpad-games.dark-mode',
    games: games.map((game) => ({
      ...game,
      href: `launchpad-${game.id}/`,
      preview: `images/Launchpad${game.preview}-screenshot.png`,
    })),
  },
})
