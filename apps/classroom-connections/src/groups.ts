import type { Difficulty, WordGroup } from './types'

type StarterGroup = {
  title: string
  words: [string, string, string, string]
  difficulty: Difficulty
}

const STARTER_GROUPS: StarterGroup[] = [
  { title: 'Bugs', words: ['Ladybug', 'Ant', 'Beetle', 'Firefly'], difficulty: 'easy' },
  { title: 'Tools', words: ['Hammer', 'Screwdriver', 'Drill', 'Saw'], difficulty: 'easy' },
  { title: 'Fruits', words: ['Apple', 'Banana', 'Orange', 'Pear'], difficulty: 'easy' },
  { title: 'Pets', words: ['Dog', 'Cat', 'Goldfish', 'Hamster'], difficulty: 'easy' },
  { title: 'Weather', words: ['Rain', 'Snow', 'Wind', 'Hail'], difficulty: 'easy' },
  { title: 'Shapes', words: ['Circle', 'Square', 'Triangle', 'Rectangle'], difficulty: 'easy' },
  {
    title: 'School supplies',
    words: ['Pencil', 'Eraser', 'Ruler', 'Notebook'],
    difficulty: 'easy',
  },
  { title: 'Farm animals', words: ['Cow', 'Pig', 'Sheep', 'Goat'], difficulty: 'easy' },
  { title: 'Colours', words: ['Red', 'Blue', 'Green', 'Yellow'], difficulty: 'easy' },
  { title: 'Things in the sky', words: ['Sun', 'Moon', 'Cloud', 'Star'], difficulty: 'easy' },
  { title: 'Body joints', words: ['Elbow', 'Knee', 'Ankle', 'Wrist'], difficulty: 'easy' },
  {
    title: 'Breakfast foods',
    words: ['Cereal', 'Toast', 'Waffles', 'Oatmeal'],
    difficulty: 'easy',
  },

  {
    title: 'Ocean animals',
    words: ['Dolphin', 'Shark', 'Octopus', 'Whale'],
    difficulty: 'medium',
  },
  {
    title: 'Musical instruments',
    words: ['Piano', 'Violin', 'Trumpet', 'Drums'],
    difficulty: 'medium',
  },
  {
    title: 'Team sports',
    words: ['Soccer', 'Basketball', 'Hockey', 'Baseball'],
    difficulty: 'medium',
  },
  { title: 'Parts of a plant', words: ['Roots', 'Stem', 'Leaves', 'Flower'], difficulty: 'medium' },
  {
    title: 'Things that fly',
    words: ['Airplane', 'Kite', 'Helicopter', 'Balloon'],
    difficulty: 'medium',
  },
  {
    title: 'Kitchen tools',
    words: ['Whisk', 'Spatula', 'Ladle', 'Tongs'],
    difficulty: 'medium',
  },
  {
    title: 'Winter clothing',
    words: ['Mittens', 'Scarf', 'Boots', 'Toque'],
    difficulty: 'medium',
  },
  {
    title: 'Ways to travel',
    words: ['Bus', 'Train', 'Bicycle', 'Subway'],
    difficulty: 'medium',
  },
  { title: 'Birds', words: ['Robin', 'Eagle', 'Owl', 'Penguin'], difficulty: 'medium' },
  { title: 'Materials', words: ['Wood', 'Metal', 'Glass', 'Plastic'], difficulty: 'medium' },
  {
    title: 'At the library',
    words: ['Books', 'Librarian', 'Shelves', 'Checkout'],
    difficulty: 'medium',
  },
  {
    title: 'Camping gear',
    words: ['Tent', 'Sleeping Bag', 'Lantern', 'Compass'],
    difficulty: 'medium',
  },

  { title: '___ball', words: ['Basket', 'Foot', 'Snow', 'Volley'], difficulty: 'hard' },
  {
    title: 'Things with keys',
    words: ['Lock', 'Keyboard', 'Typewriter', 'Calculator'],
    difficulty: 'hard',
  },
  { title: 'Can be cracked', words: ['Code', 'Joke', 'Egg', 'Shell'], difficulty: 'hard' },
  { title: 'Rhyme with “light”', words: ['Bright', 'Night', 'Sight', 'Tight'], difficulty: 'hard' },
  {
    title: 'Things with wheels',
    words: ['Wagon', 'Scooter', 'Skateboard', 'Stroller'],
    difficulty: 'hard',
  },
  { title: 'Things with rings', words: ['Saturn', 'Tree', 'Telephone', 'Binder'], difficulty: 'hard' },
  { title: 'Animal homes', words: ['Den', 'Nest', 'Hive', 'Burrow'], difficulty: 'hard' },
  {
    title: 'Begin with a silent K',
    words: ['Knife', 'Knight', 'Knot', 'Knack'],
    difficulty: 'hard',
  },
  { title: 'Parts of a book', words: ['Cover', 'Spine', 'Page', 'Chapter'], difficulty: 'hard' },
  {
    title: 'Made of ice',
    words: ['Igloo', 'Glacier', 'Iceberg', 'Icicle'],
    difficulty: 'hard',
  },
  {
    title: 'Light sources',
    words: ['Candle', 'Lamp', 'Torch', 'Lighthouse'],
    difficulty: 'hard',
  },
  {
    title: 'Playground equipment',
    words: ['Swing', 'Slide', 'Seesaw', 'Monkey Bars'],
    difficulty: 'hard',
  },

  { title: 'Add “room”', words: ['Bed', 'Class', 'Mush', 'Bath'], difficulty: 'tricky' },
  { title: 'Add “board”', words: ['Chalk', 'Surf', 'Skate', 'Key'], difficulty: 'tricky' },
  { title: 'Start with “car”', words: ['Pet', 'Ton', 'Go', 'Nation'], difficulty: 'tricky' },
  { title: 'Come after “tooth”', words: ['Brush', 'Paste', 'Pick', 'Ache'], difficulty: 'tricky' },
  {
    title: 'Sound like letters',
    words: ['Bee', 'Eye', 'Jay', 'Queue'],
    difficulty: 'tricky',
  },
  { title: 'End with “light”', words: ['Day', 'High', 'Spot', 'Flash'], difficulty: 'tricky' },
  { title: '___ break', words: ['Lunch', 'Spring', 'Coffee', 'Water'], difficulty: 'tricky' },
  {
    title: 'Parts of a web browser',
    words: ['Tab', 'Window', 'Bookmark', 'History'],
    difficulty: 'tricky',
  },
  { title: 'Come after “book”', words: ['Case', 'Mark', 'Shelf', 'Worm'], difficulty: 'tricky' },
  { title: '___fish', words: ['Star', 'Jelly', 'Sword', 'Clown'], difficulty: 'tricky' },
  { title: '___berry', words: ['Straw', 'Blue', 'Rasp', 'Black'], difficulty: 'tricky' },
  { title: 'Kinds of coats', words: ['Rain', 'Winter', 'Lab', 'Pea'], difficulty: 'tricky' },

  { title: 'Vegetables', words: ['Carrot', 'Peas', 'Corn', 'Broccoli'], difficulty: 'easy' },
  { title: 'Clothing', words: ['Shirt', 'Pants', 'Socks', 'Jacket'], difficulty: 'easy' },
  { title: 'Furniture', words: ['Chair', 'Table', 'Couch', 'Bed'], difficulty: 'easy' },
  { title: 'Vehicles', words: ['Car', 'Truck', 'Motorcycle', 'Van'], difficulty: 'easy' },
  { title: 'Drinks', words: ['Water', 'Milk', 'Juice', 'Lemonade'], difficulty: 'easy' },
  { title: 'Zoo animals', words: ['Lion', 'Zebra', 'Giraffe', 'Elephant'], difficulty: 'easy' },
  {
    title: 'Rooms in a home',
    words: ['Kitchen', 'Bedroom', 'Bathroom', 'Living Room'],
    difficulty: 'easy',
  },
  { title: 'Seasons', words: ['Spring', 'Summer', 'Fall', 'Winter'], difficulty: 'easy' },
  { title: 'Desserts', words: ['Cake', 'Cookie', 'Pie', 'Ice Cream'], difficulty: 'easy' },
  {
    title: 'Community helpers',
    words: ['Doctor', 'Firefighter', 'Police Officer', 'Mail Carrier'],
    difficulty: 'easy',
  },
  {
    title: 'Bathroom items',
    words: ['Soap', 'Towel', 'Toothbrush', 'Shampoo'],
    difficulty: 'easy',
  },
  { title: 'Things at a park', words: ['Bench', 'Path', 'Pond', 'Fountain'], difficulty: 'easy' },

  { title: 'Landforms', words: ['Mountain', 'Valley', 'Island', 'Desert'], difficulty: 'medium' },
  { title: 'Reptiles', words: ['Snake', 'Lizard', 'Turtle', 'Crocodile'], difficulty: 'medium' },
  { title: 'Containers', words: ['Box', 'Bottle', 'Jar', 'Carton'], difficulty: 'medium' },
  {
    title: 'Parts of a car',
    words: ['Steering Wheel', 'Seat Belt', 'Tire', 'Engine'],
    difficulty: 'medium',
  },
  {
    title: 'Types of homes',
    words: ['Apartment', 'Cabin', 'Cottage', 'Trailer'],
    difficulty: 'medium',
  },
  {
    title: 'At the airport',
    words: ['Passport', 'Suitcase', 'Runway', 'Gate'],
    difficulty: 'medium',
  },
  {
    title: 'Ways to communicate',
    words: ['Email', 'Letter', 'Phone Call', 'Video Chat'],
    difficulty: 'medium',
  },
  {
    title: 'Garden tools',
    words: ['Shovel', 'Rake', 'Hose', 'Wheelbarrow'],
    difficulty: 'medium',
  },
  {
    title: 'Types of books',
    words: ['Dictionary', 'Cookbook', 'Atlas', 'Biography'],
    difficulty: 'medium',
  },
  {
    title: 'Measuring tools',
    words: ['Thermometer', 'Scale', 'Measuring Cup', 'Stopwatch'],
    difficulty: 'medium',
  },
  {
    title: 'At the grocery store',
    words: ['Cart', 'Aisle', 'Cashier', 'Receipt'],
    difficulty: 'medium',
  },
  {
    title: 'Ways to make electricity',
    words: ['Solar Panel', 'Wind Turbine', 'Dam', 'Generator'],
    difficulty: 'medium',
  },

  { title: 'Things with teeth', words: ['Comb', 'Zipper', 'Gear', 'Key'], difficulty: 'hard' },
  {
    title: 'Things with branches',
    words: ['Bank', 'Government', 'River', 'Family'],
    difficulty: 'hard',
  },
  { title: 'Things with scales', words: ['Fish', 'Snake', 'Piano', 'Map'], difficulty: 'hard' },
  {
    title: 'Things with faces',
    words: ['Clock', 'Coin', 'Mountain', 'Person'],
    difficulty: 'hard',
  },
  { title: 'Things with tails', words: ['Comet', 'Kite', 'Fox', 'Airplane'], difficulty: 'hard' },
  {
    title: 'Things that can run',
    words: ['Water', 'Engine', 'Program', 'Athlete'],
    difficulty: 'hard',
  },
  {
    title: 'Things that can be folded',
    words: ['Paper', 'Towel', 'Chair', 'Omelette'],
    difficulty: 'hard',
  },
  {
    title: 'Things with shells',
    words: ['Turtle', 'Snail', 'Walnut', 'Peanut'],
    difficulty: 'hard',
  },
  { title: 'Kinds of waves', words: ['Ocean', 'Sound', 'Light', 'Radio'], difficulty: 'hard' },
  {
    title: 'Things that come in pairs',
    words: ['Socks', 'Shoes', 'Earrings', 'Chopsticks'],
    difficulty: 'hard',
  },
  { title: 'Can be struck', words: ['Match', 'Bell', 'Pose', 'Deal'], difficulty: 'hard' },
  {
    title: 'Things with strings',
    words: ['Guitar', 'Puppet', 'Hoodie', 'Yo-Yo'],
    difficulty: 'hard',
  },

  { title: 'Add “house”', words: ['Bird', 'Dog', 'Green', 'Light'], difficulty: 'tricky' },
  { title: 'Come after “door”', words: ['Bell', 'Knob', 'Mat', 'Way'], difficulty: 'tricky' },
  { title: 'Come after “sun”', words: ['Flower', 'Rise', 'Set', 'Screen'], difficulty: 'tricky' },
  { title: 'Add “ship”', words: ['Friend', 'Leader', 'Owner', 'Champion'], difficulty: 'tricky' },
  { title: 'Sound like numbers', words: ['Won', 'Too', 'Fore', 'Ate'], difficulty: 'tricky' },
  { title: 'Palindromes', words: ['Level', 'Radar', 'Civic', 'Kayak'], difficulty: 'tricky' },
  {
    title: 'Begin with a silent W',
    words: ['Write', 'Wrist', 'Wrong', 'Wrap'],
    difficulty: 'tricky',
  },
  { title: 'Come after “space”', words: ['Ship', 'Suit', 'Bar', 'Station'], difficulty: 'tricky' },
  { title: '___master', words: ['Head', 'Post', 'Quiz', 'Ring'], difficulty: 'tricky' },
  { title: 'Come after “paper”', words: ['Clip', 'Cut', 'Back', 'Work'], difficulty: 'tricky' },
  {
    title: 'Words with two pronunciations',
    words: ['Bow', 'Lead', 'Wind', 'Row'],
    difficulty: 'tricky',
  },
  {
    title: 'Animals that are also verbs',
    words: ['Duck', 'Crane', 'Seal', 'Bear'],
    difficulty: 'tricky',
  },
]

const toId = (title: string, index: number) =>
  `starter-${index + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`

export const createStarterGroups = (): WordGroup[] =>
  STARTER_GROUPS.map((group, index) => ({
    ...group,
    id: toId(group.title, index),
    words: [...group.words],
    enabled: true,
    custom: false,
  }))
