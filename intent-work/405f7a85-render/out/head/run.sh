#!/bin/bash
# MAC JOB 4: production and the head, Sandbox 1 and 5, Chromium then WebKit; a first visit (fresh profile, full) and a
# second in the same profile (short); each load alone. The head served by vite preview on 5178, /api through 3915.
S=/private/tmp/claude-501/-Users-samuelandert-Documents-Development-maiaCITY/49f6bdcc-aac2-4801-b604-2e57dc732015/scratchpad; H=/Users/samuelandert/Documents/Development/probe-405-head/play/site
export PATH=$S/nodeshim:$PATH; O=$S/j4/out
for p in 5178 3915; do lsof -ti tcp:$p | xargs kill 2>/dev/null; done; sleep 1
(cd $S/nice && PORT=3915 PLAY_MCP_TOKEN=$PLAY_MCP_TOKEN bun proxy3915.mjs > $O/proxy.log 2>&1) </dev/null >/dev/null 2>&1 &
(cd $H && PLAY_API=http://localhost:3915 /Users/samuelandert/.bun/bin/bunx vite preview --port 5178 --strictPort > $O/preview.log 2>&1) </dev/null >/dev/null 2>&1 &
for p in 3915 5178; do for _ in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$p/" && break; sleep 1; done; done
curl -s -o /dev/null -w "head /sandbox-1/ %{http_code} · /api/me %{http_code}\n" http://localhost:5178/sandbox-1/; curl -s -o /dev/null -w "/api/me %{http_code}\n" http://localhost:5178/api/me
quiet() { for _ in $(seq 1 40); do l=$(sysctl -n vm.loadavg | awk '{print $2}'); awk "BEGIN{exit !($l < 3.0)}" && return; sleep 10; done; }
cd $H || exit 1
for e in ${ENGINES:-chromium webkit}; do for w in sandbox-1 sandbox-5; do for t in prod head; do
  P=$S/j4/profiles/$t-$w-$e
  [ -e $O/$t-$w-$e-v2.json ] && continue
  if [ ! -e $O/$t-$w-$e-v1.json ]; then rm -rf $P; mkdir -p $P
  quiet; echo "== $t $w $e visit 1 at $(date +%T) (load $(sysctl -n vm.loadavg))"; node $S/j4/load4.mjs $t /$w/ $e $P $t-$w-$e-v1 $O full 2>&1 | grep -v "^\s*$" | cut -c1-500
  fi
  quiet; echo "== $t $w $e visit 2 at $(date +%T) (load $(sysctl -n vm.loadavg))"; node $S/j4/load4.mjs $t /$w/ $e $P $t-$w-$e-v2 $O short 2>&1 | grep -v "^\s*$" | cut -c1-500
done; done; done
for p in 5178 3915; do lsof -ti tcp:$p | xargs kill 2>/dev/null; done
echo "job 4 runs done $(date +%T)"
