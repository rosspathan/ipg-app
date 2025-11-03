/**
 * BigMath - Financial calculation utility using BigNumber.js
 * Prevents floating-point precision errors in financial calculations
 * 
 * Phase 3.4: Replace JavaScript Number with BigNumber Library
 */

import BigNumber from 'bignumber.js';

// Configure BigNumber for financial calculations
BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
  EXPONENTIAL_AT: [-20, 20],
  RANGE: [-500, 500],
  CRYPTO: false,
  MODULO_MODE: BigNumber.ROUND_DOWN,
  POW_PRECISION: 80,
  FORMAT: {
    prefix: '',
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
    secondaryGroupSize: 0,
    fractionGroupSeparator: ' ',
    fractionGroupSize: 0,
    suffix: ''
  }
});

export const BigMath = {
  /**
   * Multiply two numbers with precision
   */
  multiply: (a: number | string, b: number | string): string => {
    return new BigNumber(a).times(b).toString();
  },

  /**
   * Divide two numbers with precision
   */
  divide: (a: number | string, b: number | string): string => {
    if (new BigNumber(b).isZero()) {
      throw new Error('Division by zero');
    }
    return new BigNumber(a).div(b).toString();
  },

  /**
   * Add two numbers with precision
   */
  add: (a: number | string, b: number | string): string => {
    return new BigNumber(a).plus(b).toString();
  },

  /**
   * Subtract two numbers with precision
   */
  subtract: (a: number | string, b: number | string): string => {
    return new BigNumber(a).minus(b).toString();
  },

  /**
   * Calculate percentage with precision
   */
  percent: (value: number | string, percent: number | string): string => {
    return new BigNumber(value).times(percent).div(100).toString();
  },

  /**
   * Format number for display
   */
  format: (value: number | string, decimals: number = 2): string => {
    return new BigNumber(value).toFixed(decimals);
  },

  /**
   * Convert to number (use with caution, only for display)
   */
  toNumber: (value: string | BigNumber): number => {
    return new BigNumber(value).toNumber();
  },

  /**
   * Compare two numbers
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  compare: (a: number | string, b: number | string): number => {
    return new BigNumber(a).comparedTo(b);
  },

  /**
   * Check if value is greater than or equal
   */
  gte: (a: number | string, b: number | string): boolean => {
    return new BigNumber(a).gte(b);
  },

  /**
   * Check if value is less than or equal
   */
  lte: (a: number | string, b: number | string): boolean => {
    return new BigNumber(a).lte(b);
  },

  /**
   * Get minimum of two values
   */
  min: (a: number | string, b: number | string): string => {
    return BigNumber.min(a, b).toString();
  },

  /**
   * Get maximum of two values
   */
  max: (a: number | string, b: number | string): string => {
    return BigNumber.max(a, b).toString();
  },

  /**
   * Calculate order value (quantity * price)
   */
  orderValue: (quantity: number | string, price: number | string): string => {
    return new BigNumber(quantity).times(price).toString();
  },

  /**
   * Calculate fee (amount * fee_percent / 100)
   */
  calculateFee: (amount: number | string, feePercent: number | string): string => {
    return new BigNumber(amount).times(feePercent).div(100).toString();
  },

  /**
   * Validate if string is a valid number
   */
  isValid: (value: any): boolean => {
    return new BigNumber(value).isFinite();
  },

  /**
   * Check if value is zero
   */
  isZero: (value: number | string): boolean => {
    return new BigNumber(value).isZero();
  },

  /**
   * Check if value is positive
   */
  isPositive: (value: number | string): boolean => {
    return new BigNumber(value).isPositive();
  }
};
