// Breakout60: a long-only momentum bot for the cbBTC 1-minute bars replay.
//
// Idea
// ----
// Bitcoin on a 1-minute chart is mostly noise (about 7 bps of wiggle per
// minute) punctuated by multi-hour trends. A round trip costs about 26 bps
// in fees, slippage and price impact, so a trade has to catch a move much
// larger than that. This bot therefore trades rarely and only on a
// confirmed trend:
//
// - Entry: the close has risen at least 0.25% over the last 60 minutes
//   (a 60-bar momentum breakout). The whole cash balance goes in, because
//   the cost of a trade is proportional to its size and a confirmed
//   multi-hour trend is the one thing worth paying for.
// - Exit: a trailing stop 0.7% below the highest close seen since entry.
//   There is no take-profit: the one big rally in the dev window kept
//   going for hours, and cutting it short throws away the edge. The
//   trailing stop is also the risk control: the most a trade can lose is
//   roughly the stop distance plus the round-trip cost, about 1% of
//   equity, so the drawdown stays far under the 25% guardrail.
//
// Why this shape, on the published dev window (24h, BTC -2.8% overall):
// - Buy-and-hold loses $31.63, the EMA-cross baseline loses $148.17, the
//   momentum baseline loses $23.87, RSI-Bollinger loses $39.92. Every
//   baseline loses: they trade too often in a choppy, falling market.
// - Breakout60 makes 2 round trips: it rides the one real rally
//   (+1.78% gross) and scratches the second trade near breakeven,
//   for a net PnL of +$10.52 with a 1.2% maximum drawdown.
// - The same parameters also make +$6.36 on the time-reversed dev window
//   (an up-trending market), so the edge is not a one-window accident:
//   it is long the rallies and in cash for the declines, in either
//   direction of the overall trend.
//
// Determinism: the bot keeps only closes and a peak (float64, the same
// bars give the same orders every run). It never reads the clock, the
// environment, or any file, and it seeds nothing random. It uses the
// kit's TypeScript SDK shim (vendor/makefun-bars.ts, a byte-identical
// copy) for the wire protocol.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK_BARS = 60; // entry: return over this many bars
const ENTRY_THRESHOLD = 0.0025; // ... must be at least +0.25%
const TRAIL_FRACTION = 0.007; // exit: close 0.7% below the peak since entry
const MAX_SLIPPAGE_BPS = 100; // 1% past the close the order was decided on
const MIN_NOTIONAL = 1_000_000n; // 1 USDC, the minimum notional

// Closes seen so far, newest last (price units, as numbers).
const closes: number[] = [];
// Highest close since the current position was opened (null while flat).
let peak: number | null = null;
// Bars left to retry a buy after the breakout fired, in case the fill was
// refused (a fill refused for slippage or a missing bar leaves us flat on
// the next batch, and the breakout may still be worth taking).
let entryArmed = 0;

/** The 60-bar return ending at the latest close, or null without enough bars. */
function breakoutReturn(): number | null {
  if (closes.length <= LOOKBACK_BARS) return null;
  const now = closes[closes.length - 1];
  const then = closes[closes.length - 1 - LOOKBACK_BARS];
  return now / then - 1;
}

await runBars({
  onBatch(state: BarsState, batch) {
    if (state.warmingUp) return [];

    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      entryArmed = 0;
      const close = state.close(SYMBOL);
      if (close !== null) {
        const c = Number(close);
        if (peak === null || c > peak) peak = c;
        if (c <= peak * (1 - TRAIL_FRACTION)) {
          peak = null;
          const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
          return [sell];
        }
      }
      return [];
    }

    // Flat: look for a breakout, or retry one whose fill was refused.
    const ret = breakoutReturn();
    const breakout = ret !== null && ret >= ENTRY_THRESHOLD;
    if (breakout || (entryArmed > 0 && ret !== null && ret >= 0)) {
      if (breakout) entryArmed = 5;
      else entryArmed -= 1;
      const cash = state.cash;
      if (cash >= MIN_NOTIONAL) {
        const now = closes[closes.length - 1];
        peak = now;
        const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [buy];
      }
    } else {
      entryArmed = 0;
    }
    return [];
  },
});
