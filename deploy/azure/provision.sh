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

# Azure for Students restricts deployment to a policy-defined set of regions,
# and the set differs between subscriptions. Asking for one outside it fails
# every resource at once with RequestDisallowedByAzure, so rather than hardcode
# a guess the script reads the policy and picks the closest allowed region.
# This is the preference order, nearest to Pakistan first.
REGION_PREFERENCE="${REGION_PREFERENCE:-uaenorth uaecentral centralindia southindia westindia qatarcentral southeastasia eastasia malaysiawest uksouth westeurope northeurope polandcentral austriaeast swedencentral eastus}"
# Set REGION explicitly to skip the whole negotiation.
REGION="${REGION:-}"
# Left empty on purpose: the capacity search below chooses the size, starting
# from Standard_B1s (the one the Azure for Students free allowance covers).
# Set SIZE explicitly to bypass the search.
SIZE="${SIZE:-}"
IMAGE="${IMAGE:-Ubuntu2404}"
ADMIN_USERNAME="${ADMIN_USERNAME:-azureuser}"

CLOUD_INIT_URL="${CLOUD_INIT_URL:-https://raw.githubusercontent.com/UsmanHaiderWeb/Library-Management-System---Backend/main/deploy/azure/cloud-init.yaml}"

command -v az >/dev/null || { echo "az CLI not found. Use the Azure Cloud Shell, or install it first."; exit 1; }
az account show >/dev/null 2>&1 || { echo "Not signed in. Run: az login"; exit 1; }

echo "==> subscription"
az account show --query "{name:name, id:id}" -o tsv | sed 's/^/    /'

# The built-in "Allowed locations" policy carries the permitted regions in a
# listOfAllowedLocations parameter. It may be assigned at any scope above us,
# hence --disable-scope-strict-match. Best effort: if nothing comes back we
# proceed and let the create call be the judge.
echo "==> allowed regions"
ALLOWED=$(az policy assignment list --disable-scope-strict-match \
    --query "[].parameters.listOfAllowedLocations.value[]" -o tsv 2>/dev/null \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[[:space:]]//g' \
    | grep -v '^$' | sort -u || true)

if [ -n "$ALLOWED" ]; then
    echo "$ALLOWED" | paste -sd' ' - | fold -s -w 68 | sed 's/^/    /'
else
    echo "    (could not read the policy; proceeding anyway)"
fi

# Sizes worth trying, cheapest first. Only B1s is covered by the Azure for
# Students free allowance; anything below it bills against the $100 credit,
# which the script says out loud rather than quietly spending.
SIZE_PREFERENCE="${SIZE_PREFERENCE:-Standard_B1s Standard_B1ms Standard_B2ls_v2 Standard_B2ats_v2 Standard_B2s}"

# Regions and sizes both go in and out of capacity, and a region being
# permitted by policy says nothing about whether it can actually give you a
# B1s today. Asking beforehand costs one call per region and turns a failed
# deployment into an informed choice.
find_placement() {
    local regions="$1" region size cache
    cache=$(mktemp -d)
    for region in $regions; do
        az vm list-skus --location "$region" --resource-type virtualMachines --all \
            --query "[?length(restrictions[?type=='Location'])==\`0\`].name" -o tsv 2>/dev/null \
            | sort -u > "$cache/$region" || true
    done
    # Size-major on purpose: a free B1s one region further away beats a billed
    # B1ms next door, and the latency difference between the permitted regions
    # is small either way.
    for size in $SIZE_PREFERENCE; do
        for region in $regions; do
            if grep -qx "$size" "$cache/$region" 2>/dev/null; then
                echo "$region $size"
                rm -rf "$cache"
                return 0
            fi
        done
    done
    rm -rf "$cache"
    return 1
}

# Search order: preferred regions that the policy permits, then anything else
# it permits.
candidate_regions() {
    local seen="" candidate
    for candidate in $REGION_PREFERENCE; do
        if [ -z "$ALLOWED" ] || echo "$ALLOWED" | grep -qx "$candidate"; then
            echo "$candidate"; seen="$seen $candidate"
        fi
    done
    if [ -n "$ALLOWED" ]; then
        for candidate in $ALLOWED; do
            case " $seen " in *" $candidate "*) ;; *) echo "$candidate" ;; esac
        done
    fi
}

if [ -n "$REGION" ] && [ -n "$SIZE" ]; then
    echo "==> using $SIZE in $REGION (both set explicitly)"
else
    SEARCH=$( [ -n "$REGION" ] && echo "$REGION" || candidate_regions | tr '\n' ' ' )
    echo "==> checking capacity in: $(echo $SEARCH | fold -s -w 60 | head -1)"
    PLACEMENT=$(find_placement "$SEARCH" || true)
    if [ -z "$PLACEMENT" ]; then
        echo
        echo "None of these regions can offer any of: $SIZE_PREFERENCE"
        echo "Pick explicitly and re-run:  REGION=<region> SIZE=<size> bash provision.sh"
        exit 1
    fi
    REGION=${PLACEMENT% *}
    SIZE=${PLACEMENT#* }
    echo "==> using $SIZE in $REGION"
fi

if [ "$SIZE" != "Standard_B1s" ]; then
    echo
    echo "NOTE: $SIZE is not the free-tier size (Standard_B1s), so it bills"
    echo "against your \$100 student credit. It is also more comfortable for"
    echo "MySQL and Redis than 1 GB. Delete the VM when the demo is over:"
    echo "    az group delete --name $RG --yes"
    echo
fi

# Second net. A malformed region reaches Azure as an opaque
# LocationNotAvailableForResourceGroup several calls later, so check it
# against the real list of regions first and say so plainly here.
if ! az account list-locations --query "[].name" -o tsv 2>/dev/null | grep -qx "$REGION"; then
    echo
    echo "'$REGION' is not a real Azure region."
    if [ -n "$ALLOWED" ]; then
        echo "Your subscription's policy allows:"
        echo "$ALLOWED" | sed 's/^/    /'
    fi
    echo
    echo "Re-run picking one explicitly:  REGION=<region> bash provision.sh"
    exit 1
fi
# An earlier failed run may have left the group in a region we are no longer
# using. Harmless -- a group's location is only metadata and it can hold
# resources anywhere -- so reuse it rather than issuing a create that would be
# an update against a location the policy may now refuse.
EXISTING_RG_LOCATION=$(az group show --name "$RG" --query location -o tsv 2>/dev/null || true)
if [ -n "$EXISTING_RG_LOCATION" ]; then
    echo "==> resource group $RG exists (in $EXISTING_RG_LOCATION)"
    if [ "$EXISTING_RG_LOCATION" != "$REGION" ]; then
        echo "    resources go to $REGION regardless; to start clean instead:"
        echo "    az group delete --name $RG --yes"
    fi
else
    echo "==> resource group $RG in $REGION"
    az group create --name "$RG" --location "$REGION" --output none
    echo "    created"
fi

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
    echo "==> creating vm $VM ($SIZE, $IMAGE) in $REGION"
    echo "    this takes a couple of minutes"
    # Captured rather than streamed: az prints a full python traceback for a
    # policy rejection, which buries the one line that matters.
    if ! CREATE_LOG=$(az vm create \
        --resource-group "$RG" \
        --name "$VM" \
        --image "$IMAGE" \
        --size "$SIZE" \
        --location "$REGION" \
        --admin-username "$ADMIN_USERNAME" \
        --generate-ssh-keys \
        --public-ip-sku Standard \
        --custom-data "$INIT" \
        --only-show-errors \
        --output none 2>&1); then

        echo
        if echo "$CREATE_LOG" | grep -q "RequestDisallowedByAzure"; then
            echo "Azure refused $REGION: your subscription's policy does not allow it."
            if [ -n "$ALLOWED" ]; then
                echo "Regions you may use:"
                echo "$ALLOWED" | tr '\n' ' ' | fold -s -w 68 | sed 's/^/    /'
            fi
            echo
            echo "Pick one and re-run:"
            echo "    REGION=<region> bash provision.sh"
        elif echo "$CREATE_LOG" | grep -qiE "SkuNotAvailable|allocation failed|not available in"; then
            echo "$SIZE is not available in $REGION right now."
            echo "Try another allowed region, or a different size:"
            echo "    REGION=<region> bash provision.sh"
            echo "    SIZE=Standard_B1ms bash provision.sh"
        else
            echo "$CREATE_LOG" | tail -20
        fi
        exit 1
    fi
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
