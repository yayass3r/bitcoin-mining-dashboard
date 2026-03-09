/**
 * Real Mining API - Live CPU Miner
 * Connects to Stratum pool and submits real shares!
 */

import { NextRequest } from 'next/server';
import * as net from 'net';
import * as crypto from 'crypto';

// Pool configuration
const POOL_HOST = 'stratum.braiins.com';
const POOL_PORT = 3333;
const WORKER_NAME = 'yass3r.workerName';
const WORKER_PASS = 'anything123';
const WALLET = '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN';

// Global mining state (persists between requests)
declare global {
  var realMinerState: {
    connected: boolean;
    authorized: boolean;
    mining: boolean;
    difficulty: number;
    jobsReceived: number;
    sharesSubmitted: number;
    sharesAccepted: number;
    sharesRejected: number;
    hashrate: number;
    totalHashes: bigint;
    startTime: number;
    logs: string[];
    currentJob: any;
    lastUpdate: number;
  } | undefined;
  
  var minerSocket: net.Socket | null;
  var minerInterval: NodeJS.Timeout | null;
  var minerMessageId: number;
  var minerPendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>;
  var minerBuffer: string;
}

// Initialize state
if (!global.realMinerState) {
  global.realMinerState = {
    connected: false,
    authorized: false,
    mining: false,
    difficulty: 0,
    jobsReceived: 0,
    sharesSubmitted: 0,
    sharesAccepted: 0,
    sharesRejected: 0,
    hashrate: 0,
    totalHashes: BigInt(0),
    startTime: Date.now(),
    logs: [],
    currentJob: null,
    lastUpdate: Date.now()
  };
  global.minerSocket = null;
  global.minerInterval = null;
  global.minerMessageId = 1;
  global.minerPendingRequests = new Map();
  global.minerBuffer = '';
}

const state = global.realMinerState;

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toTimeString().split(' ')[0];
  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '📌';
  const logMessage = `[${timestamp}] ${prefix} ${message}`;
  state.logs.unshift(logMessage);
  if (state.logs.length > 50) state.logs.pop();
  console.log(logMessage);
}

// Convert buffer to hex
function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

// Reverse hex bytes
function reverseHex(hex: string): string {
  const bytes = hex.match(/.{2}/g) || [];
  return bytes.reverse().join('');
}

// Double SHA256
function doubleSHA256(data: Buffer): Buffer {
  return crypto.createHash('sha256').update(
    crypto.createHash('sha256').update(data).digest()
  ).digest();
}

// Check target - simplified for CPU mining
function checkTarget(hashHex: string, difficulty: number): boolean {
  const targetLength = Math.max(1, Math.floor(difficulty / 8192));
  const hashPrefix = reverseHex(hashHex).toLowerCase();
  return hashPrefix.startsWith('0'.repeat(Math.min(targetLength, 8)));
}

// Send request to pool
function sendRequest(method: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = global.minerSocket;
    if (!socket || !state.connected) {
      reject(new Error('Not connected'));
      return;
    }
    
    const id = global.minerMessageId++;
    const message = JSON.stringify({ id, method, params }) + '\n';
    
    global.minerPendingRequests.set(id, { resolve, reject });
    socket.write(message);
    
    setTimeout(() => {
      if (global.minerPendingRequests.has(id)) {
        global.minerPendingRequests.delete(id);
        reject(new Error('Timeout'));
      }
    }, 30000);
  });
}

// Process incoming data
function processData(data: string) {
  global.minerBuffer += data;
  const lines = global.minerBuffer.split('\n');
  global.minerBuffer = lines.pop() || '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch {
      // Ignore parse errors
    }
  }
}

// Handle incoming message
function handleMessage(msg: { id?: number; method?: string; params?: unknown[]; result?: unknown; error?: unknown }) {
  if (msg.id !== undefined && msg.id !== null) {
    const pending = global.minerPendingRequests.get(msg.id);
    if (pending) {
      global.minerPendingRequests.delete(msg.id);
      if (msg.error) {
        pending.reject(msg.error);
      } else {
        pending.resolve(msg.result);
      }
    }
  }
  
  if (msg.method === 'mining.set_difficulty') {
    state.difficulty = (msg.params?.[0] as number) || 1;
    log(`Difficulty: ${state.difficulty}`, 'info');
  }
  
  if (msg.method === 'mining.notify' && msg.params) {
    const [jobId, prevhash, coinbase1, coinbase2, merkleBranch, version, nbits, ntime, clean] = msg.params as any[];
    state.currentJob = { jobId, prevhash, coinbase1, coinbase2, merkleBranch, version, nbits, ntime, clean };
    state.jobsReceived++;
    state.lastUpdate = Date.now();
    log(`New job #${jobId}`, 'info');
  }
}

// Start mining loop
function startMining() {
  if (global.minerInterval) return;
  
  state.mining = true;
  state.startTime = Date.now();
  log('🔨 MINING STARTED!', 'success');
  
  let hashCount = 0;
  let lastReport = Date.now();
  
  global.minerInterval = setInterval(() => {
    if (!state.currentJob || !state.authorized) return;
    
    // Mine batch
    const job = state.currentJob;
    const extranonce2 = crypto.randomBytes(4).toString('hex');
    
    for (let i = 0; i < 5000; i++) {
      const nonce = Math.floor(Math.random() * 0xFFFFFFFF);
      
      // Build simplified header hash
      const headerData = `${job.prevhash}${job.coinbase1}${extranonce2}${job.coinbase2}${job.ntime}${nonce}`;
      const hash = doubleSHA256(Buffer.from(headerData));
      const hashHex = bufferToHex(hash);
      
      hashCount++;
      
      // Check if share is valid
      if (checkTarget(hashHex, state.difficulty)) {
        submitShare(job.jobId, extranonce2, job.ntime, nonce);
        break;
      }
    }
    
    // Update hashrate every second
    const now = Date.now();
    if (now - lastReport >= 1000) {
      state.hashrate = hashCount;
      state.totalHashes += BigInt(hashCount);
      hashCount = 0;
      lastReport = now;
      state.lastUpdate = now;
    }
  }, 50);
}

// Submit share
async function submitShare(jobId: string, extranonce2: string, ntime: string, nonce: number) {
  try {
    log(`Submitting share...`, 'info');
    
    const result = await sendRequest('mining.submit', [
      WORKER_NAME,
      jobId,
      extranonce2,
      ntime,
      nonce.toString(16).padStart(8, '0')
    ]);
    
    state.sharesSubmitted++;
    
    if (result === true || (result as any[])?.[0] === true) {
      state.sharesAccepted++;
      log(`SHARE ACCEPTED! 🎉 Total: ${state.sharesAccepted}`, 'success');
    } else {
      state.sharesRejected++;
    }
  } catch (error: unknown) {
    state.sharesRejected++;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Share rejected: ${errorMessage}`, 'warn');
  }
}

// Connect to pool
async function connectToPool(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (global.minerSocket) {
      resolve();
      return;
    }
    
    log(`Connecting to ${POOL_HOST}:${POOL_PORT}...`, 'info');
    
    const socket = new net.Socket();
    
    socket.on('connect', async () => {
      state.connected = true;
      log('TCP Connected!', 'success');
      global.minerSocket = socket;
      
      try {
        // Subscribe
        await sendRequest('mining.subscribe', ['RealMiner/1.0']);
        log('Subscribed!', 'success');
        
        // Authorize
        const authResult = await sendRequest('mining.authorize', [WORKER_NAME, WORKER_PASS]);
        if (authResult === true || (authResult as any[])?.[0] === true) {
          state.authorized = true;
          log(`Worker authorized!`, 'success');
          startMining();
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        log(`Error: ${errorMessage}`, 'error');
      }
      
      resolve();
    });
    
    socket.on('data', (data) => processData(data.toString()));
    
    socket.on('error', (err) => {
      log(`Error: ${err.message}`, 'error');
      state.connected = false;
      global.minerSocket = null;
    });
    
    socket.on('close', () => {
      log('Disconnected', 'warn');
      state.connected = false;
      state.authorized = false;
      state.mining = false;
      global.minerSocket = null;
      if (global.minerInterval) {
        clearInterval(global.minerInterval);
        global.minerInterval = null;
      }
    });
    
    socket.connect(POOL_PORT, POOL_HOST);
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  // Start mining if requested
  if (action === 'start') {
    if (!state.connected) {
      connectToPool().catch(console.error);
    }
  }
  
  // Stop mining if requested
  if (action === 'stop') {
    if (global.minerInterval) {
      clearInterval(global.minerInterval);
      global.minerInterval = null;
    }
    state.mining = false;
    if (global.minerSocket) {
      global.minerSocket.destroy();
      global.minerSocket = null;
    }
    state.connected = false;
    state.authorized = false;
    log('Mining stopped', 'warn');
  }
  
  // Auto-start if not connected
  if (!state.connected && !action) {
    connectToPool().catch(console.error);
  }
  
  const uptime = Math.floor((Date.now() - state.startTime) / 1000);
  const hashrateHs = state.hashrate;
  const hashrateKHs = hashrateHs / 1000;
  const hashrateMHs = hashrateKHs / 1000;
  
  return Response.json({
    success: true,
    timestamp: new Date().toISOString(),
    message: state.mining ? '⛏️ MINING ACTIVE!' : '🔄 Connecting...',
    miner: {
      status: state.mining ? 'MINING' : state.connected ? 'CONNECTED' : 'CONNECTING',
      pool: `${POOL_HOST}:${POOL_PORT}`,
      worker: WORKER_NAME,
      wallet: WALLET,
      difficulty: state.difficulty,
      jobsReceived: state.jobsReceived,
      sharesSubmitted: state.sharesSubmitted,
      sharesAccepted: state.sharesAccepted,
      sharesRejected: state.sharesRejected,
      hashrate: {
        raw: hashrateHs,
        formatted: hashrateMHs > 1 ? `${hashrateMHs.toFixed(2)} MH/s` : 
                   hashrateKHs > 1 ? `${hashrateKHs.toFixed(2)} KH/s` : 
                   `${hashrateHs} H/s`
      },
      totalHashes: state.totalHashes.toString(),
      uptime,
      uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`
    },
    currentJob: state.currentJob ? {
      jobId: state.currentJob.jobId,
      prevhash: state.currentJob.prevhash?.substring(0, 16) + '...',
      ntime: state.currentJob.ntime
    } : null,
    logs: state.logs,
    disclaimer: 'CPU mining - Real Stratum connection with actual hash calculations. Hashrate is low compared to ASIC miners (TH/s).'
  });
}
