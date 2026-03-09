import { NextResponse } from 'next/server';

// =====================================================
// 🔐 CREDENTIALS - Real Mining Pool Configuration
// =====================================================
const BRAIINS_API_TOKEN = 'PLqjqznSOP9yWLO2';
const BRAIINS_USER = 'yass3r';
const BRAIINS_WORKER = 'yass3r.workerName';
const BRAIINS_POOL_URL = 'stratum+tcp://stratum.braiins.com:3333';
const BRAIINS_STRATUM2_URL = 'stratum2+tcp://stratum.braiins.com:3333/9awtMD5KQgvRUh2yFbjVeT7b6hjipWcAsQHd6wEhgtDT9soosna';

const WALLET_ADDRESS = '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN';

// API Endpoints
const BRAIINS_API_BASE = 'https://pool.braiins.com/api/v1';

// =====================================================
// 📊 TYPE DEFINITIONS - Frontend Expected Format
// =====================================================
interface WorkerData {
  id: number;
  name: string;
  status: string;
  shares: number;
  hashrate: number;
  lastShare: string | null;
}

interface MiningStats {
  workers: number;
  shares: number;
  blocks: number;
  rate: number;
  uptime: number;
  address: string;
  workersList: WorkerData[];
  recentActivity: any[];
}

// =====================================================
// 🌐 REAL API FUNCTIONS
// =====================================================

async function fetchBraiinsAPI(): Promise<{
  workers: any[];
  stats: any;
  balance: any;
  success: boolean;
}> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Pool-Auth-Token': BRAIINS_API_TOKEN,
    };

    const [workersRes, statsRes, balanceRes] = await Promise.all([
      fetch(`${BRAIINS_API_BASE}/workers`, { method: 'GET', headers, signal: AbortSignal.timeout(10000) }),
      fetch(`${BRAIINS_API_BASE}/stats`, { method: 'GET', headers, signal: AbortSignal.timeout(10000) }),
      fetch(`${BRAIINS_API_BASE}/balance`, { method: 'GET', headers, signal: AbortSignal.timeout(10000) })
    ]);

    // Check if responses are JSON
    const isJson = (res: Response) => res.headers.get('content-type')?.includes('application/json');

    const workers = isJson(workersRes) ? (await workersRes.json()).workers || [] : [];
    const stats = isJson(statsRes) ? await statsRes.json() : null;
    const balance = isJson(balanceRes) ? await balanceRes.json() : null;

    return {
      workers,
      stats,
      balance,
      success: workers.length > 0 || stats !== null
    };
  } catch {
    return { workers: [], stats: null, balance: null, success: false };
  }
}

// =====================================================
// 🔄 DATA TRANSFORMATION
// =====================================================

function transformData(
  workers: any[],
  stats: any,
  balance: any,
  apiSuccess: boolean
): MiningStats {
  // Transform workers list
  const workersList: WorkerData[] = workers.length > 0
    ? workers.map((worker, index) => ({
        id: index + 1,
        name: worker.name || `worker_${index + 1}`,
        status: worker.active ? 'active' : 'offline',
        shares: Math.floor((worker.shares_per_second || 0) * 3600),
        hashrate: (worker.hash_rate || 0) / 1e9,
        lastShare: worker.last_share_at || null
      }))
    : [{
        id: 1,
        name: BRAIINS_WORKER,
        status: 'configured',
        shares: 0,
        hashrate: 0,
        lastShare: null
      }];

  // Calculate total hashrate (GH/s)
  let totalHashrate = 0;
  if (stats?.btc?.hash_rate_5m) {
    totalHashrate = stats.btc.hash_rate_5m / 1e9;
  } else {
    totalHashrate = workersList.reduce((sum, w) => sum + w.hashrate, 0);
  }

  // Calculate total shares
  const totalShares = workersList.reduce((sum, w) => sum + w.shares, 0);

  // Estimate blocks from balance
  const confirmedBalance = balance?.confirmed || 0;
  const estimatedBlocks = Math.floor(confirmedBalance * 100000000 / 625000000);

  return {
    workers: workersList.filter(w => w.status === 'active').length,
    shares: totalShares,
    blocks: estimatedBlocks,
    rate: Math.round(totalHashrate * 100) / 100,
    uptime: apiSuccess ? Math.floor(process.uptime?.() || 0) : 0,
    address: WALLET_ADDRESS,
    workersList,
    recentActivity: []
  };
}

// =====================================================
// 🚀 MAIN API HANDLER
// =====================================================

export async function GET() {
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    logs.push(`[${new Date().toISOString()}] Fetching real mining data...`);

    // Fetch real data from Braiins API
    const result = await fetchBraiinsAPI();

    // Transform to frontend format
    const miningStats = transformData(
      result.workers,
      result.stats,
      result.balance,
      result.success
    );

    const responseTime = Date.now() - startTime;

    if (result.success) {
      logs.push(`[${new Date().toISOString()}] ✓ Data fetched successfully`);
      logs.push(`[${new Date().toISOString()}] Workers: ${miningStats.workers}, Rate: ${miningStats.rate} GH/s`);
    } else {
      logs.push(`[${new Date().toISOString()}] ⚠ API requires authentication`);
      logs.push(`[${new Date().toISOString()}] Configuration ready for mining`);
    }

    console.log('[DATA API] Response:', {
      success: result.success,
      workers: miningStats.workers,
      hashrate: `${miningStats.rate} GH/s`,
      responseTime: `${responseTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: miningStats,
      configuration: {
        poolUrl: BRAIINS_POOL_URL,
        stratumV2Url: BRAIINS_STRATUM2_URL,
        worker: BRAIINS_WORKER,
        userId: BRAIINS_USER,
        wallet: WALLET_ADDRESS
      },
      meta: {
        source: result.success ? 'braiins_api' : 'configured',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        logs: logs,
        apiTokenConfigured: !!BRAIINS_API_TOKEN
      }
    });

  } catch (error: any) {
    console.error('[DATA API ERROR]', error);
    logs.push(`[${new Date().toISOString()}] ERROR: ${error.message}`);

    // Return fallback with configuration
    return NextResponse.json({
      success: false,
      data: {
        workers: 0,
        shares: 0,
        blocks: 0,
        rate: 0,
        uptime: 0,
        address: WALLET_ADDRESS,
        workersList: [{
          id: 1,
          name: BRAIINS_WORKER,
          status: 'configured',
          shares: 0,
          hashrate: 0,
          lastShare: null
        }],
        recentActivity: []
      },
      configuration: {
        poolUrl: BRAIINS_POOL_URL,
        stratumV2Url: BRAIINS_STRATUM2_URL,
        worker: BRAIINS_WORKER,
        userId: BRAIINS_USER,
        wallet: WALLET_ADDRESS
      },
      error: {
        message: error.message,
        type: error.name || 'UnknownError'
      },
      meta: {
        source: 'fallback',
        responseTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
        logs: logs
      }
    });
  }
}

// =====================================================
// 📝 POST Handler
// =====================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: false,
      message: 'Mining requires ASIC hardware.',
      configuration: {
        poolUrl: BRAIINS_POOL_URL,
        worker: BRAIINS_WORKER,
        wallet: WALLET_ADDRESS
      },
      dashboard: 'https://pool.braiins.com/'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
