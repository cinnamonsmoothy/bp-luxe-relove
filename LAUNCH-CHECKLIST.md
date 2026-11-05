# Launch checklist

Only genuine merchant and deployment tasks remain here.

- [ ] Transfer the development store to the client and select/activate the appropriate Shopify plan.
- [ ] Configure payment providers, billing, markets, tax treatment, shipping zones/rates and inventory locations in the client's Shopify account.
- [ ] Replace or remove the existing test handbag and publish the client's actual sale inventory, photographs, accurate variant prices and condition information.
- [ ] Create and publish the missing category collections and an all-products collection. Review `CONFIG.collections`, especially the current reuse of `new-arrivals` for Handbags.
- [ ] Enable the relevant brand, color, size and metafield filters in Shopify Search & Discovery; expose the optional product metafields to the Storefront API.
- [ ] Confirm the client's authentication/certification process and evidence. Review the existing homepage claims, daily-drop wording, and each product's actual authentication details.
- [ ] Publish approved shipping, refund and terms policies in Shopify; review the existing privacy policy. Confirm that delivery and returns pages now show the approved content.
- [ ] Supply the approved public customer-service details in `config.js` or publish the Contact page in Shopify. Review About, FAQ and condition-guide copy.
- [ ] Connect the client's domain, HTTPS and checkout domain as appropriate, and set `CONFIG.siteUrl` to the final website base URL.
- [ ] Verify final sales-channel publication and domain settings, keep `mode: 'live'`, and remove the Shopify store password only when the owner is ready for public sales.
- [ ] Run the final acceptance flow on the deployed domain with the client's shipping/payment configuration, including a permitted test order, cancellation/refund process and confirmation emails. No payment or completed order was tested during this build.
