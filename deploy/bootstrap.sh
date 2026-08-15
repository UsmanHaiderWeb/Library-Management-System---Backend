#!/usr/bin/env bash
#
# First-run setup for a fresh install: schema, college row, first librarian.
#
#   cd Backend/deploy
#   cp .env.example .env && $EDITOR .env
#   docker compose -f docker-compose.prod.yml up -d --build
#   ./bootstrap.sh
#
# Safe to re-run: each step checks whether it has already been done.
#
# The college row is the one thing with no API behind it — admin signup
# rejects an unknown college code, so the row has to exist first.
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.prod.yml"

[ -f .env ] || { echo "no .env here — copy .env.example and fill it in first"; exit 1; }

# Read values rather than sourcing the file: `. ./.env` executes it as shell,
# so an unquoted value with a space (COLLEGE_NAME=Government Islamia College —
# perfectly valid to compose) is a syntax error. Compose parses this file
# itself; this only needs the handful of values the script uses.
env_get() {
    sed -n "s/^[[:space:]]*$1=//p" .env | head -n 1 \
        | sed -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

COLLEGE_CODE=$(env_get COLLEGE_CODE)
COLLEGE_NAME=$(env_get COLLEGE_NAME)
MYSQL_ROOT_PASSWORD=$(env_get MYSQL_ROOT_PASSWORD)
STUDENT_HOST=$(env_get STUDENT_HOST)
ADMIN_HOST=$(env_get ADMIN_HOST)
DB=$(env_get MYSQL_DATABASE); DB=${DB:-lmsbackend}

: "${COLLEGE_CODE:?set COLLEGE_CODE in .env}"
: "${COLLEGE_NAME:?set COLLEGE_NAME in .env}"
: "${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD in .env}"

# A quote or backslash in the college name would break out of the INSERT below
case $COLLEGE_NAME in
    *\'*|*\\*) echo "COLLEGE_NAME cannot contain quotes or backslashes"; exit 1 ;;
esac
case $COLLEGE_CODE in
    *[!A-Za-z0-9_-]*) echo "COLLEGE_CODE must be letters, digits, - or _"; exit 1 ;;
esac

sql() { $COMPOSE exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -B -e "$1" 2>/dev/null; }

echo "==> waiting for the database"
for _ in $(seq 1 60); do
    sql "SELECT 1;" >/dev/null 2>&1 && break
    sleep 2
done
sql "SELECT 1;" >/dev/null || { echo "database never came up — check: $COMPOSE logs mysql"; exit 1; }

echo "==> pushing the schema"
$COMPOSE --profile tools run --rm migrate

echo "==> college row"
existing=$(sql "SELECT code FROM \`$DB\`.College WHERE code = '$COLLEGE_CODE';" || true)
if [ -n "$existing" ]; then
    echo "    $COLLEGE_CODE already exists — leaving it alone"
else
    sql "INSERT INTO \`$DB\`.College (id, name, code, createdAt) VALUES (UUID(), '$COLLEGE_NAME', '$COLLEGE_CODE', NOW());"
    echo "    created $COLLEGE_CODE ($COLLEGE_NAME)"
fi

echo "==> first librarian"
admins=$(sql "SELECT COUNT(*) FROM \`$DB\`.Admin;" || echo 0)
if [ "${admins:-0}" -gt 0 ]; then
    echo "    an admin already exists — skipping"
else
    ADMIN_NAME="${ADMIN_NAME:-}"; ADMIN_EMAIL="${ADMIN_EMAIL:-}"; ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
    [ -n "$ADMIN_NAME" ]     || read -r -p "    name: " ADMIN_NAME
    [ -n "$ADMIN_EMAIL" ]    || read -r -p "    email: " ADMIN_EMAIL
    [ -n "$ADMIN_PASSWORD" ] || { read -r -s -p "    password: " ADMIN_PASSWORD; echo; }

    # Posted from inside the API container so this works before DNS or TLS are
    # sorted out, and never crosses the network in the clear.
    $COMPOSE exec -T \
        -e A_NAME="$ADMIN_NAME" -e A_EMAIL="$ADMIN_EMAIL" \
        -e A_PASS="$ADMIN_PASSWORD" -e A_CODE="$COLLEGE_CODE" \
        api node -e '
            fetch("http://127.0.0.1:3000/api/admin/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: process.env.A_NAME,
                    email: process.env.A_EMAIL,
                    password: process.env.A_PASS,
                    collegeCode: process.env.A_CODE,
                }),
            })
            .then(async (r) => {
                const body = await r.text();
                if (!r.ok) { console.error("    signup failed (" + r.status + "): " + body); process.exit(1); }
                console.log("    created " + process.env.A_EMAIL);
            })
            .catch((e) => { console.error("    " + e.message); process.exit(1); });
        '
fi

echo
echo "done."
echo "  student portal   https://${STUDENT_HOST:-<STUDENT_HOST>}"
echo "  librarian portal https://${ADMIN_HOST:-<ADMIN_HOST>}"
echo "  api reference    https://${ADMIN_HOST:-<ADMIN_HOST>}/api-docs"
echo
echo "Certificates are issued on the first request to each hostname, so give"
echo "it a few seconds. If it fails, DNS is not pointing here yet."
