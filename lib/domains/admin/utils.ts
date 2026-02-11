// ============================================================================
// Admin Domain Utilities
// Pure helper functions for formatting and calculations
// ============================================================================

/**
 * Format a decimal or whole number as a percentage string.
 * @example formatPercentage(85.234) => "85.2%"
 * @example formatPercentage(100)    => "100%"
 */
export function formatPercentage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  // Drop the decimal if it's a whole number
  return `${rounded % 1 === 0 ? Math.round(rounded) : rounded}%`;
}

/**
 * Format a number into a compact human-readable string.
 * @example formatCompactNumber(850)    => "850"
 * @example formatCompactNumber(1234)   => "1.2K"
 * @example formatCompactNumber(15340)  => "15.3K"
 * @example formatCompactNumber(1500000) => "1.5M"
 */
export function formatCompactNumber(value: number): string {
  if (value < 1000) return value.toString();
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${Math.round(k * 10) / 10}K`;
  }
  const m = value / 1_000_000;
  return `${Math.round(m * 10) / 10}M`;
}

/**
 * Compare a current value against a previous value and return trend direction
 * plus the percentage change.
 * @example calculateTrend(120, 100) => { direction: 'up', percentage: 20 }
 * @example calculateTrend(80, 100)  => { direction: 'down', percentage: 20 }
 * @example calculateTrend(100, 100) => { direction: 'flat', percentage: 0 }
 */
export function calculateTrend(
  current: number,
  previous: number
): { direction: "up" | "down" | "flat"; percentage: number } {
  if (previous === 0) {
    if (current === 0) return { direction: "flat", percentage: 0 };
    return { direction: "up", percentage: 100 };
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(change) * 10) / 10;

  if (rounded === 0) return { direction: "flat", percentage: 0 };
  return {
    direction: change > 0 ? "up" : "down",
    percentage: rounded,
  };
}
