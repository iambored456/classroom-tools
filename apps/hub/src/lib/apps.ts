export type AppCard = {
  id: string
  name: string
  description: string
  href: string
  preview: string
  tags: string[]
  accent: string
}

const baseUrl = import.meta.env.BASE_URL
const withBase = (path: string) => `${baseUrl}${path.replace(/^\/+/, '')}`

export const appCards: AppCard[] = [
  {
    id: 'launchpad-whack-a-mole',
    name: 'Launchpad Whack-a-Mole',
    description:
      'A rhythm game played on a grid launchpad. Tap the beats as they light up and sharpen your timing instincts.',
    href: withBase('launchpad-whack-a-mole/'),
    preview: withBase('images/LaunchpadWhackaMole-screenshot.png'),
    tags: ['Rhythm', 'Game', 'Ear Training'],
    accent: '#e07d5a',
  },
  {
    id: 'read-along-highlighter',
    name: 'ReadAlong Highlighter',
    description:
      'Word-by-word text highlighter for reading aloud. Navigate with arrow keys and customize colors for any passage.',
    href: withBase('read-along-highlighter/'),
    preview: withBase('images/ReadAlongHighlighter-screenshot.png'),
    tags: ['Reading', 'Fluency', 'Classroom'],
    accent: '#5a9fe0',
  },
  {
    id: 'class-clock',
    name: 'ClassClock',
    description: 'A simple, distraction-free clock and timer designed for classroom display.',
    href: withBase('class-clock/'),
    preview: withBase('images/ClassClock-screenshot.png'),
    tags: ['Timer', 'Clock', 'Classroom'],
    accent: '#7abd6e',
  },
  {
    id: 'class-schedule-widget',
    name: 'Class Schedule Widget',
    description:
      'A detachable classroom schedule with live progress bars, quick editing controls, and a built-in timer panel.',
    href: withBase('class-schedule-widget/'),
    preview: withBase('images/ClassScheduleWidget-screenshot.png'),
    tags: ['Schedule', 'Timer', 'Classroom'],
    accent: '#f19d5e',
  },
  {
    id: 'fish-visualizer',
    name: 'Fish Visualizer',
    description:
      'An interactive prerequisite map of FISH skills. Explore dependencies, filter skills, and save your layout.',
    href: withBase('fish-visualizer/'),
    preview: withBase('images/FishVisualizer-screenshot.png'),
    tags: ['Visualization', 'Curriculum', 'Planning'],
    accent: '#4ea6b9',
  },
  {
    id: 'launchpad-controller',
    name: 'Launchpad Controller',
    description:
      'Visualize Launchpad X pad presses in real time and hear each note played as a sine wave tone.',
    href: withBase('launchpad-controller/'),
    preview: withBase('images/LaunchpadController-screenshot.png'),
    tags: ['MIDI', 'Music', 'Visualization'],
    accent: '#9d65e0',
  },
  {
    id: 'oklch-visualizer',
    name: 'OKLCH Visualizer',
    description:
      'Generate equidistant palettes, inspect gamut-safe chroma paths, and map pitch ranges onto color spirals.',
    href: withBase('oklch-visualizer/'),
    preview: withBase('images/OKLCHVisualizer-screenshot.png'),
    tags: ['Color', 'Music', 'Visualization'],
    accent: '#4cc6ff',
  },
  {
    id: 'tax-brackets-marble-visual',
    name: 'Tax Brackets - Marble Visual',
    description:
      'A progressive-tax animation with marbles, bracket buckets, and a second pass that drops only the taxed share into a shared trough.',
    href: withBase('tax-brackets-marble-visual/'),
    preview: withBase('images/TaxBracketsMarbleVisual-screenshot.png'),
    tags: ['Math', 'Tax', 'Visualization'],
    accent: '#0c7f7a',
  },
]
