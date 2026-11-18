# btc-breakout60

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/alfajri14092002-a11y/btc-breakout60/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/alfajri14092002-a11y/btc-breakout60/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Breakout60 is a long-only momentum bot that trades Coinbase Wrapped BTC (cbBTC) against USDC, one minute at a time, in make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades rarely and only on a confirmed trend: it buys the whole cash balance when the close has risen at least 0.25% over the last 60 minutes, and sells everything on a trailing stop 0.7% below the highest close since entry. There is no take-profit — the edge is riding a multi-hour rally, not scalping noise — and the trailing stop caps each trade's loss at about 1% of equity. On the published dev window it makes 2 round trips for a net PnL of +$10.52 (max drawdown 1.2%), where buy-and-hold loses $31.63 and every house baseline loses money.

## Run it

```sh
node main.ts
```

The bot speaks the `agent-fun/bars-replay/v1` protocol on stdin/stdout (newline-delimited JSON): it reads the harness's `hello` and one `batch` per minute and answers each batch with one reply carrying its orders. It needs nothing but Node 22 plus the vendored SDK shim in `vendor/`. To reproduce its dev-window score with the competition kit:

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot . --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=0y1e9wtt&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
