/**
 * Real Bitcoin Miner - SHA256 Hash Calculator
 * Connects to Stratum pool and submits real shares!
 */

import * as net from 'net';
import * as crypto from 'crypto';

// Mining configuration
const POOL_HOST = 'stratum.braiins.com';
const POOL_PORT = 3333;
const WORKER_NAME = 'yass3r.workerName';
const WORKER_PASS = 'anything123';
const WALLET = '1LDkwJs9whVa2iTh8LRsThDrCympoM9QXN';

// Global mining state
interface MiningJob {
  jobId: string;
  prevhash: string;
  coinbase1: string;
  coinbase2: string;
  merkleBranch: string[];
  version: string;
  nbits: string;
  ntime: string;
  clean: boolean;
  target: bigint;
  difficulty: number;
}

interface MiningState {
  connected: boolean;
  authorized: boolean;
  subscriptionId: string;
  extranonce1: string;
  extranonce2Size: number;
  difficulty: number;
  currentJob: MiningJob | null;
  jobsReceived: number;
  sharesSubmitted: number;
  sharesAccepted: number;
  sharesRejected: number;
  hashrate: number;
  totalHashes: bigint;
  startTime: number;
  logs: string[];
  mining: boolean;
}

const state: MiningState = {
  connected: false,
  authorized: false,
  subscriptionId: '',
  extranonce1: '',
  extranonce2Size: 0,
  difficulty: 1,
  currentJob: null,
  jobsReceived: 0,
  sharesSubmitted: 0,
  sharesAccepted: 0,
  sharesRejected: 0,
  hashrate: 0,
  totalHashes: BigInt(0),
  startTime: Date.now(),
  logs: [],
  mining: false
};

let socket: net.Socket | null = null;
let messageId = 1;
let pendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = new Map();
let buffer = '';
let miningInterval: NodeJS.Timeout | null = null;

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toTimeString().split(' ')[0];
  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '📌';
  const logMessage = `[${timestamp}] ${prefix} ${message}`;
  state.logs.unshift(logMessage);
  console.log(logMessage);
  if (state.logs.length > 100) state.logs.pop();
}

// Convert hex to buffer
function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

// Convert buffer to hex
function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

// Reverse bytes in hex string (Bitcoin uses little-endian)
function reverseHex(hex: string): string {
  const bytes = hex.match(/.{2}/g) || [];
  return bytes.reverse().join('');
}

// Calculate SHA256 double hash
function doubleSHA256(data: Buffer): Buffer {
  return crypto.createHash('sha256').update(
    crypto.createHash('sha256').update(data).digest()
  ).digest();
}

// Convert difficulty to target
function difficultyToTarget(difficulty: number): bigint {
  const maxTarget = BigInt('0x00000000ffff0000000000000000000000000000000000000000000000000000');
  return maxTarget / BigInt(Math.floor(difficulty));
}

// Check if hash meets target
function checkTarget(hashHex: string, target: bigint): boolean {
  const hashValue = BigInt('0x' + reverseHex(hashHex));
  return hashValue < target;
}

// Build coinbase transaction
function buildCoinbase(coinbase1: string, extranonce1: string, extranonce2: string, coinbase2: string): Buffer {
  return Buffer.concat([
    hexToBuffer(coinbase1),
    hexToBuffer(extranonce1),
    hexToBuffer(extranonce2),
    hexToBuffer(coinbase2)
  ]);
}

// Calculate merkle root
function calculateMerkleRoot(coinbaseHash: Buffer, merkleBranch: string[]): Buffer {
  let hash = coinbaseHash;
  for (const branch of merkleBranch) {
    const branchBuffer = hexToBuffer(branch);
    hash = doubleSHA256(Buffer.concat([hash, branchBuffer]));
  }
  return hash;
}

// Build block header for hashing
function buildBlockHeader(
  version: string,
  prevhash: string,
  merkleRoot: string,
  ntime: string,
  nbits: string,
  nonce: number
): Buffer {
  const header = Buffer.alloc(80);
  
  // Version (4 bytes, little-endian)
  header.writeUInt32LE(parseInt(version, 16), 0);
  
  // Previous block hash (32 bytes, already reversed)
  const prevhashBuffer = hexToBuffer(reverseHex(prevhash));
  prevhashBuffer.copy(header, 4);
  
  // Merkle root (32 bytes)
  const merkleBuffer = hexToBuffer(merkleRoot);
  merkleBuffer.copy(header, 36);
  
  // Timestamp (4 bytes)
  header.writeUInt32LE(parseInt(ntime, 16), 68);
  
  // Bits (4 bytes)
  header.writeUInt32LE(parseInt(nbits, 16), 72);
  
  // Nonce (4 bytes)
  header.writeUInt32LE(nonce, 76);
  
  return header;
}

// Send JSON-RPC request
function sendRequest(method: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!socket || !state.connected) {
      reject(new Error('Not connected'));
      return;
    }
    
    const id = messageId++;
    const message = JSON.stringify({ id, method, params }) + '\n';
    
    pendingRequests.set(id, { resolve, reject });
    socket.write(message);
    
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Timeout'));
      }
    }, 30000);
  });
}

// Process incoming data
function processData(data: string) {
  buffer += data;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (e) {
      console.error('Parse error:', line);
    }
  }
}

// Handle incoming message
function handleMessage(msg: any) {
  if (msg.id !== undefined && msg.id !== null) {
    const pending = pendingRequests.get(msg.id);
    if (pending) {
      pendingRequests.delete(msg.id);
      if (msg.error) {
        pending.reject(msg.error);
      } else {
        pending.resolve(msg.result);
      }
    }
  }
  
  if (msg.method === 'mining.set_difficulty') {
    state.difficulty = msg.params?.[0] || 1;
    log(`Difficulty set to: ${state.difficulty}`, 'info');
  }
  
  if (msg.method === 'mining.notify') {
    handleNewJob(msg.params);
  }
}

// Handle new mining job
function handleNewJob(params: any[]) {
  const [jobId, prevhash, coinbase1, coinbase2, merkleBranch, version, nbits, ntime, clean] = params;
  
  state.currentJob = {
    jobId,
    prevhash,
    coinbase1,
    coinbase2,
    merkleBranch,
    version,
    nbits,
    ntime,
    clean,
    target: difficultyToTarget(state.difficulty),
    difficulty: state.difficulty
  };
  
  state.jobsReceived++;
  log(`New job #${jobId} | Difficulty: ${state.difficulty}`, 'info');
  
  // Start mining this job
  if (state.authorized && !state.mining) {
    startMining();
  }
}

// Start mining loop
function startMining() {
  if (miningInterval) return;
  
  state.mining = true;
  state.startTime = Date.now();
  log('🔨 MINING STARTED!', 'success');
  
  let hashCount = 0;
  let lastReport = Date.now();
  
  miningInterval = setInterval(() => {
    if (!state.currentJob || !state.authorized) return;
    
    mineBatch(state.currentJob, 1000);
    
    hashCount += 1000;
    const now = Date.now();
    
    // Report hashrate every second
    if (now - lastReport >= 1000) {
      state.hashrate = hashCount;
      state.totalHashes += BigInt(hashCount);
      hashCount = 0;
      lastReport = now;
    }
  }, 10);
}

// Mine a batch of nonces
function mineBatch(job: MiningJob, count: number) {
  // Generate random extranonce2
  const extranonce2 = Buffer.alloc(state.extranonce2Size);
  crypto.randomFillSync(extranonce2);
  const extranonce2Hex = extranonce2.toString('hex').padStart(state.extranonce2Size * 2, '0');
  
  // Build coinbase
  const coinbase = buildCoinbase(job.coinbase1, state.extranonce1, extranonce2Hex, job.coinbase2);
  const coinbaseHash = doubleSHA256(coinbase);
  
  // Calculate merkle root
  const merkleRoot = calculateMerkleRoot(coinbaseHash, job.merkleBranch);
  const merkleRootHex = bufferToHex(merkleRoot);
  
  // Try nonces
  const startNonce = Math.floor(Math.random() * 0xFFFFFFFF);
  
  for (let i = 0; i < count; i++) {
    const nonce = (startNonce + i) >>> 0;
    
    // Build block header
    const header = buildBlockHeader(
      job.version,
      job.prevhash,
      merkleRootHex,
      job.ntime,
      job.nbits,
      nonce
    );
    
    // Calculate hash
    const hash = doubleSHA256(header);
    const hashHex = bufferToHex(hash);
    
    // Check if share is valid (much lower target for CPU mining)
    // We'll accept shares that meet a much lower difficulty
    const shareTarget = difficultyToTarget(Math.min(state.difficulty, 1));
    
    if (checkTarget(hashHex, shareTarget)) {
      submitShare(job.jobId, extranonce2Hex, job.ntime, nonce, hashHex);
      break; // Only submit one share per batch
    }
  }
}

// Submit share to pool
async function submitShare(jobId: string, extranonce2: string, ntime: string, nonce: number, hashHex: string) {
  try {
    log(`Submitting share for job ${jobId}...`, 'info');
    
    const result = await sendRequest('mining.submit', [
      WORKER_NAME,
      jobId,
      extranonce2,
      ntime,
      nonce.toString(16).padStart(8, '0')
    ]);
    
    state.sharesSubmitted++;
    
    if (result === true || result?.[0] === true) {
      state.sharesAccepted++;
      log(`SHARE ACCEPTED! 🎉 Total: ${state.sharesAccepted}`, 'success');
    } else {
      state.sharesRejected++;
      log(`Share rejected: ${JSON.stringify(result)}`, 'warn');
    }
  } catch (error: any) {
    state.sharesRejected++;
    log(`Submit error: ${error.message || error}`, 'error');
  }
}

// Connect to pool
async function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`Connecting to ${POOL_HOST}:${POOL_PORT}...`, 'info');
    
    socket = new net.Socket();
    
    socket.on('connect', () => {
      state.connected = true;
      log('TCP Connected!', 'success');
      resolve();
    });
    
    socket.on('data', (data) => processData(data.toString()));
    
    socket.on('error', (err) => {
      log(`Connection error: ${err.message}`, 'error');
      state.connected = false;
      reject(err);
    });
    
    socket.on('close', () => {
      log('Connection closed', 'warn');
      state.connected = false;
      state.authorized = false;
      state.mining = false;
      if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
      }
      // Reconnect after 5 seconds
      setTimeout(() => connect(), 5000);
    });
    
    socket.connect(POOL_PORT, POOL_HOST);
  });
}

// Subscribe to pool
async function subscribe(): Promise<void> {
  log('Subscribing...', 'info');
  
  const result = await sendRequest('mining.subscribe', ['Miner/1.0.0']);
  
  if (result) {
    const [[notifications], subscriptionId, extranonce1, extranonce2Size] = result;
    state.subscriptionId = subscriptionId || '';
    state.extranonce1 = extranonce1 || '';
    state.extranonce2Size = extranonce2Size || 4;
    
    log(`Subscribed! Extranonce: ${state.extranonce1}`, 'success');
  }
}

// Authorize worker
async function authorize(): Promise<void> {
  log(`Authorizing ${WORKER_NAME}...`, 'info');
  
  const result = await sendRequest('mining.authorize', [WORKER_NAME, WORKER_PASS]);
  
  if (result === true || result?.[0] === true) {
    state.authorized = true;
    log(`Worker ${WORKER_NAME} authorized!`, 'success');
  } else {
    throw new Error('Authorization failed');
  }
}

// Get mining statistics
function getStats() {
  const uptime = Math.floor((Date.now() - state.startTime) / 1000);
  const hashrateHs = state.hashrate;
  const hashrateKHs = hashrateHs / 1000;
  const hashrateMHs = hashrateKHs / 1000;
  
  return {
    connected: state.connected,
    authorized: state.authorized,
    mining: state.mining,
    pool: `${POOL_HOST}:${POOL_PORT}`,
    worker: WORKER_NAME,
    wallet: WALLET,
    difficulty: state.difficulty,
    jobsReceived: state.jobsReceived,
    sharesSubmitted: state.sharesSubmitted,
    sharesAccepted: state.sharesAccepted,
    sharesRejected: state.sharesRejected,
    hashrate: hashrateHs,
    hashrateFormatted: hashrateMHs > 1 ? `${hashrateMHs.toFixed(2)} MH/s` : 
                        hashrateKHs > 1 ? `${hashrateKHs.toFixed(2)} KH/s` : 
                        `${hashrateHs} H/s`,
    totalHashes: state.totalHashes.toString(),
    uptime,
    uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
    logs: state.logs.slice(0, 20)
  };
}

// Start miner
async function startMiner() {
  try {
    await connect();
    await subscribe();
    await authorize();
    
    log('🎉 READY TO MINE! Waiting for jobs...', 'success');
    
  } catch (error: any) {
    log(`Startup error: ${error.message}`, 'error');
  }
}

// Export for API
export {
  state,
  getStats,
  startMiner,
  MiningState
};

// Run if executed directly
if (require.main === module) {
  startMiner();
}
