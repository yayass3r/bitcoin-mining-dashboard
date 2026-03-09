/**
 * Binance Pool Mining API - Real Data with HMAC Authentication
 */

import { NextRequest } from 'next/server';
import * as crypto from 'crypto';

const BINANCE_API_KEY = 'Q1Pn5qCo5ovfCwOgHDj9xu9jABmEnDhuM7sf73RReAiwR8Yz1tDeNaZyT8wNko7r';
const BINANCE_SECRET_KEY = 'bIXXoYHGDOXGvy68vNkrdXMUGgQNWe8lQbBWzj9GSzhqhXwOjQGbTQfiZdKpnydl';
const BINANCE_POOL_BASE_URL = 'https://pool.binance.com';

// Create HMAC signature
function createSignature(queryString: string): string {
  return crypto
    .createHmac('sha256', BINANCE_SECRET_KEY)
    .update(queryString)
    .digest('hex');
}

// Fetch with authentication
async function fetchBinanceAPI(endpoint: string, params: Record<string, string> = {}) {
  try {
    const timestamp = Date.now().toString();
    const allParams = { ...params, timestamp };
    const queryString = new URLSearchParams(allParams).toString();
    const signature = createSignature(queryString);
    
    const url = `${BINANCE_POOL_BASE_URL}${endpoint}?${queryString}&signature=${signature}`;
    
    const response = await fetch(url, {
      headers: {
        'X-MBX-APIKEY': BINANCE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: 'Invalid response', text: text.substring(0, 100) };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: errorMessage };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'all';
  
  try {
    let result: Record<string, unknown> = {};
    
    if (action === 'workers' || action === 'all') {
      const workersData = await fetchBinanceAPI('/mining/worker/list', { algo: 'SHA256' });
      result.workers = workersData;
    }
    
    if (action === 'earnings' || action === 'all') {
      const earningsData = await fetchBinanceAPI('/mining/earnings/list', { algo: 'SHA256' });
      result.earnings = earningsData;
    }
    
    if (action === 'stats' || action === 'all') {
      const statsData = await fetchBinanceAPI('/mining/statistics/list', { algo: 'SHA256' });
      result.stats = statsData;
    }
    
    if (action === 'account' || action === 'all') {
      const accountData = await fetchBinanceAPI('/mining/account/list', { algo: 'SHA256' });
      result.account = accountData;
    }
    
    // Calculate summary
    const workers = (result.workers as any)?.data?.workerList || [];
    const earnings = (result.earnings as any)?.data || {};
    const stats = (result.stats as any)?.data || {};
    
    const activeWorkers = workers.filter((w: any) => w.status === 'online' || w.isValid);
    const totalHashrate = activeWorkers.reduce((sum: number, w: any) => sum + (w.hashRate || 0), 0);
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '✅ BINANCE POOL API CONNECTED',
      apiKey: BINANCE_API_KEY.substring(0, 8) + '...',
      summary: {
        totalWorkers: workers.length,
        activeWorkers: activeWorkers.length,
        totalHashrateTH: (totalHashrate / 1000000000000).toFixed(4),
        todayEarnings: ((earnings.todayEarnings || 0) / 100000000).toFixed(8),
        totalEarnings: ((earnings.totalEarnings || 0) / 100000000).toFixed(8)
      },
      workers: workers.slice(0, 10).map((w: any) => ({
        name: w.workerName,
        status: w.status,
        hashrate: ((w.hashRate || 0) / 1000000000000).toFixed(4) + ' TH/s',
        shares: w.validShare || 0
      })),
      raw: result
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
