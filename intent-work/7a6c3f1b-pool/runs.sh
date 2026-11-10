#!/bin/bash
cd "$(dirname "$0")"
for b in "$@"; do RAF=0 VW=1440 VH=900 timeout 800 bun probe.ts /sandbox-1/ $b s1-b$b 700 2>&1 | tail -2; done
