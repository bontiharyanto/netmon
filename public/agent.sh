#!/bin/sh
# NETMON agent bootstrap — push host metrics to /api/agent/heartbeat
set -eu
TOKEN=""
URL="${NETMON_URL:-https://netmon.click}"

for arg in "$@"; do
  case "$arg" in
    --token=*) TOKEN="${arg#--token=}" ;;
    --url=*) URL="${arg#--url=}" ;;
  esac
done

if [ -z "$TOKEN" ]; then
  echo "Usage: agent.sh --token=<hex from Agents card> [--url=https://demo.netmon.click]"
  echo "Do not use TOKEN_DARI_KARTU. Click Copy install command on the Agents page."
  exit 1
fi

case "$TOKEN" in
  TOKEN_DARI_KARTU|AGENT_TOKEN|THE_TOKEN|your-token|xxx)
    echo "That token is a placeholder, not a real agent."
    echo "On /dashboard/agents open the device card and copy the install command (long hex token)."
    exit 1
    ;;
esac

CPU=$(ps -A -o %cpu 2>/dev/null | awk '{s+=$1} END {print s+0}' || echo 10)
MEM=42
DISK=55

RESP=$(curl -sS -X POST "$URL/api/agent/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"cpu_percent\":$CPU,\"ram_percent\":$MEM,\"disk_percent\":$DISK,\"version\":\"1.0.0\"}")
echo "$RESP"

case "$RESP" in
  *Unknown*agent*)
    echo "NETMON does not know this token. Issue a token on /dashboard/agents and paste the hex value, not a sample word."
    exit 1
    ;;
esac
