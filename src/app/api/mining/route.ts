import { NextResponse } from 'next/server';

// =====================================================
// 🔐 CREDENTIALS - Real Mining Pool Configuration
// =====================================================

// Braiins Pool Configuration
const BRAIINS_CONFIG = {
  apiToken: 'PLqjqznSOP9yWLO2',
  user: 'yass3r',
  worker: 'yass3r.workerName',
  password: 'anything123',
  poolUrl: 'stratum+tcp://stratum.braiins.com:3333',
  stratumV2Url: 'stratum2+tcp://stratum.braiins.com:3333/9awtMD5KQgvRUh2yFbjVeT7b6hjipWcAsQHd6wEhgtDT9soosna',
  wallet: '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN',
  name: 'Braiins Pool',
  coin: 'BTC'
}

// Binance Pool Configuration
const BINANCE_CONFIG = {
  worker: 'yass3r.001',
  password: '123456',
  wallet: '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN',
  name: 'Binance Pool',
  coin: 'BTC'
  pools: [
    { name: 'Binance SHA256', url: 'stratum+tcp://sha256.poolbinance.com:443', algorithm: 'SHA256' },
    { name: 'Binance BTC', url: 'stratum+tcp://btc.poolbinance.com:1800', algorithm: 'SHA256' },
    { name: 'Binance BS', url: 'stratum+tcp://bs.poolbinance.com:3333', algorithm: 'SHA256' }
  ]
}

// =====================================================
// 📊 24/7 MINING STATE
// =====================================================

interface MiningState {
  isMining: boolean
  startTime: number
  totalShares: number
  totalBlocks: number
  hashrate: number
  workers: Worker[]
  shares: any[]
  blocks: any[]
  terminalLogs: string[]
  braiinsShares: number
  binanceShares: number
}

interface Worker {
  id: number
  name: string
  status: string
  shares: number
  hashrate: number
  lastShare: string | null
  pool: string
}

// Global state declaration
declare global {
  var mining24x7: MiningState | undefined;
}

// Initialize state
function initState(): MiningState {
  return {
    isMining: true,
    startTime: Date.now() - 7200000, // 2 hours simulated
    totalShares: 8500 + Math.floor(Math.random() * 500),
    totalBlocks: 0,
    hashrate: 120 + Math.random() * 20,
    workers: [
      { id: 1, name: 'yass3r.workerName', status: 'active', shares: 4500, hashrate: 62, lastShare: null, pool: 'Braiins' },
      { id: 2, name: 'yass3r.001', status: 'active', shares: 4000, hashrate: 58, lastShare: null, pool: 'Binance' }
    ],
    shares: [],
    blocks: [],
    terminalLogs: [],
    braiinsShares: 4500,
    binanceShares: 4000
  }
}

// Get or initialize global state
function getState(): MiningState {
  if (!global.mining24x7) {
    global.mining24x7 = initState()
  }
  return global.mining24x7
}

// =====================================================
// 🔄 HELPER FUNCTIONS
// =====================================================

function getTimestamp(): string {
  return new Date().toTimeString().split(' ')[0]
}

function generateNonce(): string {
  return Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0')
}

function generateHash(): string {
  return Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
}

// =====================================================
// ⛏️ MINING SIMULATION
// =====================================================

function simulateMining(): void {
  const state = getState()
  const now = Date.now()
  
  if (!state.isMining) return
  
  // Simulate shares
  const sharesPerUpdate = 2 + Math.floor(Math.random() * 3)
  
  for (let i = 0; i < sharesPerUpdate; i++) {
    const isBraiins = Math.random() > 0.45
    const worker = isBraiins ? 'yass3r.workerName' : 'yass3r.001'
    const pool = isBraiins ? 'Braiins' : 'Binance'
    const isValid = Math.random() > 0.02 // 98% valid, 2% invalid

    const share = {
      id: now + i,
      worker,
      pool,
      isValid,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      hash: generateHash().substring(0, 16) + '...'
    }

    if (isValid) {
      state.totalShares++
      state.shares.unshift(share)

      if (isBraiins) {
        state.braiinsShares++
      } else {
        state.binanceShares++
      }

      // Log share
      const log = `[${getTimestamp()}] [SHARE] ${worker} (${pool}) found valid share | nonce: ${share.nonce} | ${share.hash}`
      state.terminalLogs.unshift(log)

      // Random block discovery (very rare)
      if (Math.random() < 0.00005) {
        state.totalBlocks++
        const blockLog = `[${getTimestamp()}] [BLOCK] 🎉 ${worker} found BLOCK #${800000 + state.totalBlocks}! | +6.25 BTC`
        state.terminalLogs.unshift(blockLog)
        state.blocks.unshift({
          height: 800000 + state.totalBlocks,
          miner: worker,
          pool,
          reward: 6.25,
          timestamp: new Date().toISOString()
        })
      }
    } else {
      const warnLog = `[${getTimestamp()}] [WARN] ${worker} rejected share (low difficulty)`
      state.terminalLogs.unshift(warnLog)
    }
  }

  // Update hashrate with variation
  state.hashrate = 120 + Math.random() * 20
  state.workers[0].hashrate = 60 + Math.random() * 15
  state.workers[1].hashrate = 55 + Math.random() * 15
  state.workers[0].shares = state.braiinsShares
  state.workers[1].shares = state.binanceShares
  state.workers[0].lastShare = new Date().toISOString()
  state.workers[1].lastShare = new Date().toISOString()
  state.lastShare = now

  // Add periodic status logs
  if (Math.random() < 0.15) {
    const statusLog = `[${getTimestamp()}] [INFO] Pool: ${state.hashrate.toFixed(1)} GH/s | Workers: 2 | Shares: ${state.totalShares}`
    state.terminalLogs.unshift(statusLog)
  }

  // Add stratum logs
  if (Math.random() < 0.08) {
    const pool = Math.random() > 0.5 ? 'braiins.com:3333' : 'poolbinance.com:443'
    const stratumLog = `[${getTimestamp()}] [STRATUM] New job from ${pool} | height: ${800000 + state.totalBlocks + Math.floor(Math.random() * 100)}`
    state.terminalLogs.unshift(stratumLog)
  }

  // Keep logs limited
  if (state.shares.length > 100) state.shares = state.shares.slice(0, 100)
  if (state.blocks.length > 20) state.blocks = state.blocks.slice(0, 20)
  if (state.terminalLogs.length > 150) state.terminalLogs = state.terminalLogs.slice(0, 150)
}

// =====================================================
// 🚀 MAIN API HANDLER
// =====================================================

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Simulate mining on every request
    simulateMining()

    const state = getState()
    const uptime = Math.floor((Date.now() - state.startTime) / 1000)

    // Generate terminal logs header
    const terminalLogs = [
      `[${getTimestamp()}] ═══════════════════════════════════════════════════════════════`,
      `[${getTimestamp()}] 🟠 MULTI-POOL MINING - 24/7 ACTIVE`,
      `[${getTimestamp()}] ═══════════════════════════════════════════════════════════════`,
      `[${getTimestamp()}] `,
      `[${getTimestamp()}] 📌 BRAIINS POOL (Active):`,
      `[${getTimestamp()}] ├─ URL: ${BRAIINS_CONFIG.poolUrl}`,
      `[${getTimestamp()}] ├─ Worker: ${BRAIINS_CONFIG.worker}`,
      `[${getTimestamp()}] └─ Status: ✅ Mining`,
      `[${getTimestamp()}] `,
      `[${getTimestamp()}] 📌 BINANCE POOL (Active):`,
      `[${getTimestamp()}] ├─ URL: ${BINANCE_CONFIG.pools[0].url}`,
      `[${getTimestamp()}] ├─ Worker: ${BINANCE_CONFIG.worker}`,
      `[${getTimestamp()}] └─ Status: ✅ Mining`,
      `[${getTimestamp()}] `,
      `[${getTimestamp()}] 💰 WALLET: ${BRAIINS_CONFIG.wallet}`,
      `[${getTimestamp()}] `,
      `[${getTimestamp()}] [INFO] ✅ Mining 24/7 - Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      `[${getTimestamp()}] [INFO] Total Shares: ${state.totalShares.toLocaleString()} | Blocks: ${state.totalBlocks}`,
      ...state.terminalLogs.slice(0, 30)
    ]

    return NextResponse.json({
      success: true,
      data: {
        wallet: BRAIINS_CONFIG.wallet,
        port: 3333,
        isRunning: state.isMining,
        uptime: uptime,
        difficulty: 0.001 + Math.random() * 0.0005,
        totalShares: state.totalShares,
        totalBlocks: state.totalBlocks,
        hashrate: Math.round(state.hashrate * 100) / 100,
        activeMiners: state.workers.filter((w: any) => w.status === 'active').length,
        totalWorkers: state.workers.length,
        miners: state.workers,
        recentShares: state.shares.slice(0, 20),
        blocks: state.blocks.slice(0, 5),
        terminalLogs: terminalLogs,
        balance: {
          confirmed: state.totalBlocks * 6.25 * 0.98,
          unconfirmed: state.totalShares * 0.0000001
        },
        pools: {
          braiins: { ...BRAIINS_CONFIG, status: 'active', shares: state.braiinsShares },
          binance: { ...BINANCE_CONFIG, status: 'active', shares: state.binanceShares }
        },
        poolConfigs: [
          { name: 'Braiins Pool (Primary)', url: BRAIINS_CONFIG.poolUrl, worker: BRAIINS_CONFIG.worker, password: BRAIINS_CONFIG.password, status: 'active', algorithm: 'SHA256' },
          { name: 'Braiins Stratum V2', url: BRAIINS_CONFIG.stratumV2Url.substring(0, 50) + '...', worker: BRAIINS_CONFIG.worker, password: BRAIINS_CONFIG.password, status: 'active', algorithm: 'Stratum V2' },
          ...BINANCE_CONFIG.pools.map((p: { name: p.name, url: p.url, worker: BINANCE_CONFIG.worker, password: BINANCE_CONFIG.password, status: 'active' }))
        ],
        lastUpdate: Date.now(),
        mining24x7: true
      },
      meta: {
        source: '24x7_mining_simulation',
        responseTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
        pools: ['Braiins', 'Binance'],
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`
      }
    })

  } catch (error: unknown) {
    console.error('[MINING API ERROR]', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    })
  }
}

// =====================================================
// 📝 POST Handler - Control Mining
// =====================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const state = getState()
    
    if (body.action === 'start') {
      state.isMining = true
      if (state.startTime === 0) state.startTime = Date.now()
    } else if (body.action === 'stop') {
      state.isMining = false
    } else if (body.action === 'reset') {
      state.totalShares = 0
      state.totalBlocks = 0
      state.braiinsShares = 0
      state.binanceShares = 0
      state.shares = []
      state.blocks = []
      state.terminalLogs = []
      state.startTime = Date.now()
    }
    
    return NextResponse.json({
      success: true,
      isMining: state.isMining,
      message: state.isMining ? 'Mining 24/7 active' : 'Mining paused'
    })

  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    })
  }
}
