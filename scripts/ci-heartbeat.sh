#!/usr/bin/env bash
# Run a command and keep the job's log stream talking while that command is silent.
#
# WHY THIS EXISTS — MEASURED, not theorised. GitHub terminates a self-hosted job at a
# SERVER-SIDE INACTIVITY DEADLINE of roughly 600 seconds. The trigger is SILENCE, not duration.
# Over 1792 runs / 10444 jobs (2026-05-26 to 2026-10-02), 15 jobs in this repo ran LONGER than
# 600s and concluded success — the longest 947s — while 23 finished in the 596-604s band and NOT
# ONE of those concluded success. Sixteen of the seventeen band jobs whose logs survive retention
# show a single silent interval of 906.3s to 1104.1s ending after the kill, and the container
# kept executing for up to 518.6s past GitHub's own `completed_at` stamp — so the fleet was never
# the terminator.
#
# `timeout-minutes` is IRRELEVANT to that failure mode. It bounds duration; the deadline measures
# silence. A step that prints one line a minute survives an hour; a step that prints nothing dies
# at ten minutes. This wrapper is the remedy that matches the mechanism.
#
# WHAT IT DOES NOT COVER, said plainly. The heartbeat is a step-level `run:`, so it cannot speak
# for anything the runner does before or between steps: `Prepare all required actions` (job
# 109431664071 stalled 1096.3s downloading actions/checkout from codeload.github.com) and the
# `pnpm/action-setup` self-installer (jobs 109885396148, 109885396460, 109885396584 and
# 109885396690 stalled 938.4s to 1104.1s there) are both outside any step this can wrap. It also
# assumes the runner can still reach GitHub's control plane to upload the line it prints; an
# outage that blackholes ALL egress defeats it. It removes the silence it can reach, which is
# most of the measured instances, and claims nothing beyond that.
#
# THE BEAT IS UNCONDITIONAL, by choice. Making it fire only after real silence means piping the
# child's output through this script to observe it, which reorders stdout against stderr, hides
# the child's terminal detection, and risks a pipe deadlock on a chatty child. One line a minute
# of noise is a better trade than any of those, and it cannot fail open.
#
# Usage: bash scripts/ci-heartbeat.sh <command> [args...]
#   CI_HEARTBEAT_INTERVAL_SECONDS  seconds between beats (default 60; must be 1..599)
#   CI_HEARTBEAT_DEADLINE_SECONDS  hard cap on the wrapped command (default 1800; must be >= 1)
#
# Exit code is the wrapped command's, verbatim — except a deadline kill, which exits 124 to match
# timeout(1). Measured context for the default cap: `pnpm install --frozen-lockfile` succeeded
# 2376 times at p50 8s / max 71s, and the longest observed stall-and-recover was 966.5s.

# Deliberately NOT `set -e`: this script's whole job is to observe a command that may fail and
# report its code faithfully. Exiting on the child's failure would replace that code with ours.
set -uo pipefail

readonly DEADLINE_LIMIT_SECONDS=600

if [ "$#" -lt 1 ]; then
  echo "ERROR: expected a command to run, got none" >&2
  exit 2
fi

INTERVAL="${CI_HEARTBEAT_INTERVAL_SECONDS:-60}"
DEADLINE="${CI_HEARTBEAT_DEADLINE_SECONDS:-1800}"

for pair in "interval:$INTERVAL" "deadline:$DEADLINE"; do
  name="${pair%%:*}"
  value="${pair#*:}"
  case "$value" in
    '' | *[!0-9]*)
      echo "ERROR: $name must be a positive integer number of seconds, got '$value'" >&2
      exit 2
      ;;
  esac
  if [ "$value" -lt 1 ]; then
    echo "ERROR: $name must be at least 1 second, got '$value'" >&2
    exit 2
  fi
done

# FAIL CLOSED. An interval at or past the deadline it exists to defeat is not a loose setting,
# it is a wrapper that looks like protection and provides none. Refuse it rather than ship a
# job that reads as covered.
if [ "$INTERVAL" -ge "$DEADLINE_LIMIT_SECONDS" ]; then
  echo "ERROR: interval ${INTERVAL}s cannot defeat the ~${DEADLINE_LIMIT_SECONDS}s inactivity deadline it exists for; use a smaller value" >&2
  exit 2
fi

LABEL="$*"
STATUS_FILE="$(mktemp "${TMPDIR:-/tmp}/ci-heartbeat.XXXXXX")"
trap 'rm -f "$STATUS_FILE"' EXIT

# Job control ON so the background job below lands in its OWN process group, whose id is its pid.
# Without it `kill $CHILD` reaches only the bookkeeping subshell and leaves the command itself
# running, reparented to init — MEASURED while writing this: a cancelled wrapper orphaned its
# `sleep` onto the host. Signalling the GROUP (`kill -- -$CHILD`) is what actually stops the work.
set -m

# The child writes its own exit code to a file rather than this script reading it back with
# `wait`. A background job whose status bash has already reaped makes `wait` answer 127, which
# would turn a passing command into a failing step at random.
( "$@"; echo "$?" > "$STATUS_FILE" ) &
CHILD=$!
set +m

# Signal the whole group, then fall back to the bare pid in case the group never formed. TERM
# first so the command can clean up, KILL after a grace period so a command that ignores TERM
# still cannot outlive this script on a shared self-hosted host.
stop_child() {
  kill -TERM -- "-$CHILD" 2>/dev/null || kill -TERM "$CHILD" 2>/dev/null
  sleep 5
  kill -KILL -- "-$CHILD" 2>/dev/null || kill -KILL "$CHILD" 2>/dev/null
}

# Forward cancellation rather than orphaning the child: GitHub cancelling the step must stop the
# work, not leave it running on a shared self-hosted host.
forward() {
  echo "[heartbeat] received $1 after ${ELAPSED}s, stopping: $LABEL" >&2
  stop_child
  exit $((128 + $2))
}
ELAPSED=0
trap 'forward INT 2' INT
trap 'forward TERM 15' TERM

while kill -0 "$CHILD" 2>/dev/null; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [ "$((ELAPSED % INTERVAL))" -eq 0 ]; then
    printf '[heartbeat] %ss elapsed, still running: %s\n' "$ELAPSED" "$LABEL"
  fi
  if [ "$ELAPSED" -ge "$DEADLINE" ]; then
    echo "::error title=ci-heartbeat deadline::'$LABEL' exceeded CI_HEARTBEAT_DEADLINE_SECONDS=${DEADLINE}s and was killed. The heartbeat keeps a slow step alive past the inactivity deadline; it is not a licence to hang." >&2
    stop_child
    exit 124
  fi
done

# A missing or unparseable status file means the child died without recording anything — report
# that rather than defaulting to 0, which would be a green step that measured nothing.
STATUS="$(cat "$STATUS_FILE" 2>/dev/null)"
case "$STATUS" in
  '' | *[!0-9]*)
    echo "ERROR: wrapped command recorded no exit status ('$STATUS'); refusing to report success for: $LABEL" >&2
    exit 2
    ;;
esac

exit "$STATUS"
