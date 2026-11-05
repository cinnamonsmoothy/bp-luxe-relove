// Browser-safe configuration. Never put an Admin API or private token here.
export const CONFIG = {
  domain: 'bp-luxe-relove-nfn1sisq.myshopify.com',
  storefrontToken: 'b2c7277b4bf89bf3d9664060846e4118',
  apiVersion: '2026-10',
  mode: 'live', // Production default. Preview explicitly with ?demo=1.
  pageSize: 24,
  contactEmail: '', // Client's approved public customer-service address.
  contactPhone: '',
  address: '',
  siteUrl: 'https://cinnamonsmoothy.github.io/bp-luxe-relove/',
  collections: {
    all: 'all-products', bags: 'new-arrivals', shoes: 'shoes', sunglasses: 'sunglasses',
    accessories: 'accessories', fashion: 'fashion', beauty: 'hair-beauty', new: 'new-arrivals'
  },
  metafields: ['condition', 'material', 'dimensions', 'included', 'authentication', 'style', 'care'],
  newArrivalDays: 30
};
export const CATEGORIES = {
  all: { title: 'The complete edit', description: 'Beautiful pieces, waiting for their next chapter.', image: 'assets/07_coordinated_bag_and_shoes.webp' },
  bags: { title: 'Handbags', description: 'Enduring shapes. Extraordinary details. Find the one you will reach for again and again.', image: 'assets/02_category_bags.webp' },
  shoes: { title: 'Shoes', description: 'Considered silhouettes for every entrance.', image: 'assets/03_category_shoes.webp' },
  sunglasses: { title: 'Sunglasses', description: 'A different perspective on everyday elegance.', image: 'assets/04_category_accessories.webp' },
  accessories: { title: 'Accessories & jewellery', description: 'Small details with a lasting presence.', image: 'assets/04_category_accessories.webp' },
  fashion: { title: 'Fashion', description: 'A wardrobe of possibilities, beyond the season.', image: 'assets/05_story_leather_detail.webp' },
  beauty: { title: 'Hair & beauty', description: 'Thoughtful additions to your everyday rituals.', image: 'assets/08_newsletter_wide_clean.webp' },
  new: { title: 'New arrivals', description: 'The latest pieces to join our edit. Discover what comes next.', image: 'assets/06_shoe_editorial.webp' }
};
