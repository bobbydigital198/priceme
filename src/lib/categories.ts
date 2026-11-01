// Product categories for the Products section, and the rules that sort products into them:
// Open Food Facts' own category tags first, then words in the product's name (French and English).

export const CATEGORIES = [
  // Food and drink
  { id: 'fruit-veg', name: 'Fruit & vegetables', group: 'food' },
  { id: 'bakery', name: 'Bread & bakery', group: 'food' },
  { id: 'meat', name: 'Meat & poultry', group: 'food' },
  { id: 'fish', name: 'Fish & seafood', group: 'food' },
  { id: 'dairy', name: 'Milk, butter & eggs', group: 'food' },
  { id: 'yoghurt', name: 'Yoghurts & desserts', group: 'food' },
  { id: 'cheese', name: 'Cheese', group: 'food' },
  { id: 'ready-meals', name: 'Ready meals & pizza', group: 'food' },
  { id: 'frozen', name: 'Frozen food', group: 'food' },
  { id: 'pasta', name: 'Pasta & noodles', group: 'food' },
  { id: 'rice-grains', name: 'Rice, grains & pulses', group: 'food' },
  { id: 'tinned', name: 'Tins, jars & soups', group: 'food' },
  { id: 'condiments', name: 'Sauces & condiments', group: 'food' },
  { id: 'oils-spices', name: 'Oils, herbs & spices', group: 'food' },
  { id: 'baking', name: 'Flour, sugar & baking', group: 'food' },
  { id: 'breakfast', name: 'Cereals & breakfast', group: 'food' },
  { id: 'spreads', name: 'Jams, honey & spreads', group: 'food' },
  { id: 'biscuits', name: 'Biscuits & cakes', group: 'food' },
  { id: 'sweets', name: 'Chocolate & sweets', group: 'food' },
  { id: 'snacks', name: 'Crisps, nuts & snacks', group: 'food' },
  { id: 'drinks', name: 'Beverages', group: 'food' },
  { id: 'water', name: 'Water', group: 'food' },
  { id: 'coffee-tea', name: 'Coffee & tea', group: 'food' },
  { id: 'alcohol', name: 'Beer, wine & spirits', group: 'food' },
  { id: 'baby', name: 'Baby', group: 'food' },
  { id: 'pets', name: 'Pet food', group: 'food' },
  // Household and personal
  { id: 'paper', name: 'Toilet paper & kitchen roll', group: 'household' },
  { id: 'cleaning', name: 'Cleaning & laundry', group: 'household' },
  { id: 'toiletries', name: 'Soap & toiletries', group: 'household' },
  { id: 'health', name: 'Health & pharmacy', group: 'household' },
  { id: 'household', name: 'Other household', group: 'household' },
  { id: 'other', name: 'Other', group: 'household' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

export const categoryName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!.name

// Open Food Facts tags, most specific first: milk is tagged as a drink too, so dairy is checked before drinks.
const TAG_RULES: [CategoryId, string[]][] = [
  ['alcohol', ['alcoholic-beverages', 'beers', 'wines', 'spirits', 'ciders']],
  ['water', ['waters', 'mineral-waters', 'spring-waters']],
  ['coffee-tea', ['coffees', 'teas', 'herbal-teas', 'hot-beverages', 'instant-beverages']],
  ['baby', ['baby-foods', 'baby-milks']],
  ['pets', ['pet-food', 'dog-food', 'cat-food']],
  ['frozen', ['frozen-foods']],
  ['cheese', ['cheeses']],
  ['yoghurt', ['yogurts', 'dairy-desserts', 'desserts']],
  ['dairy', ['milks', 'plant-milks', 'milk-substitutes', 'butters', 'creams', 'eggs', 'dairies']],
  ['drinks', ['beverages', 'sodas', 'energy-drinks', 'fruit-juices', 'carbonated-drinks', 'iced-teas', 'syrups']],
  ['spreads', ['sweet-spreads', 'jams', 'honeys', 'hazelnut-spreads', 'spreads']],
  ['breakfast', ['breakfast-cereals', 'mueslis']],
  ['pasta', ['pastas', 'dry-pastas', 'noodles']],
  ['rice-grains', ['rices', 'cereal-grains', 'legumes', 'pulses', 'semolinas', 'couscous']],
  ['condiments', ['condiments', 'sauces', 'ketchup', 'mayonnaises', 'mustards', 'vinegars', 'salad-dressings']],
  ['oils-spices', ['vegetable-oils', 'olive-oils', 'fats', 'spices', 'salts', 'herbs', 'seasonings', 'broths']],
  ['baking', ['flours', 'sugars', 'baking-aids', 'yeasts']],
  ['biscuits', ['biscuits', 'cakes', 'biscuits-and-cakes']],
  ['sweets', ['chocolates', 'confectioneries', 'candies', 'chewing-gum']],
  ['snacks', ['salty-snacks', 'crisps', 'chips', 'nuts', 'appetizers', 'popcorn', 'cereal-bars', 'crackers']],
  ['bakery', ['breads', 'viennoiseries', 'pastries']],
  ['ready-meals', ['meals', 'pizzas', 'sandwiches', 'prepared-salads', 'quiches']],
  ['meat', ['meats', 'poultries', 'hams', 'sausages', 'prepared-meats']],
  ['fish', ['fishes', 'seafood']],
  ['tinned', ['canned-foods', 'soups', 'canned-vegetables']],
  ['fruit-veg', ['fresh-fruits', 'fresh-vegetables', 'fruits', 'vegetables', 'compotes']],
]

// Words in product names (accents removed), checked in this order. Bakery comes before sweets
// for "pain au chocolat", and sweets before dairy for "chocolat au lait".
const WORD_RULES: [CategoryId, string[]][] = [
  ['paper', ['papier toilette', 'toilet paper', 'toilet tissue', 'essuie-tout', 'essuie tout', 'sopalin', 'kitchen roll', 'mouchoir', 'tissues']],
  ['cleaning', ['lessive', 'laundry', 'adoucissant', 'vaisselle', 'dishwasher', 'nettoyant', 'detergent', 'javel', 'bleach', 'eponge', 'sponge', 'sac poubelle', 'sacs poubelle', 'bin bag', 'desodorisant']],
  ['toiletries', ['savon', 'soap', 'gel douche', 'shower gel', 'shampooing', 'shampoo', 'apres-shampooing', 'conditioner', 'dentifrice', 'toothpaste', 'brosse a dents', 'toothbrush', 'deodorant', 'rasoir', 'razor', 'coton', 'cotton buds', 'creme hydratante']],
  ['health', ['paracetamol', 'doliprane', 'ibuprofene', 'pansement', 'plasters', 'vitamine', 'vitamin']],
  ['pets', ['croquette', 'cat food', 'dog food', 'whiskas', 'felix', 'pedigree', 'friskies', 'sheba', 'purina']],
  ['baby', ['couche', 'nappies', 'nappy', 'lingettes bebe', 'petit pot']],
  ['alcohol', ['biere', 'beer', 'vin', 'wine', 'champagne', 'cidre', 'cider', 'whisky', 'vodka', 'rhum', 'rum', 'gin', 'aperitif']],
  ['water', ['eau minerale', 'eau de source', 'eau gazeuse', 'water', 'evian', 'volvic', 'cristaline', 'vittel', 'perrier', 'badoit', 'pellegrino']],
  ['coffee-tea', ['cafe', 'coffee', 'expresso', 'espresso', 'nespresso', 'capsule', 'the vert', 'the noir', 'green tea', 'tea', 'infusion', 'tisane']],
  ['drinks', ['red bull', 'redbull', 'monster', 'coca', 'cola', 'pepsi', 'fanta', 'sprite', 'orangina', 'oasis', 'schweppes', 'ice tea', 'soda', 'limonade', 'lemonade', 'jus', 'juice', 'nectar', 'sirop', 'energy drink', 'boisson']],
  ['yoghurt', ['yaourt', 'yogourt', 'yoghurt', 'yogurt', 'fromage blanc', 'skyr', 'creme dessert', 'mousse au chocolat', 'petit suisse']],
  ['cheese', ['fromage', 'cheese', 'emmental', 'comte', 'camembert', 'brie', 'mozzarella', 'chevre', 'parmesan', 'gruyere', 'roquefort', 'raclette', 'feta']],
  ['frozen', ['surgele', 'frozen', 'glace', 'ice cream', 'sorbet']],
  ['ready-meals', ['pizza', 'sandwich', 'quiche', 'lasagne', 'plat cuisine', 'salade composee', 'wrap']],
  ['pasta', ['pates', 'pasta', 'penne', 'spaghetti', 'fusilli', 'tagliatelle', 'macaroni', 'coquillettes', 'farfalle', 'linguine', 'rigatoni', 'noodles', 'nouilles', 'ravioli']],
  ['rice-grains', ['riz', 'rice', 'quinoa', 'lentilles', 'lentils', 'pois chiches', 'chickpeas', 'semoule', 'couscous', 'boulgour']],
  ['spreads', ['confiture', 'jam', 'miel', 'honey', 'nutella', 'pate a tartiner', 'beurre de cacahuete', 'peanut butter']],
  ['breakfast', ['cereales', 'cereals', 'muesli', 'granola', 'flocons d\'avoine', 'porridge']],
  ['biscuits', ['biscuit', 'cookie', 'gateau', 'madeleine', 'brownie', 'cake', 'gaufre', 'galette']],
  ['bakery', ['pain', 'bread', 'baguette', 'brioche', 'croissant', 'viennoiserie', 'tortilla']],
  ['sweets', ['chocolat', 'chocolate', 'bonbon', 'candy', 'sweets', 'haribo', 'kinder', 'chewing-gum', 'confiserie']],
  ['snacks', ['chips', 'crisps', 'pringles', 'cacahuete', 'peanuts', 'noix', 'nuts', 'amande', 'popcorn', 'crackers', 'apero']],
  ['dairy', ['lait', 'milk', 'beurre', 'butter', 'creme fraiche', 'oeuf', 'eggs', 'egg']],
  ['condiments', ['ketchup', 'mayonnaise', 'moutarde', 'mustard', 'vinaigre', 'vinegar', 'vinaigrette', 'sauce', 'pesto', 'harissa']],
  ['oils-spices', ['huile', 'oil', 'sel', 'salt', 'poivre', 'pepper', 'epice', 'spice', 'herbes', 'bouillon']],
  ['baking', ['farine', 'flour', 'sucre', 'sugar', 'levure', 'yeast']],
  ['meat', ['jambon', 'ham', 'poulet', 'chicken', 'boeuf', 'beef', 'porc', 'pork', 'saucisse', 'sausage', 'lardons', 'steak', 'dinde', 'turkey', 'bacon', 'saucisson', 'viande']],
  ['fish', ['thon', 'tuna', 'saumon', 'salmon', 'sardine', 'cabillaud', 'crevette', 'prawn', 'poisson', 'fish', 'surimi']],
  ['tinned', ['conserve', 'soupe', 'soup', 'veloute']],
  ['fruit-veg', ['pomme', 'apple', 'banane', 'banana', 'tomate', 'tomato', 'salade', 'carotte', 'carrot', 'oignon', 'onion', 'avocat', 'citron', 'lemon', 'fraise', 'poire', 'raisin', 'courgette', 'potato', 'legume', 'fruit']],
]

const simplify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const WORD_PATTERNS = WORD_RULES.map(([id, words]): [CategoryId, RegExp] => [
  id,
  // Whole words, allowing plurals: "pates", "biscuits", "gateaux".
  new RegExp(`(^|[^a-z0-9])(${words.map(escape).join('|')})(s|x)?(?![a-z0-9])`),
])

export type Categorisable = {
  name: string
  brand?: string
  // Chosen by you on the product page; always wins.
  category?: CategoryId
  categoryTags?: string[]
  lookupSource?: 'food' | 'beauty' | 'products'
}

export function categorise(product: Categorisable): CategoryId {
  if (product.category) return product.category

  const tags = new Set((product.categoryTags ?? []).map((t) => t.replace(/^en:/, '')))
  for (const [id, wanted] of TAG_RULES) if (wanted.some((t) => tags.has(t))) return id

  const text = simplify(`${product.name} ${product.brand ?? ''}`)
  for (const [id, pattern] of WORD_PATTERNS) if (pattern.test(text)) return id

  if (product.lookupSource === 'beauty') return 'toiletries'
  if (product.lookupSource === 'products') return 'household'
  return 'other'
}
