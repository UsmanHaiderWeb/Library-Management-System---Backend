#!/usr/bin/env bash
#
# Fills the Admin portal with realistic demo data for testing and handover
# demos: books, students, loans, returns, fines, purchase and renewal
# requests, reviews, wishlists and pending account approvals.
#
#   cd Backend && npm run dev        (in another terminal)
#   bash scripts/seed-demo.sh
#
# Everything goes through the public HTTP API, so it doubles as a smoke test.
# The only exceptions are marked [SQL]: back-dating dates to simulate the
# passage of time, which no endpoint can do.
#
# Requires an existing admin (see ADMIN_EMAIL below) and its college.
# Safe to re-run — books/students that already exist are skipped.
#
# !! Development only. Never point this at a live college install.
set -u
BASE="${API_BASE_URL:-http://localhost:3000}"
CODE="${COLLEGE_CODE:-GICCL}"
ADMIN_EMAIL="${ADMIN_EMAIL:-librarian@giccl.test}"
ADMIN_PASS="${ADMIN_PASS:-Library@123}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-lms-mysql}"
MYSQL_DB="${MYSQL_DB:-lmsbackend}"
AUTH_HDR=""

j() { node -pe "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));($1)??''}catch(e){''}"; }

TOKEN=$(curl -s -X POST "$BASE/api/admin/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"collegeCode\":\"$CODE\"}" | j 'd.token')
[ -z "$TOKEN" ] && { echo "admin login failed"; exit 1; }
AUTH_HDR="Authorization: Bearer $TOKEN"
echo "== admin authenticated =="

# ------------------------------------------------------------ students
echo; echo "== importing students (bulk import API) =="
CSV=/tmp/students.csv
cat > "$CSV" <<'EOF'
name,email,studentId,phoneNumber,batchYear,role
Bilal Ahmed,bilal@giccl.test,GICCL-101,+923001112201,2024,STUDENT
Sana Riaz,sana@giccl.test,GICCL-102,+923001112202,2024,STUDENT
Hamza Tariq,hamza@giccl.test,GICCL-103,+923001112203,2023,STUDENT
Ayesha Noor,ayesha@giccl.test,GICCL-104,+923001112204,2023,STUDENT
Usman Javed,usman@giccl.test,GICCL-105,+923001112205,2025,STUDENT
Fatima Zahra,fatima@giccl.test,GICCL-106,+923001112206,2025,STUDENT
Ali Raza,ali@giccl.test,GICCL-107,+923001112207,2024,STUDENT
Maryam Khan,maryam@giccl.test,GICCL-108,+923001112208,2022,FACULTY
Imran Shah,imran@giccl.test,GICCL-109,+923001112209,2022,FACULTY
Zainab Iqbal,zainab@giccl.test,GICCL-110,+923001112210,2025,STAFF
EOF
IMPORT=$(curl -s -X POST "$BASE/api/admin/import/users" -H "$AUTH_HDR" -F "file=@$CSV")
echo "  $(echo "$IMPORT" | j 'd.message || JSON.stringify(d).slice(0,90)')"

# ------------------------------------------------------------ book ids
BOOKS_JSON=$(curl -s "$BASE/api/admin/getAllBooks?pageNumber=0&searchQuery=" -H "$AUTH_HDR")
mapfile -t BOOK_IDS < <(echo "$BOOKS_JSON" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).books.map(b=>b.id).join('\n')")
echo "  books available: ${#BOOK_IDS[@]}"

# ------------------------------------------------------------ student tokens
declare -a EMAILS=(bilal sana hamza ayesha usman fatima ali maryam imran zainab)
declare -a IDS=(GICCL-101 GICCL-102 GICCL-103 GICCL-104 GICCL-105 GICCL-106 GICCL-107 GICCL-108 GICCL-109 GICCL-110)
declare -a STOKENS=()
echo; echo "== signing students in =="
for k in "${!EMAILS[@]}"; do
  t=$(curl -s -X POST "$BASE/api/students/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"${EMAILS[$k]}@giccl.test\",\"password\":\"${IDS[$k]}\",\"collegeCode\":\"$CODE\"}" | j 'd.token')
  STOKENS+=("$t")
  [ -n "$t" ] && printf '  %-10s ok\n' "${EMAILS[$k]}" || printf '  %-10s FAILED\n' "${EMAILS[$k]}"
done

# ------------------------------------------------------------ activity
echo; echo "== borrow requests, reviews, wishlist, purchase requests =="
REVIEWS=("Excellent read, highly recommended." "Good but a little dense in places." "A classic — worth the time." "Very useful for coursework." "Enjoyed every chapter.")
for k in "${!STOKENS[@]}"; do
  st="${STOKENS[$k]}"; [ -z "$st" ] && continue
  SH="Authorization: Bearer $st"

  # each student requests 2 books
  for off in 0 1; do
    b=$(( (k*2 + off) % ${#BOOK_IDS[@]} ))
    curl -s -o /dev/null -X POST "$BASE/api/books/borrow/${BOOK_IDS[$b]}" -H "$SH" \
      -H 'Content-Type: application/json' -d "{\"collegeCode\":\"$CODE\"}"
  done

  # a review and a wishlist entry
  rb=$(( (k*3) % ${#BOOK_IDS[@]} ))
  curl -s -o /dev/null -X POST "$BASE/api/students/reviews" -H "$SH" -H 'Content-Type: application/json' \
    -d "{\"bookId\":\"${BOOK_IDS[$rb]}\",\"rating\":$(( (k % 3) + 3 )),\"comment\":\"${REVIEWS[$((k % 5))]}\"}"
  wb=$(( (k*5+2) % ${#BOOK_IDS[@]} ))
  curl -s -o /dev/null -X POST "$BASE/api/students/wishlist/toggle" -H "$SH" -H 'Content-Type: application/json' \
    -d "{\"bookId\":\"${BOOK_IDS[$wb]}\"}"
done

# purchase requests from a few students
PR_TITLES=("Clean Architecture|Robert C. Martin|Needed for final year project"
           "Deep Learning|Ian Goodfellow|Reference for AI elective"
           "The Lean Startup|Eric Ries|Entrepreneurship course"
           "Atomic Habits|James Clear|Requested by several students"
           "Designing Data-Intensive Applications|Martin Kleppmann|Systems course")
for k in 0 1 2 3 4; do
  st="${STOKENS[$k]}"; [ -z "$st" ] && continue
  IFS='|' read -r title author reason <<< "${PR_TITLES[$k]}"
  curl -s -o /dev/null -X POST "$BASE/api/students/purchase-request" -H "Authorization: Bearer $st" \
    -H 'Content-Type: application/json' \
    -d "{\"bookTitle\":\"$title\",\"author\":\"$author\",\"reason\":\"$reason\"}"
done
echo "  done"

# ------------------------------------------------------------ approvals
echo; echo "== approving most borrow requests =="
mapfile -t REQ_IDS < <(curl -s "$BASE/api/admin/all-borrow-requests?pageNumber=0&searchQuery=" -H "$AUTH_HDR" \
  | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));(d.requests||[]).filter(r=>r.status==='pending').map(r=>r.id).join('\n')")
echo "  pending: ${#REQ_IDS[@]}"
approved=0; rejected=0
for k in "${!REQ_IDS[@]}"; do
  # leave a few pending, reject a couple, accept the rest
  if [ $((k % 7)) -eq 6 ]; then continue
  elif [ $((k % 9)) -eq 8 ]; then st='rejected'; rejected=$((rejected+1))
  else st='accepted'; approved=$((approved+1)); fi
  curl -s -o /dev/null -X POST "$BASE/api/admin/borrow-requests/change-status/${REQ_IDS[$k]}" \
    -H "$AUTH_HDR" -H 'Content-Type: application/json' -d "{\"status\":\"$st\"}"
done
echo "  accepted=$approved rejected=$rejected left-pending=$(( ${#REQ_IDS[@]} - approved - rejected ))"

# ------------------------------------------------------------ renewals
echo; echo "== renewal requests =="
for k in 0 1 2; do
  st="${STOKENS[$k]}"; [ -z "$st" ] && continue
  bb=$(curl -s "$BASE/api/students/getUserDetails" -H "Authorization: Bearer $st" \
    | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));((d.borrowedBooks||[]).find(b=>b.status==='borrowed')||{}).id||''")
  [ -n "$bb" ] && curl -s -o /dev/null -X POST "$BASE/api/students/renew/$bb" -H "Authorization: Bearer $st" \
    -H 'Content-Type: application/json' -d '{}'
done
mapfile -t REN_IDS < <(curl -s "$BASE/api/admin/renewal-requests?status=PENDING" -H "$AUTH_HDR" \
  | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));(d.renewalRequests||[]).map(r=>r.id).join('\n')")
echo "  pending renewals: ${#REN_IDS[@]}"
[ ${#REN_IDS[@]} -gt 0 ] && curl -s -o /dev/null -X POST "$BASE/api/admin/renewal-requests/${REN_IDS[0]}/approve" -H "$AUTH_HDR"
[ ${#REN_IDS[@]} -gt 1 ] && curl -s -o /dev/null -X POST "$BASE/api/admin/renewal-requests/${REN_IDS[1]}/reject" -H "$AUTH_HDR"
echo "  1 approved, 1 rejected, rest left pending"

# ------------------------------------------------------------ returns + fines
echo; echo "== returns (some overdue, to produce fines) =="
mapfile -t BB_IDS < <(curl -s "$BASE/api/admin/borrowed-books/all?pageNumber=0&searchQuery=" -H "$AUTH_HDR" \
  | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));(d.borrowedBooks||[]).map(b=>b.id).join('\n')")
echo "  currently borrowed: ${#BB_IDS[@]}"

# [SQL] Time travel — no endpoint can back-date a loan, and without overdue
# loans there are no fines to look at. Everything else here goes through the API.
MYSQL_PW=$(sed -n 's/^MYSQL_ROOT_PASSWORD=//p' .env | tr -d '\r\n')
sql() { docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_PW" "$MYSQL_DB" -e "$1" 2>/dev/null; }

if [ -n "$MYSQL_PW" ]; then
  sql "UPDATE BorrowedBook SET dueDate = DATE_SUB(NOW(), INTERVAL 6 DAY) WHERE status='borrowed';"
  echo "  [SQL] back-dated active loans so returns generate fines"
else
  echo "  [SQL] skipped — MYSQL_ROOT_PASSWORD not set in .env (no fines will be created)"
fi

returned=0
for k in "${!BB_IDS[@]}"; do
  [ $((k % 2)) -eq 1 ] && [ $k -gt 5 ] && continue   # leave roughly half on loan
  curl -s -o /dev/null -X POST "$BASE/api/admin/borrowed-books/${BB_IDS[$k]}/change-status" \
    -H "$AUTH_HDR" -H 'Content-Type: application/json' -d '{"status":"returned"}'
  returned=$((returned+1))
done
echo "  returned: $returned"

# ------------------------------------------------------------ settle fines
echo; echo "== settling some fines =="
mapfile -t FINE_IDS < <(curl -s "$BASE/api/admin/fines?pageNumber=0" -H "$AUTH_HDR" \
  | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));(d.fines||[]).filter(f=>f.status==='PENDING').map(f=>f.id).join('\n')")
echo "  pending fines: ${#FINE_IDS[@]}"
[ -n "${FINE_IDS[0]:-}" ] && curl -s -o /dev/null -X PATCH "$BASE/api/admin/fines/${FINE_IDS[0]}/pay" -H "$AUTH_HDR" -H 'Content-Type: application/json' -d '{"note":"Cash at desk"}'
[ -n "${FINE_IDS[1]:-}" ] && curl -s -o /dev/null -X PATCH "$BASE/api/admin/fines/${FINE_IDS[1]}/waive" -H "$AUTH_HDR" -H 'Content-Type: application/json' -d '{"note":"First offence, waived"}'
echo "  1 paid, 1 waived, rest left outstanding"

# ------------------------------------------------------------ purchase decisions
echo; echo "== purchase request decisions =="
mapfile -t PR_IDS < <(curl -s "$BASE/api/admin/purchase-requests?page=0&search=" -H "$AUTH_HDR" \
  | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));(d.requests||[]).map(r=>r.id).join('\n')")
[ -n "${PR_IDS[0]:-}" ] && curl -s -o /dev/null -X POST "$BASE/api/admin/purchase-requests/${PR_IDS[0]}/status" -H "$AUTH_HDR" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}'
[ -n "${PR_IDS[1]:-}" ] && curl -s -o /dev/null -X POST "$BASE/api/admin/purchase-requests/${PR_IDS[1]}/status" -H "$AUTH_HDR" -H 'Content-Type: application/json' -d '{"status":"REJECTED"}'
echo "  1 approved, 1 rejected, rest pending"

# ------------------------------------------------------------ pending signups
echo; echo "== pending account requests =="
for n in 1 2 3; do
  curl -s -o /dev/null -X POST "$BASE/api/students/signup" -H 'Content-Type: application/json' \
    -d "{\"name\":\"New Applicant $n\",\"email\":\"applicant$n@giccl.test\",\"password\":\"password123\",\"studentId\":\"GICCL-20$n\",\"collegeCode\":\"$CODE\",\"phoneNumber\":\"+92300999900$n\"}"
done
echo "  3 unapproved signups created"

echo; echo "================= SUMMARY ================="
curl -s "$BASE/api/admin/dashboard-stats" -H "$AUTH_HDR" | j 'JSON.stringify(d,null,1)'
