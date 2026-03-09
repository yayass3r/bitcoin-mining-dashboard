#!/bin/bash
# Forever Mining - Restarts automatically

LOG="/home/z/my-project/mining_bot/mining_output.log"
SCRIPT="/home/z/my-project/mining_bot/miner.py"

echo "🔄 Forever Mining Started" > $LOG
echo "   Auto-restart enabled" >> $LOG
echo "   Will run 24/7" >> $LOG
echo "" >> $LOG

while true; do
    echo "[$(date)] ⛏️ Starting miner..." >> $LOG
    python3 $SCRIPT >> $LOG 2>&1
    EXIT_CODE=$?
    echo "[$(date)] ⚠️ Miner exited with code $EXIT_CODE, restarting in 5s..." >> $LOG
    sleep 5
done
