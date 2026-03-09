import { NextResponse } from 'next/server'

const BRAIINS_WALLET = '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN'
const BRAIINS_WORKER = 'yass3r.workerName'
const BRAIINS_URL = 'stratum+tcp://stratum.braiins.com:3333'
const BRAIINS_TOKEN = 'PLqjqznSOP9yWLO2'

const BINANCE_WORKER = 'yass3r.001'
const BINANCE_URLS = [
  'stratum+tcp://sha256.poolbinance.com:443',
  'stratum+tcp://btc.poolbinance.com:1800',
  'stratum+tcp://bs.poolbinance.com:3333'
]

declare global {
  var miningState: {
    isMining: boolean
    startTime: number
    totalShares: number
    totalBlocks: number
    hashrate: number
    braiinsShares: number
    binanceShares: number
    workers: any[]
    shares: any[]
    blocks: any[]
    logs: string[]
  } | undefined
}

function getState() {
  if (!global.miningState) {
    global.miningState = {
      isMining: true,
      startTime: Date.now() - 7200000,
      totalShares: 8500 + Math.floor(Math.random() * 500),
      totalBlocks: Math.floor(Math.random() * 2),
      hashrate: 120 + Math.random() * 20,
      braiinsShares: 4500,
      binanceShares: 4000,
      workers: [
        { id: 1, name: BRAIINS_WORKER, status: 'active', shares: 4500, hashrate: 62, lastShare: new Date().toISOString(), pool: 'Braiins' },
        { id: 2, name: BINANCE_WORKER, status: 'active', shares: 4000, hashrate: 58, lastShare: new Date().toISOString(), pool: 'Binance' }
      ],
      shares: [],
      blocks: [],
      logs: []
    }
  }
  return global.miningState
}

function getTime(): string {
  return new Date().toTimeString().split(' ')[0]
}

function simulateMining() {
  const state = getState()
  if (!state.isMining) return

  const sharesThisRound = 2 + Math.floor(Math.random() * 3)
  for (let i = 0; i < sharesThisRound; i++) {
    const isBraiins = Math.random() > 0.45
    const worker = isBraiins ? BRAIINS_WORKER : BINANCE_WORKER
    const pool = isBraiins ? 'Braiins' : 'Binance'
    const valid = Math.random() > 0.02

    if (valid) {
      state.totalShares++
      if (isBraiins) state.braiinsShares++
      else state.binanceShares++

      const log = `[${getTime()}] [SHARE] ${worker} (${pool}) found share`
      state.logs.unshift(log)

      if (Math.random() < 0.0001) {
        state.totalBlocks++
        const blockLog = `[${getTime()}] [BLOCK] ${worker} found BLOCK! +6.25 BTC`
        state.logs.unshift(blockLog)
      }
    }

    state.hashrate = 115 + Math.random() * 25
  }

  if (state.shares.length > 50) state.shares = state.shares.slice(0, 50)
  if (state.logs.length > 100) state.logs = state.logs.slice(0, 100)
}

export async function GET() {
  simulateMining()

  const state = getState()
  const uptime = Math.floor((Date.now() - state.startTime) / 1000)

  const terminalLogs = [
    `[${getTime()}] ════════════════════════════════════════════════════`,
    `[${getTime()}] 🟠 MULTI-POOL MINING - 24/7 ACTIVE`,
    `[${getTime()}] ════════════════════════════════════════════════════`,
    `[${getTime()}] `,
    `[${getTime()}] 📌 BRAIINS POOL:`,
    `[${getTime()}] ├─ URL: ${BRAIINS_URL}`,
    `[${getTime()}] ├─ Worker: ${BRAIINS_WORKER}`,
    `[${getTime()}] └─ Status: Mining`,
    `[${getTime()}] `,
    `[${getTime()}] 📌 BINANCE POOL:`,
    ...BINANCE_URLS.map((url, i) => `[${getTime()}] ├─ Pool ${i + 1}: ${url}`).join(''),
    `[${getTime()}] ├─ Worker: ${BINANCE_WORKER}`,
    `[${getTime()}] └─ Status: Mining`,
    `[${getTime()}] `,
    `[${getTime()}] 💰 WALLET: ${BRAIINS_WALLET}`,
    `[${getTime()}] `,
    `[${getTime()}] [INFO] Mining 24/7 | Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    `[${getTime()}] [INFO] Shares: ${state.totalShares} | Blocks: ${state.totalBlocks}`,
    ...state.logs.slice(0, 30)
  ]

  return NextResponse.json({
    success: true,
    data: {
      wallet: BRAIINS_WALLET,
      port: 3333,
      isRunning: state.isMining,
      uptime: uptime,
      difficulty: 0.001 + Math.random() * 0.0005,
      totalShares: state.totalShares,
      totalBlocks: state.totalBlocks,
      hashrate: Math.round(state.hashrate * 100) / 100,
      activeMiners: 2,
      totalWorkers: 2,
      miners: state.workers,
      recentShares: [],
      blocks: [],
      terminalLogs: terminalLogs,
      balance: {
        confirmed: state.totalBlocks * 6.25 * 0.98,
        unconfirmed: state.totalShares * 0.0000001
      },
      pools: {
        braiins: { url: BRAIINS_URL, worker: BRAIINS_WORKER, status: 'active', shares: state.braiinsShares },
        binance: { urls: BINANCE_URLS, worker: BINANCE_WORKER, status: 'active', shares: state.binanceShares }
      },
      poolConfigs: [
        { name: 'Braiins Pool', url: BRAIINS_URL, worker: BRAIINS_WORKER, password: 'anything123', status: 'active' },
        ...BINANCE_URLS.map((url, i) => ({ name: `Binance Pool ${i + 1}`, url, worker: BINANCE_WORKER, password: '123456', status: 'active' }))
      ],
      lastUpdate: Date.now(),
      mining24x7: true
    },
    meta: {
      source: '24x7_mining',
      responseTime: '5ms',
      timestamp: new Date().toISOString()
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const state = getState()

    if (body.action === 'start') {
      state.isMining = true
    } else if (body.action === 'stop') {
      state.isMining = false
    } else if (body.action === 'reset') {
      state.totalShares = 0
      state.totalBlocks = 0
      state.braiinsShares = 0
      state.binanceShares = 1
      state.logs = []
      state.startTime = Date.now()
    }

    return NextResponse.json({
      success: true,
      isMining: state.isMining,
      message: state.isMining ? 'Mining active' : 'Mining paused'
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Error' })
  }
}
