# WhatsApp Support Icon Refactor

## CI Guard for WhatsApp Icons

To prevent importing raster WhatsApp icons (PNG/JPG), add this to your ESLint configuration:

```js
// .eslintrc.cjs or eslint.config.js
rules: {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['**/whatsapp*.png', '**/whatsapp*.jpg', '**/whatsapp*.jpeg'],
          message: 'Do not import raster WhatsApp icons. Use IconWhatsApp component from @/components/icons/IconWhatsApp instead.',
        },
      ],
    },
  ],
}
```

## Implementation Details

### Components Created
1. `src/components/icons/IconWhatsApp.tsx` - Clean inline SVG icon
2. `src/components/ui/icon-button.tsx` - Circular button with variants
3. Updated `src/components/support/SupportLinkWhatsApp.tsx` - Uses IconButton + IconWhatsApp

### Variants
- **inline**: 40×40 transparent for headers (brand green icon)
- **fab**: 56×56 filled green for floating buttons (white icon)

### Design Specs
- Brand color: #25D366 (WhatsApp green)
- Accessible with aria-label
- Focus rings for keyboard navigation
- Reduced motion support

### Test IDs
- `wa-support-link` - on the anchor element
- `wa-support-icon` - on the SVG
- `data-wa-support-variant` - attribute set to 'inline' or 'fab'

### Legacy Assets
- Old raster icon renamed to `src/assets/whatsapp-icon.legacy.png`
- No longer imported in code

## Usage Examples

```tsx
// Header/toolbar - inline transparent variant
<SupportLinkWhatsApp variant="inline" />

// Floating action button - filled variant
<SupportLinkWhatsApp variant="fab" className="fixed bottom-20 right-5" />

// Custom phone/message
<SupportLinkWhatsApp variant="inline" phone="+919133444118" text="Custom message" />
```

## Acceptance Criteria ✅

1. ✅ SVG icon only (no `<img>` tag)
2. ✅ Two variants: inline (40×40) and fab (56×56)
3. ✅ Brand color #25D366
4. ✅ Accessible with aria-labels
5. ✅ Focus rings for keyboard navigation
6. ✅ wa.me links with proper encoding
7. ✅ Test IDs present in DOM
8. ✅ Legacy PNG renamed and unused
