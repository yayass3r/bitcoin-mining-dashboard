#!/bin/bash
# Uptime Monitor Script

LOG="/home/z/my-project/mining_bot/monitor.log"
MINER_DIR="/home/z/my-project/mining_bot"

while true; do
    # Check if miner is running
    if ! pgrep -f "miner.py" > /dev/null; then
        echo "[$(date)] ⚠️ Miner not running, restarting..." >> $LOG
        cd $MINER_DIR
        python3 miner.py >> mining_output.log 2>&1 &
    fi
    
    # Check Vercel deployment
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://live-dashboard-24-l3gpi0474-yayass3rs-projects.vercel.app/api/data)
    if [ "$RESPONSE" != "200" ]; then
        echo "[$(date)] ⚠️ Vercel API returned $RESPONSE" >> $LOG
    fi
    
    # Ping to keep alive
    curl -s "https://live-dashboard-24-l3gpi0474-yayass3rs-projects.vercel.app/api/data" > /dev/null 2>&1
    
    sleep 60
done
