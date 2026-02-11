// Stripe Price and Product IDs
export const STRIPE_PRICES = {
  // Subscriptions
  reader_monthly: 'price_1SxTJ7Bpr5D9J49iz46PdAwD',
  reader_yearly: 'price_1SxTJ8Bpr5D9J49icUdNbocI',
  inner_circle_monthly: 'price_1SxTJABpr5D9J49ic6QJ1cTi',
  inner_circle_yearly: 'price_1SxTJBBpr5D9J49iouunXDJM',
  // One-time purchases
  book_digital: 'price_1SxTJ4Bpr5D9J49iD9iM24gB',
  book_extras: 'price_1SxTJ5Bpr5D9J49ikH832etC',
} as const;

export const STRIPE_PRODUCTS = {
  reader_monthly: 'prod_TvJx5HhCyXkWAr',
  reader_yearly: 'prod_TvJxottyyySRUP',
  inner_circle_monthly: 'prod_TvJxFlV6KlCq2d',
  inner_circle_yearly: 'prod_TvJxn9X2qA1LVl',
  book_digital: 'prod_TvJwW2QARGGKBZ',
  book_extras: 'prod_TvJwb7z00E14bp',
} as const;

export type PriceType = keyof typeof STRIPE_PRICES;

export const PRICING_TIERS = {
  reader: {
    name: 'Mythos Reader',
    monthly: {
      price: 6.99,
      priceType: 'reader_monthly' as PriceType,
    },
    yearly: {
      price: 69,
      priceType: 'reader_yearly' as PriceType,
    },
    features: [
      'Access to all released books while subscribed',
      'Early access to new chapters or books',
      'Ambient audio and immersive reader features',
      'Member-only updates and releases',
    ],
  },
  inner_circle: {
    name: 'Mythos Inner Circle',
    monthly: {
      price: 14.99,
      priceType: 'inner_circle_monthly' as PriceType,
    },
    yearly: {
      price: 149,
      priceType: 'inner_circle_yearly' as PriceType,
    },
    features: [
      'Everything in Mythos Reader',
      'Behind-the-scenes content and artifacts',
      'Author notes and exclusive materials',
      'Priority access to new releases',
      'Higher referral rewards',
      'Inner Circle recognition',
    ],
  },
} as const;

export const BOOK_PURCHASES = {
  digital: {
    name: 'Book I – Digital Access',
    price: 14.99,
    priceType: 'book_digital' as PriceType,
    description: 'Full digital reading access to Book I',
  },
  extras: {
    name: 'Book I – Digital + Extras',
    price: 19.99,
    priceType: 'book_extras' as PriceType,
    description: 'Includes bonus material, artifacts, and immersive extras',
  },
} as const;
