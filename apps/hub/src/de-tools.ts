import { mount } from 'svelte'
import GameCollection from './GameCollection.svelte'

mount(GameCollection, {
  target: document.getElementById('app')!,
  props: {
    title: 'D.E. Tools',
    themeKey: 'de-tools.dark-mode',
    games: [
      {
        id: 'paper-airplane-visualizer',
        name: 'Paper Airplanes',
        href: 'paper-airplane-visualizer/',
        preview: 'images/PaperAirplaneVisualizer-screenshot.png',
        color: '#d5eadc',
        description: 'Animated instructions to fold paper airplanes.',
      },
      {
        id: 'city-navigator',
        name: 'CityRoutes',
        href: 'city-navigator/',
        preview: 'images/CityRoutes-screenshot.png',
        color: '#d7ebf0',
        description: 'Use your orientation skills to plan a car trip, and see if you can lead the car to its destination!',
      },
    ],
  },
})
