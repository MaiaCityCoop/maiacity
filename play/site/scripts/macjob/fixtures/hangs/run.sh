#!/usr/bin/env bash
# A fixture of the dry run's tests (../../dry.test.ts): hangs.
set -euo pipefail
node "$(dirname "$0")/job.mjs"
