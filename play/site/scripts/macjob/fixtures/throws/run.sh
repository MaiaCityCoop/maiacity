#!/usr/bin/env bash
# A fixture of the dry run's tests (../../dry.test.ts): throws.
set -euo pipefail
node "$(dirname "$0")/job.mjs"
