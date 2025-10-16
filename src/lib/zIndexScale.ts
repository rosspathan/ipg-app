/**
 * Standardized z-index scale for the entire app
 * Use these constants instead of arbitrary z-index values
 */
export const zIndexScale = {
  // Base layers
  base: 0,
  beneath: -1,

  // UI elements
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,

  // Special cases
  mobileFAB: 55, // Above modals but below toasts
  scanner: 100, // QR scanner should be topmost
} as const;

export type ZIndexKey = keyof typeof zIndexScale;
