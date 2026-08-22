#!/usr/bin/env bash
#
# Creates the Azure VM this system runs on, ready for `docker compose up`.
#
# Easiest place to run it is the Azure Cloud Shell (the >_ icon in the portal):
# the az CLI is already installed and already signed in as you, so there is no
# local install and no `az login`.
#
#   curl -fsSL https://raw.githubusercontent.com/UsmanHaiderWeb/Library-Management-System---Backend/main/deploy/azure/provision.sh | bash
#
# Or locally, after `az login`:
#
#   bash provision.sh
#
# Everything is overridable:
#   RG=lms-rg REGION=uaenorth VM=lms SIZE=Standard_B1s bash provision.sh
#
# Safe to re-run -- it skips anything that already exists and never destroys.
set -euo pipefail

RG="${RG:-lms-rg}"
VM="${VM:-lms}"
# Closest Azure regions to Pakistan. uaenorth (Dubai) is the lowest latency;
# centralindia (Pune) is a larger region with better capacity.
REGION="${REGION:-uaenorth}"
# B1s is the size covered by the Azure for Students free allowance
# (750 hours/month for 12 months). Anything larger bills against the credit.
SIZE="${SIZE:-Standard_B1s}"
IMAGE="${IMAGE:-Ubuntu2404}"
ADMIN_USERNAME="${ADMIN_USERNAME:-azureuser}"

CLOUD_INIT_URL="${CLOUD_INIT_URL:-https://raw.githubusercontent.com/UsmanHaiderWeb/Library-Management-System---Backend/main/deploy/azure/cloud-init.yaml}"

command -v az >/dev/null || { echo "az CLI not found. Use the Azure Cloud Shell, or install it first."; exit 1; }
az account show >/dev/null 2>&1 || { echo "Not signed in. Run: az login"; exit 1; }

echo "==> subscription"
az account show --query "{name:name, id:id}" -o tsv | sed 's/^/    /'

echo "==> resource group $RG in $REGION"
az group create --name "$RG" --location "$REGION" --output none
echo "    ok"

# cloud-init needs the username substituted before upload.
#
# The tr is not cosmetic: az reads --custom-data with the interpreter's default
# encoding, which in the Cloud Shell is latin-1, so a single non-ASCII byte
# anywhere in this file kills `az vm create` with an opaque codec error that
# names a byte offset and nothing else. One em dash in a comment cost us a
# provisioning run. Strip everything outside printable ASCII (keeping tab, LF
# and CR) so an editor's smart quote can never do it again.
INIT=$(mktemp)
trap 'rm -f "$INIT"' EXIT
curl -fsSL "$CLOUD_INIT_URL" \
    | sed "s/\${ADMIN_USERNAME}/$ADMIN_USERNAME/g" \
    | LC_ALL=C tr -cd '\11\12\15\40-\176' > "$INIT"

VM_EXISTS=false
az vm show --resource-group "$RG" --name "$VM" >/dev/null 2>&1 && VM_EXISTS=true

# A failed `az vm create` leaves the NIC, public IP and NSG behind. The next
# run then trips over them with a confusing "already exists", so say plainly
# what happened and how to clear it. The resource group is dedicated to this
# deployment, which is what makes deleting it the safe, simple answer.
if [ "$VM_EXISTS" = false ]; then
    leftovers=$(az network nic list --resource-group "$RG" --query "[].name" -o tsv 2>/dev/null || true)
    if [ -n "$leftovers" ]; then
        echo
        echo "A previous run failed part-way and left these behind:"
        echo "$leftovers" | sed 's/^/    /'
        echo
        echo "Clear them and start clean, then run this script again:"
        echo "    az group delete --name $RG --yes"
        exit 1
    fi
fi

if [ "$VM_EXISTS" = true ]; then
    echo "==> vm $VM already exists -- leaving it alone"
else
    echo "==> creating vm $VM ($SIZE, $IMAGE)"
    echo "    this takes a couple of minutes"
    az vm create \
        --resource-group "$RG" \
        --name "$VM" \
        --image "$IMAGE" \
        --size "$SIZE" \
        --admin-username "$ADMIN_USERNAME" \
        --generate-ssh-keys \
        --public-ip-sku Standard \
        --custom-data "$INIT" \
        --output none
    echo "    created"
fi

echo "==> opening 80 and 443"
# --priority must be unique per rule; 1001/1002 are free on a default NSG
az vm open-port --resource-group "$RG" --name "$VM" --port 80  --priority 1001 --output none 2>/dev/null || true
az vm open-port --resource-group "$RG" --name "$VM" --port 443 --priority 1002 --output none 2>/dev/null || true
echo "    ok (22 is already open from vm create)"

IP=$(az vm show -d --resource-group "$RG" --name "$VM" --query publicIps -o tsv)

cat <<EOF

----------------------------------------------------------------
  VM ready.        ssh $ADMIN_USERNAME@$IP
  Public IP        $IP

  No domain yet? These hostnames work immediately, no DNS setup,
  and still get real certificates:

    STUDENT_HOST=library.$IP.sslip.io
    ADMIN_HOST=admin.$IP.sslip.io

  Next, on the VM (cloud-init has already put the files in /opt/lms
  and installed Docker -- give it 2-3 minutes after first boot):

    ssh $ADMIN_USERNAME@$IP
    cd /opt/lms
    nano .env                 # fill it in, including the two hosts above
    docker compose -f docker-compose.ghcr.yml pull
    docker compose -f docker-compose.ghcr.yml up -d
    ./bootstrap.sh

  Then open  https://library.$IP.sslip.io
----------------------------------------------------------------
EOF
