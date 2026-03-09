#!/usr/bin/env python3
"""
Uptime Monitor - Keeps all services alive 24/7
"""

import asyncio
import aiohttp
import time
from datetime import datetime

# Services to monitor
SERVICES = [
    {
        "name": "Vercel Dashboard",
        "url": "https://live-dashboard-24-l3gpi0474-yayass3rs-projects.vercel.app/api/data",
        "interval": 55  # seconds
    },
    {
        "name": "Vercel Alt",
        "url": "https://live-dashboard-24-kvcui0rec-yayass3rs-projects.vercel.app/api/data",
        "interval": 55
    }
]

# State
last_pings = {}

async def ping_service(session, service):
    """Ping a service to keep it alive"""
    try:
        start = time.time()
        async with session.get(service["url"], timeout=30) as resp:
            elapsed = time.time() - start
            status = "✅" if resp.status == 200 else "❌"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {status} {service['name']}: {resp.status} ({elapsed:.2f}s)")
            return resp.status == 200
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ {service['name']}: {e}")
        return False

async def monitor_loop():
    """Main monitoring loop"""
    print("=" * 50)
    print("🔍 UPTIME MONITOR v1.0")
    print("   Keeping services alive 24/7")
    print("=" * 50)
    print()
    
    async with aiohttp.ClientSession() as session:
        while True:
            for service in SERVICES:
                name = service["name"]
                interval = service["interval"]
                
                last = last_pings.get(name, 0)
                now = time.time()
                
                if now - last >= interval:
                    await ping_service(session, service)
                    last_pings[name] = now
            
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(monitor_loop())
