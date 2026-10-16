/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FeeTier {
  category: string;
  fee: string;
  numericAmount?: number;
}

export interface ResolvedEventFee {
  isFree: boolean;
  display: string; // e.g. "₹4,500", "From ₹2,000", "Free"
  numericAmount: number; // For transactions / gateway
  isTiered: boolean;
  tiersCount: number;
  tiers: FeeTier[];
  source: 'explicit' | 'completed' | 'registration_section' | 'free_default';
  hasPaidTiers: boolean;
  primaryTierLabel?: string;
}

/**
 * Extracts numeric fee from various string representations:
 * e.g. "INR 2,500" -> 2500, "₹ 4,500.00" -> 4500, "USD $100" -> 100, "Free" -> 0
 */
export function parseFeeAmount(feeVal: any): number {
  if (feeVal === undefined || feeVal === null) return 0;
  if (typeof feeVal === 'number') {
    return isNaN(feeVal) || feeVal < 0 ? 0 : Math.round(feeVal);
  }
  const str = String(feeVal).trim();
  if (!str) return 0;

  const lower = str.toLowerCase();
  if (
    lower.includes('free') || 
    lower.includes('complimentary') || 
    lower.includes('nil') || 
    lower.includes('waived') ||
    lower.includes('fully funded') ||
    lower === '0' ||
    lower === '₹0' ||
    lower === 'inr 0'
  ) {
    return 0;
  }

  // Extract first group of digits with optional commas and decimals
  const match = str.match(/(\d[\d,]*)(\.\d+)?/);
  if (match) {
    const cleanNumStr = match[1].replace(/,/g, '');
    const num = parseFloat(cleanNumStr);
    if (isNaN(num) || num < 0) return 0;
    // Normalize USD / foreign currency to comparable INR scale
    if (lower.includes('usd') || lower.includes('$')) {
      return Math.round(num * 85);
    }
    return Math.round(num);
  }

  return 0;
}

/**
 * Formats a numeric amount or string into currency display:
 * e.g. 4500 -> "₹4,500"
 */
export function formatCurrencyFee(amount: number): string {
  if (amount <= 0) return 'Free';
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Extracts fee tiers from any event object, checking both registrationCard and subPages.
 */
export function extractRegistrationFees(event: any): FeeTier[] {
  if (!event) return [];

  // 1. Check event.registrationCard.fees
  if (Array.isArray(event.registrationCard?.fees) && event.registrationCard.fees.length > 0) {
    return event.registrationCard.fees;
  }

  // 2. Check event.subPages for registration tab
  if (Array.isArray(event.subPages)) {
    const regTab = event.subPages.find((p: any) => p && p.type === 'registration');
    if (regTab && regTab.content && Array.isArray(regTab.content.fees) && regTab.content.fees.length > 0) {
      return regTab.content.fees;
    }
  }

  // 3. Check eventDetails (courses or nested representations)
  if (Array.isArray(event.eventDetails?.registrationCard?.fees) && event.eventDetails.registrationCard.fees.length > 0) {
    return event.eventDetails.registrationCard.fees;
  }
  if (Array.isArray(event.eventDetails?.subPages)) {
    const regTab = event.eventDetails.subPages.find((p: any) => p && p.type === 'registration');
    if (regTab && regTab.content && Array.isArray(regTab.content.fees) && regTab.content.fees.length > 0) {
      return regTab.content.fees;
    }
  }

  // 4. Safe fallback: If an explicit fee is specified on the event or registrationCard, generate the standard tier so pricing is never dropped
  const explicitFeeRaw = event.fee !== undefined && event.fee !== null && event.fee !== '' 
    ? event.fee 
    : (event.registrationCard?.fee !== undefined && event.registrationCard?.fee !== null ? event.registrationCard.fee : event.eventDetails?.fee);
  const explicitFee = explicitFeeRaw !== undefined ? Number(explicitFeeRaw) : 0;
  if (!isNaN(explicitFee) && explicitFee > 0) {
    return [
      {
        category: 'Standard Registration',
        fee: formatCurrencyFee(explicitFee),
        numericAmount: explicitFee
      }
    ];
  }

  return [];
}

/**
 * Automatically resolves the effective fee for an event.
 * Reconciles explicit event.fee, event.registrationCard.fee, and the Registration Fee section.
 */
export function getResolvedEventFee(event: any, isCompletedCourse = false): ResolvedEventFee {
  if (!event) {
    return {
      isFree: true,
      display: 'Free',
      numericAmount: 0,
      isTiered: false,
      tiersCount: 0,
      tiers: [],
      source: 'free_default',
      hasPaidTiers: false
    };
  }

  // 1. If completed course archive fee is specified
  if (isCompletedCourse && event.completedFee !== undefined && Number(event.completedFee) > 0) {
    const amount = Number(event.completedFee);
    return {
      isFree: false,
      display: formatCurrencyFee(amount),
      numericAmount: amount,
      isTiered: false,
      tiersCount: 0,
      tiers: [],
      source: 'completed',
      hasPaidTiers: true
    };
  }

  // Extract registration fee tiers if present
  const rawTiers = extractRegistrationFees(event);
  const parsedTiers: FeeTier[] = rawTiers.map(t => ({
    category: t.category || 'General',
    fee: t.fee || '',
    numericAmount: parseFeeAmount(t.fee)
  }));

  const positiveTiers = parsedTiers.filter(t => (t.numericAmount || 0) > 0);
  const freeTiers = parsedTiers.filter(t => (t.numericAmount || 0) === 0);
  const hasPaidTiers = positiveTiers.length > 0;

  // 2. Check explicit event.fee or registrationCard.fee
  const explicitFeeRaw = event.fee !== undefined ? event.fee : event.registrationCard?.fee;
  const explicitFee = explicitFeeRaw !== undefined ? Number(explicitFeeRaw) : 0;

  if (explicitFee > 0) {
    const isTiered = parsedTiers.length > 1;
    let disp = formatCurrencyFee(explicitFee);
    if (isTiered) {
      disp = freeTiers.length > 0 ? `Free / From ${disp}` : `From ${disp}`;
    }
    return {
      isFree: false,
      display: disp,
      numericAmount: explicitFee,
      isTiered,
      tiersCount: parsedTiers.length,
      tiers: parsedTiers,
      source: 'explicit',
      hasPaidTiers: true,
      primaryTierLabel: parsedTiers[0]?.category
    };
  }

  // 3. Reconcile automatically from Registration Fee section!
  if (parsedTiers.length > 0) {
    if (!hasPaidTiers) {
      // All tiers are free
      return {
        isFree: true,
        display: 'Free',
        numericAmount: 0,
        isTiered: parsedTiers.length > 1,
        tiersCount: parsedTiers.length,
        tiers: parsedTiers,
        source: 'registration_section',
        hasPaidTiers: false
      };
    }

    if (positiveTiers.length === 1 && freeTiers.length === 0) {
      // Single paid tier
      const single = positiveTiers[0];
      const disp = single.fee.trim().startsWith('₹') || single.fee.trim().startsWith('INR') || single.fee.trim().startsWith('$') 
        ? single.fee.trim() 
        : formatCurrencyFee(single.numericAmount || 0);
      return {
        isFree: false,
        display: disp,
        numericAmount: single.numericAmount || 0,
        isTiered: false,
        tiersCount: 1,
        tiers: parsedTiers,
        source: 'registration_section',
        hasPaidTiers: true,
        primaryTierLabel: single.category
      };
    }

    // Multiple tiers with at least one paid tier
    const minPositive = Math.min(...positiveTiers.map(t => t.numericAmount || 0));
    const minTier = positiveTiers.find(t => t.numericAmount === minPositive);
    const minTierDisplay = minTier?.fee?.trim() || formatCurrencyFee(minPositive);

    return {
      isFree: false,
      display: freeTiers.length > 0 ? `Free / From ${minTierDisplay}` : `From ${minTierDisplay}`,
      numericAmount: minPositive,
      isTiered: true,
      tiersCount: parsedTiers.length,
      tiers: parsedTiers,
      source: 'registration_section',
      hasPaidTiers: true,
      primaryTierLabel: minTier?.category
    };
  }

  // 4. Fallback: Free default
  return {
    isFree: true,
    display: 'Free',
    numericAmount: 0,
    isTiered: false,
    tiersCount: 0,
    tiers: [],
    source: 'free_default',
    hasPaidTiers: false
  };
}
