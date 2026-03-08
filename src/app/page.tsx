'use client'

import { useState, useEffect, useCallback } from 'react'

interface Miner {
  id: number
  name: string
  status: string
  shares: number
  hashrate: number
  lastShare: string | null
}

interface Share {
  id: number
  worker: string
  difficulty: number
  timestamp: string
  isValid: boolean
}

interface Block {
  height: number
  hash: string
  miner: string
  reward: number
  timestamp: string
}

interface MiningData {
  wallet: string
  port: number
  isRunning: boolean
  uptime: number
  difficulty: number
  totalShares: number
  totalBlocks: number
  hashrate: number
  activeMiners: number
  miners: Miner[]
  recentShares: Share[]
  blocks: Block[]
}

export default function MiningDashboard() {
  const [data, setData] = useState<MiningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hashHistory, setHashHistory] = useState<number[]>([])
  const [sharesHistory, setSharesHistory] = useState<number[]>([])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/mining')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setHashHistory(prev => [...prev.slice(-59), json.data.hashrate])
        setSharesHistory(prev => [...prev.slice(-59), json.data.totalShares])
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString()
  }

  const toggleMining = async (action: 'start' | 'stop') => {
    await fetch('/api/mining', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
    fetchData()
  }

  const addMiner = async () => {
    await fetch('/api/mining', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_miner' })
    })
    fetchData()
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center', color: '#f7931a' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⛏️</div>
          <div style={{ fontSize: '24px' }}>Loading Mining Pool...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      padding: '20px',
      fontFamily: 'monospace',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #f7931a 0%, #ffab40 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(247, 147, 26, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#000' }}>
              ⛏️ Bitcoin Mining Pool
            </h1>
            <p style={{ margin: '8px 0 0', color: '#333', fontSize: '14px' }}>
              Real-time Mining Dashboard
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => toggleMining(data?.isRunning ? 'stop' : 'start')}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: data?.isRunning ? '#ef4444' : '#22c55e',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {data?.isRunning ? '⏹️ Stop Mining' : '▶️ Start Mining'}
            </button>
            <button
              onClick={addMiner}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ➕ Add Miner
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {[
          { label: ' miners', value: data?.activeMiners || 0, icon: '👷', color: '#22c55e' },
          { label: 'Total Shares', value: data?.totalShares?.toLocaleString() || 0, icon: '⛏️', color: '#f7931a' },
          { label: 'Blocks Found', value: data?.totalBlocks || 0, icon: '🎉', color: '#8b5cf6' },
          { label: 'Hashrate', value: `${(data?.hashrate || 0).toFixed(1)} GH/s`, icon: '💨', color: '#06b6d4' },
          { label: 'Uptime', value: formatUptime(data?.uptime || 0), icon: '⏱️', color: '#ec4899' },
          { label: 'Difficulty', value: data?.difficulty || 0, icon: '📊', color: '#f43f5e' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: `4px solid ${stat.color}`,
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Wallet Info */}
      <div style={{
        background: 'rgba(247, 147, 26, 0.1)',
        border: '1px solid rgba(247, 147, 26, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '24px' }}>💰</span>
        <div>
          <div style={{ fontSize: '12px', color: '#888' }}>Mining Wallet</div>
          <div style={{ fontFamily: 'monospace', color: '#f7931a', wordBreak: 'break-all' }}>
            {data?.wallet}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#888' }}>Stratum Port</div>
          <div style={{ color: '#22c55e', fontWeight: 'bold' }}>{data?.port}</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {/* Miners Table */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#f7931a', fontSize: '18px' }}>
            👷 Active Miners
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', color: '#888' }}>Worker</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', color: '#888' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#888' }}>Hashrate</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#888' }}>Shares</th>
                </tr>
              </thead>
              <tbody>
                {data?.miners?.map((miner) => (
                  <tr key={miner.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 8px', color: '#fff' }}>
                      <span style={{ marginRight: '8px' }}>⛏️</span>
                      {miner.name}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <span style={{
                        background: miner.status === 'active' ? '#22c55e' : '#ef4444',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff'
                      }}>
                        {miner.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#06b6d4' }}>
                      {miner.hashrate.toFixed(1)} GH/s
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#f7931a' }}>
                      {miner.shares.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Shares */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#22c55e', fontSize: '18px' }}>
            ⛏️ Recent Shares
          </h2>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {data?.recentShares?.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                Waiting for shares...
              </div>
            ) : (
              data?.recentShares?.map((share, i) => (
                <div key={share.id || i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderRadius: '8px',
                  marginBottom: '4px',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: share.isValid ? '#22c55e' : '#ef4444' }}>
                      {share.isValid ? '✓' : '✗'}
                    </span>
                    <span style={{ color: '#fff' }}>{share.worker}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#888' }}>Diff: {share.difficulty}</span>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      {formatTime(share.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hashrate Chart */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#06b6d4', fontSize: '18px' }}>
            📈 Hashrate History
          </h2>
          <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
            {hashHistory.map((hr, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: `linear-gradient(to top, #06b6d4, #0891b2)`,
                  height: `${Math.min((hr / 200) * 100, 100)}%`,
                  borderRadius: '2px 2px 0 0',
                  minHeight: '2px'
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#666' }}>
            <span>60s ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Blocks Found */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#8b5cf6', fontSize: '18px' }}>
            🎉 Blocks Found
          </h2>
          {data?.blocks?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
              <div>No blocks found yet...</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>Keep mining!</div>
            </div>
          ) : (
            data?.blocks?.map((block) => (
              <div key={block.height} style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                    Block #{block.height}
                  </span>
                  <span style={{ color: '#22c55e' }}>
                    +{block.reward} BTC
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#888', wordBreak: 'break-all' }}>
                  Hash: {block.hash}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Found by: {block.miner} • {formatTime(block.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        paddingBottom: '20px',
        color: '#666',
        fontSize: '12px'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#f7931a' }}>⚡</span> Bitcoin Mining Pool v2.0
        </div>
        <div>
          Stratum: stratum+tcp://{window.location.hostname || 'localhost'}:{data?.port}
        </div>
      </div>
    </div>
  )
}
