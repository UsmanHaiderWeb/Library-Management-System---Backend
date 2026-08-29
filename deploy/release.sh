#!/usr/bin/env bash
#
# The everyday deploy, as one command. Runs on YOUR machine (Git Bash is fine),
# not on the server.
#
#   bash release.sh              start the VM if needed, deploy, verify, leave it running
#   bash release.sh --stop       the same, then deallocate afterwards to save credit
#   bash release.sh --stop-only  deploy nothing; just deallocate the VM
#
# Assumes the images are already built: push to main and let GitHub Actions
# finish first (watch it with `gh run watch`). This script only releases what
# GHCR already has.
#
# az is optional. Without a signed-in az, the script prints the one Cloud Shell
# command for the VM start/stop and, for a start, waits until the machine
# answers -- so the deploy itself still runs from here.
set -euo pipefail

RG="${RG:-lms-rg}"
VM="${VM:-lms}"
IP="${IP:-20.205.42.2}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/lms_azure}"
SSH_OPTS=(-i "$SSH_KEY" -o ConnectTimeout=8 -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
HOST="azureuser@$IP"

MODE="deploy"
case "${1:-}" in
    --stop) MODE="deploy-stop" ;;
    --stop-only) MODE="stop-only" ;;
    "") ;;
    *) echo "usage: bash release.sh [--stop|--stop-only]"; exit 1 ;;
esac

# ---------------------------------------------------------------- az, maybe
# On Windows the CLI is a .bat in the venv, which bash will not find as `az`.
AZ=""
for candidate in az az.bat az.cmd; do
    if command -v "$candidate" >/dev/null 2>&1; then AZ="$candidate"; break; fi
done
az_ready() { [ -n "$AZ" ] && "$AZ" account show >/dev/null 2>&1; }

ssh_up() { ssh "${SSH_OPTS[@]}" "$HOST" true 2>/dev/null; }

# ---------------------------------------------------------------- stop path
deallocate() {
    if az_ready; then
        echo "==> deallocating $VM (stops the compute meter)"
        "$AZ" vm deallocate -g "$RG" -n "$VM" --output none
        echo "    done. Disk + public IP still bill ~\$8-9/mo; that is the floor."
    else
        echo
        echo "az is not signed in here, and a deallocation cannot be done from"
        echo "inside the VM (that only reaches 'Stopped', which STILL BILLS)."
        echo "Run this one line in the Azure Cloud Shell (portal, >_ icon):"
        echo
        echo "    az vm deallocate -g $RG -n $VM"
        echo
        exit 1
    fi
}

if [ "$MODE" = "stop-only" ]; then
    deallocate
    exit 0
fi

# ---------------------------------------------------------------- start path
if ssh_up; then
    echo "==> VM is already running"
else
    if az_ready; then
        echo "==> starting $VM (~30s)"
        "$AZ" vm start -g "$RG" -n "$VM" --output none
    else
        echo "==> VM is off and az is not signed in here."
        echo "    Run this in the Azure Cloud Shell, then leave this script running:"
        echo
        echo "    az vm start -g $RG -n $VM"
        echo
    fi
    printf "==> waiting for SSH"
    for _ in $(seq 1 60); do
        if ssh_up; then echo " up"; break; fi
        printf "."
        sleep 10
    done
    ssh_up || { echo; echo "VM never answered on $IP. Is it started?"; exit 1; }
fi

# ---------------------------------------------------------------- deploy
echo "==> pulling images and recreating containers"
ssh "${SSH_OPTS[@]}" "$HOST" 'cd /opt/lms && \
    docker compose -f docker-compose.ghcr.yml pull --quiet && \
    docker compose -f docker-compose.ghcr.yml up -d --quiet-pull 2>&1 | tail -4'

# Containers need a moment; Caddy re-serves immediately but the API restarts
sleep 8

# ---------------------------------------------------------------- verify
echo "==> verifying what is actually serving"
S="https://library.$IP.sslip.io"; A="https://admin.$IP.sslip.io"
s_hash=$(curl -sk --max-time 15 "$S/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1 || true)
a_hash=$(curl -sk --max-time 15 "$A/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1 || true)
api=$(curl -sk --max-time 15 -o /dev/null -w "%{http_code}" "$S/api/books/all?collegeCode=GICCL&page=1&limit=1" || true)
echo "    student bundle : ${s_hash:-NOT SERVING}"
echo "    admin bundle   : ${a_hash:-NOT SERVING}"
echo "    api            : HTTP ${api:-none}"
ssh "${SSH_OPTS[@]}" "$HOST" 'cd /opt/lms && docker compose -f docker-compose.ghcr.yml ps --format "{{.Service}}: {{.Status}}" | sed "s/^/    /"'

if [ -z "$s_hash" ] || [ "$api" != "200" ]; then
    echo
    echo "Something above is wrong -- fix it before stopping the VM."
    exit 1
fi

echo "==> deployed."
echo "    If a browser still shows the old UI, hard-reload (Ctrl+Shift+R)."

# ---------------------------------------------------------------- optional stop
if [ "$MODE" = "deploy-stop" ]; then
    deallocate
else
    echo
    echo "The VM is RUNNING and billing (~\$30/mo). When you are done:"
    echo "    bash release.sh --stop-only"
fi
