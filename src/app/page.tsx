'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Miner {
  id: number
  name: string
  status: string
  shares: number
  hashrate: number
  lastShare: string | null
  pool?: string
}

interface PoolConfig {
  name: string
  url: string
  worker: string
  password: string
  status: string
  algorithm?: string
}

interface LivePool {
  name: string
  url: string
  worker: string
  status: string
  difficulty: number
  jobsReceived: number
  lastJob: any
  lastUpdate: string | null
  error: string | null
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
  totalWorkers: number
  miners: Miner[]
  recentShares: any[]
  blocks: any[]
  terminalLogs: string[]
  poolConfigs?: PoolConfig[]
  pools?: {
    braiins: LivePool
    binance: LivePool
  }
}

export default function MiningDashboard() {
  const [data, setData] = useState<MiningData | null>(null)
  const [liveData, setLiveData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hashHistory, setHashHistory] = useState<number[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/mining')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setHashHistory(prev => [...prev.slice(-59), json.data.hashrate])
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch('/api/live-mining')
      const json = await res.json()
      if (json.success) {
        setLiveData(json)
      }
    } catch (e) {
      console.error('Live fetch error:', e)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchLiveData()
    const interval = setInterval(fetchData, 1000)
    const liveInterval = setInterval(fetchLiveData, 3000)
    return () => {
      clearInterval(interval)
      clearInterval(liveInterval)
    }
  }, [fetchData, fetchLiveData])

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [data?.terminalLogs, autoScroll])

  const getLogColor = (log: string) => {
    if (log.includes('[BLOCK]')) return '#fbbf24'
    if (log.includes('[SHARE]')) return '#22c55e'
    if (log.includes('[WARN]')) return '#f97316'
    if (log.includes('[INFO]')) return '#06b6d4'
    if (log.includes('[STRATUM]')) return '#a855f7'
    if (log.includes('BRAIINS')) return '#f7931a'
    if (log.includes('BINANCE')) return '#f0b90b'
    return '#22c55e'
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString()
  }

  const getPoolBadgeColor = (pool?: string) => {
    if (pool === 'Braiins') return { bg: '#f7931a', color: '#000' }
    if (pool === 'Binance') return { bg: '#f0b90b', color: '#000' }
    return { bg: '#6b7280', color: '#fff' }
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
          <div style={{ fontSize: '24px' }}>Loading Mining Pools...</div>
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
        background: 'linear-gradient(90deg, #f7931a 0%, #f0b90b 50%, #f7931a 100%)',
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
              Multi-Pool Dashboard: Braiins + Binance | 24/7 Active
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{
              background: '#000',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f7931a'
            }}>
              🔶 Braiins | 🟡 Binance
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {[
          { label: 'Active Miners', value: data?.activeMiners || 0, icon: '👷', color: '#22c55e' },
          { label: 'Total Workers', value: data?.totalWorkers || 0, icon: '👥', color: '#f0b90b' },
          { label: 'Total Shares', value: data?.totalShares?.toLocaleString() || 0, icon: '⛏️', color: '#f7931a' },
          { label: 'Blocks Found', value: data?.totalBlocks || 0, icon: '🎉', color: '#8b5cf6' },
          { label: 'Hashrate', value: `${(data?.hashrate || 0).toFixed(1)} GH/s`, icon: '💨', color: '#06b6d4' },
          { label: 'Uptime', value: formatUptime(data?.uptime || 0), icon: '⏱️', color: '#ec4899' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '16px',
            borderLeft: `4px solid ${stat.color}`
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Pool Configuration Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Braiins Pool Card */}
        <div style={{
          background: 'rgba(247, 147, 26, 0.1)',
          border: '1px solid rgba(247, 147, 26, 0.3)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔶</span>
              <h3 style={{ margin: 0, color: '#f7931a', fontSize: '16px' }}>Braiins Pool</h3>
            </div>
            <div style={{
              background: liveData?.pools?.braiins?.status === 'MINING' ? '#22c55e' : 
                         liveData?.pools?.braiins?.status === 'CONNECTING' ? '#f0b72f' : '#6b7280',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              {liveData?.pools?.braiins?.status || 'CONNECTING...'}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Primary URL:</span>
              <br />
              <code style={{ color: '#22c55e', fontSize: '11px' }}>stratum+tcp://stratum.braiins.com:3333</code>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Worker:</span>{' '}
              <span style={{ color: '#f7931a' }}>yass3r.workerName</span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Difficulty:</span>{' '}
              <span style={{ color: '#06b6d4' }}>{liveData?.pools?.braiins?.difficulty?.toLocaleString() || 0}</span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Jobs Received:</span>{' '}
              <span style={{ color: '#22c55e' }}>{liveData?.pools?.braiins?.jobsReceived || 0}</span>
            </div>
            {liveData?.pools?.braiins?.lastJob && (
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <div style={{ color: '#22c55e', fontSize: '11px' }}>
                  📦 Latest Job: #{liveData.pools.braiins.lastJob.jobId}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Binance Pool Card */}
        <div style={{
          background: 'rgba(240, 185, 11, 0.1)',
          border: '1px solid rgba(240, 185, 11, 0.3)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🟡</span>
              <h3 style={{ margin: 0, color: '#f0b90b', fontSize: '16px' }}>Binance Pool</h3>
            </div>
            <div style={{
              background: liveData?.pools?.binance?.status === 'MINING' ? '#22c55e' : 
                         liveData?.pools?.binance?.status === 'CONNECTING' ? '#f0b72f' : '#6b7280',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              {liveData?.pools?.binance?.status || 'CONNECTING...'}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Pool 1:</span>
              <br />
              <code style={{ color: '#22c55e', fontSize: '11px' }}>stratum+tcp://sha256.poolbinance.com:443</code>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Worker:</span>{' '}
              <span style={{ color: '#f0b90b' }}>yass3r.001</span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Difficulty:</span>{' '}
              <span style={{ color: '#06b6d4' }}>{liveData?.pools?.binance?.difficulty?.toLocaleString() || 0}</span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#666' }}>Jobs Received:</span>{' '}
              <span style={{ color: '#22c55e' }}>{liveData?.pools?.binance?.jobsReceived || 0}</span>
            </div>
            {liveData?.pools?.binance?.lastJob && (
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <div style={{ color: '#22c55e', fontSize: '11px' }}>
                  📦 Latest Job: #{liveData.pools.binance.lastJob.jobId}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet */}
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
          <div style={{ fontFamily: 'monospace', color: '#f7931a', fontSize: '14px' }}>
            {data?.wallet}
          </div>
        </div>
      </div>

      {/* Terminal Window */}
      <div style={{
        background: '#0d1117',
        borderRadius: '12px',
        marginBottom: '20px',
        overflow: 'hidden',
        border: '1px solid #30363d',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Terminal Header */}
        <div style={{
          background: 'linear-gradient(180deg, #21262d 0%, #161b22 100%)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #30363d'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f85149' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f0b72f' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3fb950' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#8b949e', fontSize: '13px' }}>⌘</span>
              <span style={{ color: '#c9d1d9', fontSize: '13px', fontWeight: 500 }}>Mining Terminal - Multi-Pool</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ accentColor: '#22c55e' }}
              />
              <span style={{ color: '#8b949e', fontSize: '12px' }}>Auto-scroll</span>
            </label>
            <div style={{
              background: data?.isRunning ? '#238636' : '#6e7681',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: data?.isRunning ? '#3fb950' : '#8b949e',
                animation: data?.isRunning ? 'pulse 1s infinite' : 'none'
              }} />
              {data?.isRunning ? 'Mining' : 'Stopped'}
            </div>
          </div>
        </div>
        {/* Terminal Content */}
        <div
          ref={terminalRef}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement
            const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50
            if (!isAtBottom && autoScroll) {
              setAutoScroll(false)
            }
          }}
          style={{
            padding: '16px',
            height: '350px',
            overflowY: 'auto',
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            background: '#0d1117'
          }}
        >
          {/* Logs */}
          {data?.terminalLogs?.map((log, i) => (
            <div
              key={i}
              style={{
                color: getLogColor(log),
                marginBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {log}
            </div>
          ))}

          {/* Blinking cursor */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#22c55e',
            marginTop: '8px'
          }}>
            <span>$ </span>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '16px',
              background: '#22c55e',
              animation: 'blink 1s infinite',
              marginLeft: '2px'
            }} />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        div::-webkit-scrollbar {
          width: 8px;
        }
        div::-webkit-scrollbar-track {
          background: #0d1117;
        }
        div::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
      `}</style>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {/* Miners */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#f7931a', fontSize: '18px' }}>
            👷 Workers (Braiins + Binance)
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#888' }}>Worker</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>Pool</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888' }}>Hashrate</th>
                </tr>
              </thead>
              <tbody>
                {data?.miners?.map((miner) => {
                  const badge = getPoolBadgeColor(miner.pool)
                  return (
                    <tr key={miner.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 8px', color: '#fff' }}>⛏️ {miner.name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {miner.pool || 'Pool'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{
                          background: miner.status === 'active' ? '#22c55e' : miner.status === 'configured' ? '#3b82f6' : '#ef4444',
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#fff'
                        }}>
                          {miner.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#06b6d4' }}>
                        {miner.hashrate.toFixed(1)} GH/s
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hashrate Chart */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#06b6d4', fontSize: '18px' }}>
            📈 Hashrate (Last 60s)
          </h2>
          <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
            {hashHistory.map((hr, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: `linear-gradient(to top, #f7931a, #f0b90b)`,
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
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '30px',
        paddingBottom: '20px',
        color: '#666',
        fontSize: '12px'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#f7931a' }}>⚡</span> Bitcoin Mining Pool v3.0 - Multi-Pool (Braiins + Binance)
        </div>
        <div>Wallet: {data?.wallet}</div>
        <div style={{ marginTop: '8px', color: '#888' }}>
          Monitor: <a href="https://pool.braiins.com/dashboard" target="_blank" style={{ color: '#f7931a' }}>Braiins Dashboard</a>
          {' | '}
          <a href="https://pool.binance.com/dashboard" target="_blank" style={{ color: '#f0b90b' }}>Binance Dashboard</a>
        </div>
      </div>
    </div>
  )
}
