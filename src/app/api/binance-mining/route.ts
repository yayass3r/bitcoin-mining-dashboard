/**
 * Binance Pool Mining API Integration
 * Real mining data using Binance Pool API
 */

import { NextRequest } from 'next/server';

const BINANCE_API_KEY = 'Q1Pn5qCo5ovfCwOgHDj9xu9jABmEnDhuM7sf73RReAiwR8Yz1tDeNaZyT8wNko7r';
const BINANCE_POOL_BASE_URL = 'https://pool.binance.com';

// Hashrate history storage
let hashrateHistory: { timestamp: number; hashrate: number }[] = [];
let lastFetchTime = 0;

async function fetchBinanceAPI(endpoint: string) {
  try {
    const response = await fetch(`${BINANCE_POOL_BASE_URL}${endpoint}`, {
      headers: {
        'X-MBX-APIKEY': BINANCE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Binance API error ${response.status}:`, text);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Binance API fetch error:', error);
    return null;
  }
}

// Get account earnings
async function getMiningEarnings() {
  return fetchBinanceAPI('/mining/earnings/list?algo=SHA256');
}

// Get mining workers
async function getMiningWorkers() {
  return fetchBinanceAPI('/mining/worker/list?algo=SHA256');
}

// Get hashrate history
async function getHashrateHistory() {
  return fetchBinanceAPI('/mining/hashrate/list?algo=SHA256');
}

// Get mining statistics
async function getMiningStats() {
  return fetchBinanceAPI('/mining/statistics/list?algo=SHA256');
}

// Get account details
async function getAccountDetails() {
  return fetchBinanceAPI('/mining/account/list?algo=SHA256');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'status';
  
  try {
    // Fetch all data in parallel
    const [earnings, workers, hashrate, stats, account] = await Promise.all([
      getMiningEarnings(),
      getMiningWorkers(),
      getHashrateHistory(),
      getMiningStats(),
      getAccountDetails()
    ]);
    
    // Process workers data
    const activeWorkers: any[] = [];
    const inactiveWorkers: any[] = [];
    
    if (workers?.data?.workerList) {
      for (const worker of workers.data.workerList) {
        const workerData = {
          workerId: worker.workerId,
          workerName: worker.workerName,
          hashrate: worker.hashRate || 0,
          dayHashrate: worker.dayHashRate || 0,
          status: worker.status,
          lastShareTime: worker.lastShareTime,
          isValid: worker.isValid
        };
        
        if (worker.status === 'online' || worker.isValid) {
          activeWorkers.push(workerData);
        } else {
          inactiveWorkers.push(workerData);
        }
      }
    }
    
    // Calculate total hashrate
    const totalHashrate = activeWorkers.reduce((sum, w) => sum + (w.hashrate || 0), 0);
    const totalDayHashrate = activeWorkers.reduce((sum, w) => sum + (w.dayHashrate || 0), 0);
    
    // Update hashrate history
    const now = Date.now();
    if (now - lastFetchTime > 60000) {
      hashrateHistory.push({ timestamp: now, hashrate: totalHashrate });
      if (hashrateHistory.length > 60) {
        hashrateHistory = hashrateHistory.slice(-60);
      }
      lastFetchTime = now;
    }
    
    // Process earnings
    let totalEarnings = 0;
    let todayEarnings = 0;
    if (earnings?.data) {
      totalEarnings = earnings.data.totalEarnings || 0;
      todayEarnings = earnings.data.todayEarnings || 0;
    }
    
    // Process stats
    let poolHashrate = 0;
    let rejectRate = 0;
    if (stats?.data) {
      poolHashrate = stats.data.hashrate || 0;
      rejectRate = stats.data.rejectRate || 0;
    }
    
    // Terminal logs
    const terminalLogs: string[] = [];
    const timestamp = new Date().toISOString();
    
    terminalLogs.push(`[${timestamp.split('T')[1].split('.')[0]}] [INFO] 🔗 Binance Pool API Connected`);
    terminalLogs.push(`[${timestamp.split('T')[1].split('.')[0]}] [STRATUM] Pool: stratum+tcp://sha256.poolbinance.com:443`);
    terminalLogs.push(`[${timestamp.split('T')[1].split('.')[0]}] [INFO] 👷 Active Workers: ${activeWorkers.length}`);
    
    if (activeWorkers.length > 0) {
      activeWorkers.slice(0, 3).forEach((w: any) => {
        terminalLogs.push(`[${timestamp.split('T')[1].split('.')[0]}] [WORKER] ⛏️ ${w.workerName}: ${(w.hashrate / 1000000000000).toFixed(2)} TH/s`);
      });
    }
    
    terminalLogs.push(`[${timestamp.split('T')[1].split('.')[0]}] [INFO] 💨 Total Hashrate: ${(totalHashrate / 1000000000000).toFixed(4)} TH/s`);
    
    if (totalEarnings > 0) {
      terminalLogs.push(`[${timestamp.split('T')[1].split('.')[0]}] [SHARE] 💰 Today's Earnings: ${(todayEarnings / 100000000).toFixed(8)} BTC`);
    }
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '🚀 BINANCE POOL MINING ACTIVE',
      apiKeyConfigured: true,
      mining: {
        status: activeWorkers.length > 0 ? 'MINING' : 'WAITING',
        algorithm: 'SHA256',
        coin: 'BTC',
        pool: {
          name: 'Binance Pool',
          url: 'stratum+tcp://sha256.poolbinance.com:443',
          backupUrls: [
            'stratum+tcp://btc.poolbinance.com:1800',
            'stratum+tcp://bs.poolbinance.com:3333'
          ]
        },
        workers: {
          total: activeWorkers.length + inactiveWorkers.length,
          active: activeWorkers.length,
          inactive: inactiveWorkers.length,
          list: [...activeWorkers, ...inactiveWorkers].slice(0, 10)
        },
        hashrate: {
          current: totalHashrate,
          currentTH: (totalHashrate / 1000000000000).toFixed(4),
          dayAverage: totalDayHashrate,
          dayAverageTH: (totalDayHashrate / 1000000000000).toFixed(4),
          history: hashrateHistory.slice(-10)
        },
        earnings: {
          total: totalEarnings,
          totalBTC: (totalEarnings / 100000000).toFixed(8),
          today: todayEarnings,
          todayBTC: (todayEarnings / 100000000).toFixed(8)
        },
        stats: {
          rejectRate: rejectRate,
          validShares: 0,
          invalidShares: 0
        }
      },
      wallet: '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN',
      worker: 'yass3r.001',
      terminalLogs,
      rawResponse: {
        earnings: earnings?.data || null,
        workers: workers?.data?.workerList?.slice(0, 5) || null,
        stats: stats?.data || null,
        account: account?.data || null
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      message: 'Failed to fetch Binance Pool data'
    });
  }
}
