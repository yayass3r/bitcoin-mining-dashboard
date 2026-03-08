import { NextResponse } from 'next/server';

// Global mining state - persists across requests in the same instance
declare global {
  var miningState: {
    wallet: string;
    port: number;
    miners: any[];
    totalShares: number;
    totalBlocks: number;
    hashrate: number;
    difficulty: number;
    uptime: number;
    startTime: number;
    isRunning: boolean;
    recentShares: any[];
    blocks: any[];
    lastUpdate: number;
  };
}

// Initialize global state
if (!global.miningState) {
  global.miningState = {
    wallet: '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN',
    port: 3333,
    miners: [
      { id: 1, name: 'worker_01', status: 'active', shares: 0, hashrate: 95.5, lastShare: null },
      { id: 2, name: 'worker_02', status: 'active', shares: 0, hashrate: 88.3, lastShare: null },
      { id: 3, name: 'worker_03', status: 'active', shares: 0, hashrate: 92.1, lastShare: null },
      { id: 4, name: 'worker_04', status: 'active', shares: 0, hashrate: 97.8, lastShare: null },
      { id: 5, name: 'worker_05', status: 'active', shares: 0, hashrate: 90.2, lastShare: null },
    ],
    totalShares: 0,
    totalBlocks: 0,
    hashrate: 463.9,
    difficulty: 0.001,
    uptime: 0,
    startTime: Date.now(),
    isRunning: true,
    recentShares: [],
    blocks: [],
    lastUpdate: Date.now(),
  };
}

const state = global.miningState;

// Simulate mining progress on each request
function updateMining() {
  const now = Date.now();
  const elapsed = (now - state.lastUpdate) / 1000;

  if (state.isRunning && elapsed > 0.5) {
    // Update hashrate with some variation
    state.hashrate = state.miners.reduce((sum: number, m: any) => {
      m.hashrate = Math.max(50, Math.min(150, m.hashrate + (Math.random() - 0.5) * 10));
      return sum + m.hashrate;
    }, 0);

    // Generate shares based on elapsed time
    const sharesToGenerate = Math.floor(elapsed * state.miners.length * 2);

    for (let i = 0; i < sharesToGenerate; i++) {
      const miner = state.miners[Math.floor(Math.random() * state.miners.length)];
      const isValid = Math.random() > 0.03;

      const share = {
        id: now + i + Math.random(),
        worker: miner.name,
        difficulty: state.difficulty,
        timestamp: new Date().toISOString(),
        isValid: isValid,
      };

      miner.shares++;
      miner.lastShare = new Date().toISOString();

      if (isValid) {
        state.totalShares++;
        state.recentShares.unshift(share);

        if (state.recentShares.length > 100) {
          state.recentShares.pop();
        }

        // Chance to find a block
        if (Math.random() < 0.0002) {
          const block = {
            height: 800000 + state.totalBlocks,
            hash: Array.from({ length: 64 }, () =>
              '0123456789abcdef'[Math.floor(Math.random() * 16)]
            ).join(''),
            miner: miner.name,
            reward: 6.25,
            timestamp: new Date().toISOString(),
          };
          state.totalBlocks++;
          state.blocks.unshift(block);

          if (state.blocks.length > 20) {
            state.blocks.pop();
          }
        }
      }
    }

    state.uptime = Math.floor((now - state.startTime) / 1000);
    state.lastUpdate = now;
  }
}

export async function GET() {
  updateMining();

  return NextResponse.json({
    success: true,
    data: {
      wallet: state.wallet,
      port: state.port,
      isRunning: state.isRunning,
      uptime: state.uptime,
      difficulty: state.difficulty,
      totalShares: state.totalShares,
      totalBlocks: state.totalBlocks,
      hashrate: state.hashrate,
      activeMiners: state.miners.filter((m: any) => m.status === 'active').length,
      miners: state.miners,
      recentShares: state.recentShares.slice(0, 30),
      blocks: state.blocks.slice(0, 10),
      lastUpdate: state.lastUpdate,
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === 'start') {
    state.isRunning = true;
    if (state.startTime === 0) {
      state.startTime = Date.now();
    }
  } else if (body.action === 'stop') {
    state.isRunning = false;
  } else if (body.action === 'reset') {
    state.totalShares = 0;
    state.totalBlocks = 0;
    state.miners.forEach((m: any) => { m.shares = 0; });
    state.recentShares = [];
    state.blocks = [];
    state.startTime = Date.now();
    state.uptime = 0;
  } else if (body.action === 'add_miner') {
    const newId = state.miners.length + 1;
    state.miners.push({
      id: newId,
      name: `worker_${String(newId).padStart(2, '0')}`,
      status: 'active',
      shares: 0,
      hashrate: 80 + Math.random() * 40,
      lastShare: null
    });
  }

  updateMining();

  return NextResponse.json({
    success: true,
    data: {
      wallet: state.wallet,
      port: state.port,
      isRunning: state.isRunning,
      uptime: state.uptime,
      totalShares: state.totalShares,
      totalBlocks: state.totalBlocks,
      miners: state.miners,
    }
  });
}
