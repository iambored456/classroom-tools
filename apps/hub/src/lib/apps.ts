export type StandaloneApp = {
  kind: 'app'
  id: string
  name: string
  description: string
  href: string
  preview: string
  tags: string[]
  accent: string
}

export type HubEntry = StandaloneApp

const baseUrl = import.meta.env.BASE_URL
const withBase = (path: string) => `${baseUrl}${path.replace(/^\/+/, '')}`

export const hubEntries: HubEntry[] = [
  {
    kind: 'app',
    id: 'classroom-wordle',
    name: 'Classroom Wordle',
    description: 'Guess the hidden word.\nAdjust length, attempts, and answers.',
    href: withBase('classroom-wordle/'),
    preview: withBase('images/ClassroomWordle-screenshot.png'),
    tags: ['Dev. Ed.'],
    accent: '#d99500',
  },
  {
    kind: 'app',
    id: 'classroom-connections',
    name: 'Classroom Connections',
    description: 'Find groups of connected words.\nAdjust difficulty, groups, and make your own.',
    href: withBase('classroom-connections/'),
    preview: withBase('images/ClassroomConnections-screenshot.png'),
    tags: ['Dev. Ed.'],
    accent: '#aaa2f5',
  },
  {
    kind: 'app',
    id: 'book-of-questions',
    name: 'Book of Questions',
    description: 'Draw conversation prompts without repeats.\nSave sessions and customize the question library.',
    href: withBase('book-of-questions/'),
    preview: withBase('images/BookOfQuestions-screenshot.png'),
    tags: ['Classroom'],
    accent: '#9f96ef',
  },
  {
    kind: 'app',
    id: 'read-along-highlighter',
    name: 'ReadAlong Highlighter',
    description:
      'Visually highlight text as you read aloud.\nUse arrow keys to navigate words and lines, hold shift to highlight each letter.',
    href: withBase('read-along-highlighter/'),
    preview: withBase('images/ReadAlongHighlighter-screenshot.png'),
    tags: ['Classroom'],
    accent: '#5a9fe0',
  },
  {
    kind: 'app',
    id: 'class-clock',
    name: 'ClassClock',
    description:
      'Visually show your class schedule.\nMultiple designs to show how much time is left this period.',
    href: withBase('class-clock/'),
    preview: withBase('images/ClassClock-screenshot.png'),
    tags: ['Classroom'],
    accent: '#7abd6e',
  },
  {
    kind: 'app',
    id: 'city-navigator',
    name: 'City Routes',
    description: 'Plan routes through a city.\nThen, watch every instruction play out.',
    href: withBase('city-navigator/'),
    preview: withBase('images/CityRoutes-screenshot.png'),
    tags: ['Dev. Ed.'],
    accent: '#1f6659',
  },
  {
    kind: 'app',
    id: 'coordinates',
    name: 'Coordinates',
    description: 'Read plotted points or tap the location of an ordered pair on a -10 to 10 plane.',
    href: withBase('coordinates/'),
    preview: withBase('images/Coordinates-screenshot.png'),
    tags: ['Math'],
    accent: '#1b8d98',
  },
  {
    kind: 'app',
    id: 'simple-compound-interest',
    name: 'Simple & Compound Interest',
    description: 'Compare simple and compound interest with stacked bars for principal and interest over time.',
    href: withBase('simple-compound-interest/'),
    preview: withBase('images/SimpleCompoundInterest-screenshot.png'),
    tags: ['Math'],
    accent: '#b6793f',
  },
  {
    kind: 'app',
    id: 'tax-brackets-marble-visual',
    name: 'Tax Brackets',
    description: 'Watch marbles sort into deductions, tax, and take-home pay buckets.',
    href: withBase('tax-brackets-marble-visual/'),
    preview: withBase('images/TaxBracketsMarbleVisual-screenshot.png'),
    tags: ['Math'],
    accent: '#0c7f7a',
  },
  {
    kind: 'app',
    id: 'launchpad-whack-a-mole',
    name: 'Launchpad Whack-a-Mole',
    description:
      'A rhythm game played on a grid launchpad. Tap the beats as they light up and sharpen your timing instincts.',
    href: withBase('launchpad-whack-a-mole/'),
    preview: withBase('images/LaunchpadWhackaMole-screenshot.png'),
    tags: ['Dev. Ed.'],
    accent: '#e07d5a',
  },
  {
    kind: 'app',
    id: 'class-schedule-widget',
    name: 'Class Schedule Widget',
    description:
      'A detachable classroom schedule with live progress bars, quick editing controls, and a built-in timer panel.',
    href: withBase('class-schedule-widget/'),
    preview: withBase('images/ClassScheduleWidget-screenshot.png'),
    tags: ['Classroom'],
    accent: '#f19d5e',
  },
  {
    kind: 'app',
    id: 'fish-visualizer',
    name: 'Fish Visualizer',
    description:
      'An interactive prerequisite map of FISH skills. Explore dependencies, filter skills, and save your layout.',
    href: withBase('fish-visualizer/'),
    preview: withBase('images/FishVisualizer-screenshot.png'),
    tags: ['Dev. Ed.'],
    accent: '#4ea6b9',
  },
  {
    kind: 'app',
    id: 'launchpad-controller',
    name: 'Launchpad Controller',
    description:
      'Visualize Launchpad X pad presses in real time and hear each note played as a sine wave tone.',
    href: withBase('launchpad-controller/'),
    preview: withBase('images/LaunchpadController-screenshot.png'),
    tags: ['Classroom'],
    accent: '#9d65e0',
  },
  {
    kind: 'app',
    id: 'oklch-visualizer',
    name: 'OKLCH Visualizer',
    description:
      'Generate equidistant palettes, inspect gamut-safe chroma paths, and map pitch ranges onto color spirals.',
    href: withBase('oklch-visualizer/'),
    preview: withBase('images/OKLCHVisualizer-screenshot.png'),
    tags: ['Classroom'],
    accent: '#4cc6ff',
  },
  {
    kind: 'app',
    id: 'rugby-play-visualizer',
    name: 'Rugby Play Visualizer',
    description:
      'Animate attacking rugby patterns with numbered jerseys, pass paths, branch choices, and mirrored field symmetry.',
    href: withBase('rugby-play-visualizer/'),
    preview: withBase('images/RugbyPlayVisualizer-screenshot.png'),
    tags: ['Sports'],
    accent: '#4c9855',
  },
]
