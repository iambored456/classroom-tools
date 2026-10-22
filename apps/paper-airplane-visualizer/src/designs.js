import * as dart from './model.js'
import * as arrowhead from './arrowhead.js'
import * as raven from './raven.js'

export const designs = [
  { ...dart, id: 'basic-dart', name: 'Basic Dart', icon: 'plane', guideUrl: 'https://www.foldnfly.com/1.html', description: 'A classic pointed dart', endTime: 5, foldCount: 8 },
  { ...arrowhead, id: 'arrowhead', name: 'Arrowhead', icon: 'arrowhead', guideUrl: 'https://www.foldnfly.com/58.html', description: 'A tucked nose and broad wings', endTime: 10, foldCount: 13 },
  { ...raven, id: 'raven', name: 'Raven', icon: 'raven', guideUrl: 'https://www.foldnfly.com/50.html', description: 'A locking nose tab and swept wings', endTime: 8, foldCount: 12 },
]
