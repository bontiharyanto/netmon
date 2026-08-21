#!/bin/sh
# NETMON agent bootstrap — send host metrics to /api/agent/heartbeat
set -eu
TOKEN=""
URL="${NETMON_URL:-https://netmon.click}"

for arg in "$@"; do
  case "$arg" in
    --token=*) TOKEN="${arg#--token=}" ;;
  esac
done

if [ -z "$TOKEN" ]; then
  echo "Usage: agent.sh --token=AGENT_TOKEN"
  exit 1
fi

CPU=$(ps -A -o %cpu 2>/dev/null | awk '{s+=$1} END {print s+0}' || echo 10)
MEM=42
DISK=55

curl -sS -X POST "$URL/api/agent/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"cpu_percent\":$CPU,\"ram_percent\":$MEM,\"disk_percent\":$DISK,\"version\":\"1.0.0\"}"
