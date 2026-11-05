# Verification record

Build verification performed on 4 November 2026.

## Browser checks

**Final result: 11 browser check groups passed, 0 failed.**

`node tests/storefront.cjs` exercises:

- Catalog pagination from 24 to 36 original sample products, uniqueness and actual image loading.
- Combined availability/color/custom price filtering, removable URL state, alphabetical and price sorting, back and forward navigation, and empty selections.
- All seven dedicated category routes plus All Products.
- Wishlist add/remove and persistence after refresh.
- Product gallery thumbnails, zoom viewer and keyboard navigation, option selection, unavailable variants, quantity, demo bag persistence and checkout blocking.
- Predictive search thumbnails/prices, keyboard selection, results and empty searches.
- All eight information page templates.
- Mobile navigation opened while scrolled, full viewport coverage, mobile filters, and close controls.
- Horizontal overflow at 320, 390, 768, 1440, 2560 and 3840 CSS pixels, homepage/shop/product layouts, and shared navigation targets.
- Reduced motion and absence of browser JavaScript errors.
- Explicit live API failure states without sample fallback.

Screenshots are generated in `test-artifacts/`. Original SVG studies and self-hosted fonts are local, so the demo checks can run without external image/font services.

## Actual live Shopify checks

Against the existing configured test store, not a mocked catalog:

- All Products, the published `new-arrivals` collection, combined availability/price queries, product detail by handle and search returned the actual test handbag.
- Native filter metadata and filtered ID counts returned successfully.
- Missing category collections returned empty states. Published privacy policy retrieval worked; shipping, refund and terms policies were absent.
- A disposable Shopify cart passed creation, add, update, remove, restore and generated checkout URL checks. The API test cart was emptied.
- In the browser, the actual product page added the live handbag, the full bag restored it after navigation, and the checkout button navigated to Shopify's generated URL.
- The development store redirected checkout to its `/password` page. The password restriction was not bypassed.

**No order, payment, delivery calculation after checkout authentication, refund or customer email was tested.** Those require the client's completed Shopify configuration and a permitted acceptance order.

## Known boundaries

- Live inventory currently consists of one test item. Missing collections and policies need merchant content, not fabricated stock or terms.
- The public token does not grant exact inventory quantity access. Availability and cart validation are used; numerical stock promises are not shown.
- Full native option/metafield filtering for All Products requires the configured all-products collection. Its root-query fallback exposes only filters it can execute correctly.
- Guest wishlist, cart ID and recently viewed history are local to this browser; there is no customer-account sync.
- Static product pages are rendered from Shopify at runtime. Product-specific social previews for non-JavaScript bots would require pre-rendering.
- The sample catalog uses clearly labelled original illustrations and fictional pieces; it cannot be checked out.
