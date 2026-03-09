/**
 * Stratum Protocol Client - Real Mining Pool Connection Test
 * This script connects to real mining pools using the Stratum protocol
 */

import * as net from 'net';

interface StratumMessage {
  id?: number | null;
  method?: string;
  params?: any[];
  result?: any;
  error?: any;
}

class StratumClient {
  private socket: net.Socket | null = null;
  private messageId = 1;
  private pendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = new Map();
  private buffer = '';
  private isConnected = false;
  private authorized = false;
  private poolUrl: string;
  private poolPort: number;
  private workerName: string;
  private workerPassword: string;

  constructor(poolUrl: string, poolPort: number, workerName: string, workerPassword: string) {
    this.poolUrl = poolUrl;
    this.poolPort = poolPort;
    this.workerName = workerName;
    this.workerPassword = workerPassword;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`\n🔌 Connecting to ${this.poolUrl}:${this.poolPort}...`);
      
      this.socket = new net.Socket();
      
      this.socket.on('connect', () => {
        console.log('✅ TCP Connection established!');
        this.isConnected = true;
        resolve();
      });

      this.socket.on('data', (data) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.socket.on('error', (err) => {
        console.error('❌ Socket error:', err.message);
        reject(err);
      });

      this.socket.on('close', () => {
        console.log('🔌 Connection closed');
        this.isConnected = false;
      });

      this.socket.connect(this.poolPort, this.poolUrl);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message: StratumMessage = JSON.parse(line);
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse message:', line);
        }
      }
    }
  }

  private handleMessage(message: StratumMessage): void {
    if (message.id !== undefined && message.id !== null) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(message.error);
        } else {
          pending.resolve(message.result);
        }
      }
    }

    if (message.method) {
      console.log(`\n📨 Received notification: ${message.method}`);
      if (message.params) {
        console.log('   Params:', JSON.stringify(message.params, null, 2));
      }
    }
  }

  async sendRequest(method: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected'));
        return;
      }

      const id = this.messageId++;
      const message = JSON.stringify({
        id,
        method,
        params
      }) + '\n';

      console.log(`\n📤 Sending: ${method}`);
      console.log('   Params:', JSON.stringify(params));

      this.pendingRequests.set(id, { resolve, reject });
      this.socket.write(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  async subscribe(): Promise<any> {
    console.log('\n📋 Subscribing to mining notifications...');
    const result = await this.sendRequest('mining.subscribe', [
      'MyMiningClient/1.0.0'
    ]);
    console.log('✅ Subscribed successfully!');
    console.log('   Subscription details:', JSON.stringify(result, null, 2));
    return result;
  }

  async authorize(): Promise<boolean> {
    console.log('\n🔐 Authorizing worker...');
    try {
      const result = await this.sendRequest('mining.authorize', [
        this.workerName,
        this.workerPassword
      ]);
      this.authorized = result === true || result?.[0] === true;
      if (this.authorized) {
        console.log(`✅ Worker "${this.workerName}" authorized successfully!`);
      } else {
        console.log(`❌ Worker authorization failed!`);
      }
      return this.authorized;
    } catch (error: any) {
      console.error('❌ Authorization error:', error);
      return false;
    }
  }

  async suggestDifficulty(difficulty: number): Promise<any> {
    console.log(`\n⚙️ Suggesting difficulty: ${difficulty}`);
    try {
      const result = await this.sendRequest('mining.suggest_difficulty', [difficulty]);
      console.log('✅ Difficulty suggested');
      return result;
    } catch (error: any) {
      console.log('⚠️ Difficulty suggestion not supported or failed');
      return null;
    }
  }

  async waitForJobs(timeout: number = 10000): Promise<void> {
    console.log(`\n⏳ Waiting for mining jobs (${timeout/1000}s)...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

// Test connections to multiple pools
async function testBraiinsPool(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🐟 TESTING BRAIINS POOL CONNECTION');
  console.log('='.repeat(60));

  const client = new StratumClient(
    'stratum.braiins.com',
    3333,
    'yass3r.workerName',
    'anything123'
  );

  try {
    await client.connect();
    const subResult = await client.subscribe();
    await client.suggestDifficulty(16);
    const authorized = await client.authorize();
    
    if (authorized) {
      console.log('\n🎉 SUCCESS! Your worker is authorized and ready to mine!');
      console.log('   The pool will send mining jobs when work is available.');
      await client.waitForJobs(15000);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.disconnect();
  }
}

async function testBinancePool(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('💎 TESTING BINANCE POOL CONNECTION');
  console.log('='.repeat(60));

  const client = new StratumClient(
    'sha256.poolbinance.com',
    443,
    'yass3r.001',
    '123456'
  );

  try {
    await client.connect();
    const subResult = await client.subscribe();
    const authorized = await client.authorize();
    
    if (authorized) {
      console.log('\n🎉 SUCCESS! Binance Pool connection working!');
      await client.waitForJobs(10000);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.disconnect();
  }
}

async function testBinancePoolAlt(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('💎 TESTING BINANCE POOL (Port 1800)');
  console.log('='.repeat(60));

  const client = new StratumClient(
    'btc.poolbinance.com',
    1800,
    'yass3r.001',
    '123456'
  );

  try {
    await client.connect();
    await client.subscribe();
    const authorized = await client.authorize();
    if (authorized) {
      console.log('\n🎉 SUCCESS! Binance Pool (1800) connection working!');
      await client.waitForJobs(10000);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.disconnect();
  }
}

async function main(): Promise<void> {
  console.log('\n🚀 MINING POOL CONNECTION TEST');
  console.log('================================');
  console.log('Testing real Stratum protocol connections...\n');

  // Test Braiins Pool
  await testBraiinsPool();
  
  // Test Binance Pool
  await testBinancePool();
  
  // Test Binance Pool Alt
  await testBinancePoolAlt();

  console.log('\n' + '='.repeat(60));
  console.log('🏁 CONNECTION TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\n📝 Summary:');
  console.log('   - If you see "✅ Worker authorized successfully!"');
  console.log('     then your credentials are valid and working!');
  console.log('   - Real mining requires ASIC hardware to submit hashes');
  console.log('   - This test only verifies connection and authorization');
}

main().catch(console.error);
