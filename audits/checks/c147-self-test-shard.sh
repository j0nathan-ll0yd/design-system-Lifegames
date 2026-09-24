#!/usr/bin/env bash
# Shard driver for the C147 package-drift self-test's MUTATION rungs.
#
# WHY THIS EXISTS. `c147-package-drift.mjs --self-test` runs two different guarantees: the
# baseline rung (the un-mutated suite is green) and 31 mutation rungs (the suite can fail).
# It ran the mutation rungs by fanning out `min(31, os.availableParallelism())` child
# processes inside ONE job — 16 lanes on the node-highmem tier, each peaking around 176 MiB.
# On the shared self-hosted arm64 fleet, concurrent jobs from unrelated PRs exhausted the
# physical host's RAM and the OOM killer reaped a runner VM mid-step, so the log blob never
# flushed and the required `package-version-drift` context went RED having measured nothing.
# That is not hypothetical: atlas `audits/audits.yaml` records it in A2's evidence for
# design-system-Lifegames run 32654389950 (main@6828871), where the job "concluded failure
# with 9 of its 14 steps concluded and NOT ONE of them a failure" and the false red
# "propagated into a design review".
#
# This script runs one shard's mutants ONE AT A TIME. Peak resident memory per job drops to a
# single mutant instead of 16, and wall clock per job drops to a fraction of the full run, so
# the window in which a job can be reaped shrinks with it. Parallelism moves ACROSS runners
# (the workflow matrix), where each shard has its own memory, instead of WITHIN one runner.
#
# COVERAGE IS BY CONSTRUCTION, NOT BY A HAND-KEPT LIST. The mutation ids are read from the
# engine itself on every run, then partitioned by a stride: id `i` belongs to shard
# `i % SHARD_TOTAL + 1`. Every id lands in exactly one shard and the union over shards
# 1..SHARD_TOTAL is the whole set, so a mutant added to the engine's MUTATIONS table is picked
# up with no workflow edit and cannot be silently dropped.
#
# FAIL CLOSED. A shard that cannot enumerate the mutants, that is handed an out-of-range
# index, or that resolves to zero mutants EXITS NON-ZERO rather than reporting success — a
# shard that passes while running nothing is the same class of defect this script fixes.
#
# Usage: c147-self-test-shard.sh <shard-index> <shard-total>   (index is 1-based)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

ENGINE="audits/checks/c147-package-drift.mjs"

if [ "$#" -ne 2 ]; then
  echo "ERROR: expected <shard-index> <shard-total>, got $# argument(s)" >&2
  exit 1
fi

SHARD_INDEX="$1"
SHARD_TOTAL="$2"

for value in "$SHARD_INDEX" "$SHARD_TOTAL"; do
  case "$value" in
    '' | *[!0-9]*)
      echo "ERROR: shard index and total must be positive integers, got '$SHARD_INDEX' '$SHARD_TOTAL'" >&2
      exit 1
      ;;
  esac
done

if [ "$SHARD_TOTAL" -lt 1 ] || [ "$SHARD_INDEX" -lt 1 ] || [ "$SHARD_INDEX" -gt "$SHARD_TOTAL" ]; then
  echo "ERROR: shard index $SHARD_INDEX is out of range for total $SHARD_TOTAL" >&2
  exit 1
fi

# Ask the ENGINE for its own mutation table. An unrecognised id makes it print the full known
# list and exit non-zero, so the `|| true` is load-bearing under `pipefail`; the emptiness
# check below is what turns a broken probe into a failure rather than an empty shard.
RAW_IDS="$( { node "$ENGINE" --self-test --mutation=__enumerate__ 2>&1 || true; } \
  | sed -n 's/^unknown mutation .*; known: //p' | tr -d ' ' | tr ',' '\n' | sed '/^$/d')"

if [ -z "$RAW_IDS" ]; then
  echo "ERROR: could not enumerate mutations from $ENGINE — refusing to report a green shard that ran nothing" >&2
  exit 1
fi

IDS=()
while IFS= read -r line; do
  IDS+=("$line")
done <<< "$RAW_IDS"

TOTAL="${#IDS[@]}"

# Every shard must receive at least one mutant. If the table ever shrinks below the shard
# count some shard would run nothing and still pass, so that is a hard failure: it means the
# matrix and the engine disagree and the partition is no longer total.
if [ "$TOTAL" -lt "$SHARD_TOTAL" ]; then
  echo "ERROR: $TOTAL mutation(s) cannot be spread over $SHARD_TOTAL shard(s) without an empty shard" >&2
  echo "       Reduce the matrix in .github/workflows/ci.yml and drift-self-test-nightly.yml to match." >&2
  exit 1
fi

MINE=()
for ((i = 0; i < TOTAL; i++)); do
  if [ "$((i % SHARD_TOTAL))" -eq "$((SHARD_INDEX - 1))" ]; then
    MINE+=("${IDS[$i]}")
  fi
done

if [ "${#MINE[@]}" -eq 0 ]; then
  echo "ERROR: shard $SHARD_INDEX/$SHARD_TOTAL resolved to zero mutations out of $TOTAL" >&2
  exit 1
fi

echo "[c147-shard] shard $SHARD_INDEX/$SHARD_TOTAL — $TOTAL mutation(s) known, ${#MINE[@]} assigned:"
printf '[c147-shard]   %s\n' "${MINE[@]}"
echo ""

# Sequential on purpose — see the header. Every mutant runs even after one fails, so a shard
# reports every survivor it found instead of only the first.
SURVIVORS=()
for id in "${MINE[@]}"; do
  echo "[c147-shard] --- mutation $id ---"
  if node "$ENGINE" --self-test --mutation="$id"; then
    echo "[c147-shard] killed $id"
  else
    echo "[c147-shard] SURVIVED $id" >&2
    SURVIVORS+=("$id")
  fi
done

echo ""
if [ "${#SURVIVORS[@]}" -gt 0 ]; then
  echo "[c147-shard] FAIL: shard $SHARD_INDEX/$SHARD_TOTAL — ${#SURVIVORS[@]} mutation(s) survived: ${SURVIVORS[*]}" >&2
  exit 1
fi

echo "[c147-shard] OK: shard $SHARD_INDEX/$SHARD_TOTAL — all ${#MINE[@]} assigned mutation(s) killed."
