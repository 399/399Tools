import { differenceInDays } from "date-fns";

/**
 * Calculates the XIRR (Internal Rate of Return) for a series of cash flows.
 * Uses the Newton-Raphson method.
 *
 * @param cashFlows Array of { date: Date, amount: number }
 *                  amount < 0 for outflows (buys/withdrawals)
 *                  amount > 0 for inflows (sells/deposits/current value)
 * @param guess Initial guess for the rate (default 0.1)
 * @returns The annualized internal rate of return (decimal, e.g. 0.05 for 5%)
 */
export function calculateXIRR(cashFlows: { date: Date; amount: number }[], guess = 0.1): number {
    if (cashFlows.length < 2) return 0;

    // Check if we have at least one positive and one negative cash flow
    const hasPositive = cashFlows.some(cf => cf.amount > 0);
    const hasNegative = cashFlows.some(cf => cf.amount < 0);
    if (!hasPositive || !hasNegative) return 0;

    let rate = guess;
    const maxIterations = 100;
    const tolerance = 1e-6;

    for (let i = 0; i < maxIterations; i++) {
        const result = xirrNewtonRaphsonStep(cashFlows, rate);
        const newRate = rate - result.value / result.derivative;

        if (Math.abs(newRate - rate) < tolerance) {
            return newRate;
        }
        rate = newRate;
    }

    // fallback if no convergence, though usually it converges for normal portfolios
    return rate;
}

function xirrNewtonRaphsonStep(cashFlows: { date: Date; amount: number }[], rate: number) {
    let value = 0;
    let derivative = 0;
    // Normalize to first date to avoid large powers
    const startDate = cashFlows[0].date;

    for (const { date, amount } of cashFlows) {
        const days = differenceInDays(date, startDate);
        const years = days / 365;
        const discountFactor = Math.pow(1 + rate, years);

        value += amount / discountFactor;
        // Derivative of amount * (1+r)^-t is  -t * amount * (1+r)^(-t-1)
        if (years !== 0) {
            derivative -= years * amount * Math.pow(1 + rate, -years - 1);
        }
    }
    return { value, derivative };
}

/**
 * Calculates Annualized Return (Compound Annual Growth Rate - CAGR)
 * 
 * @param startValue Initial value
 * @param endValue Final value
 * @param days Number of days between start and end
 * @returns Annualized return as a decimal
 */
export function calculateAnnualizedReturn(startValue: number, endValue: number, days: number): number {
    if (startValue === 0 || days === 0) return 0;
    const totalReturn = endValue / startValue;
    const years = 365 / days;
    return Math.pow(totalReturn, years) - 1;
}
