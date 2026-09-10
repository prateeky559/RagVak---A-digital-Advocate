#!/usr/bin/env bash
set -e

HOST="${HOST:-http://localhost:3000}"

echo "=================================================="
echo "LexiRAG Health and Readiness Probe"
echo "Target: $HOST"
echo "=================================================="

echo -n "Checking /health ... "
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HOST/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" -eq 200 ]; then
  echo "OK (HTTP 200)"
  echo "Response: $HEALTH_BODY"
else
  echo "FAILED (HTTP $HEALTH_CODE)"
  exit 1
fi

echo ""
echo -n "Checking /ready ... "
READY_RESPONSE=$(curl -s -w "\n%{http_code}" "$HOST/ready")
READY_CODE=$(echo "$READY_RESPONSE" | tail -n1)
READY_BODY=$(echo "$READY_RESPONSE" | sed '$d')

if [ "$READY_CODE" -eq 200 ]; then
  echo "OK (HTTP 200)"
  echo "Readiness Details: $READY_BODY"
else
  echo "FAILED (HTTP $READY_CODE)"
  exit 1
fi

echo ""
echo "All system probes passed successfully."
exit 0
