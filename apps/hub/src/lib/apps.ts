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
]
