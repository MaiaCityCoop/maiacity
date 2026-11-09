#!/usr/bin/env bash
# One name's records in the zone maia.city, run on a workflow's runner: through Hetzner's DNS Console API (DNS_TOKEN)
# or the Cloud API's zones (DNS_TOKEN or HCLOUD_TOKEN), whichever reaches the zone, as legacy's deploy kept its names;
# read first, written only where it differs.
#   bash deploy/dns.sh set <name> <ipv4>   its A record to the address (production.yml's DNS step); with no token that
#                                          reaches the zone, a warning saying what to set by hand
#   bash deploy/dns.sh remove <name>       every record of the name (server.yml's remove-dns); red with no token
set -e
MODE=${1:?set or remove}
NAME=${2:?a name in the zone}
IPV4=${3:-}
ZONE=maia.city
DNS=https://dns.hetzner.com/api/v1
CLOUD=https://api.hetzner.cloud/v1

api=
if [ -n "${DNS_TOKEN:-}" ]; then
  zone=$(curl -fsS -H "Auth-API-Token: $DNS_TOKEN" "$DNS/zones?name=$ZONE" 2> /dev/null | jq -r '.zones[0].id // empty' || true)
  [ -n "$zone" ] && api=dns
fi
if [ -z "$api" ]; then
  for token in "${DNS_TOKEN:-}" "${HCLOUD_TOKEN:-}"; do
    [ -n "$token" ] || continue
    if curl -fsS -o /dev/null -H "Authorization: Bearer $token" "$CLOUD/zones/$ZONE" 2> /dev/null; then api=cloud; CLOUD_DNS=$token; break; fi
  done
fi

case "$MODE" in
  set)
    if [ -z "$api" ]; then
      echo "::warning::No token reaches the zone $ZONE: set by hand  $NAME.$ZONE. 300 IN A $IPV4"
      exit 0
    fi
    if [ "$api" = dns ]; then
      H="Auth-API-Token: $DNS_TOKEN"
      records=$(curl -fsS -H "$H" "$DNS/records?zone_id=$zone" | jq -c --arg n "$NAME" '[.records[] | select(.type == "A" and .name == $n)]')
      now=$(jq -r 'map(.value) | join(" ")' <<< "$records")
      echo "A $NAME.$ZONE now: ${now:-none}"
      [ "$now" = "$IPV4" ] && exit 0
      body=$(jq -nc --arg z "$zone" --arg n "$NAME" --arg v "$IPV4" '{zone_id: $z, type: "A", name: $n, value: $v, ttl: 300}')
      id=$(jq -r '.[0].id // empty' <<< "$records")
      if [ -n "$id" ]; then curl -fsS -X PUT -H "$H" -H 'Content-Type: application/json' -d "$body" "$DNS/records/$id" > /dev/null
      else curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' -d "$body" "$DNS/records" > /dev/null; fi
    else
      H="Authorization: Bearer $CLOUD_DNS"
      set=$(curl -sS -H "$H" "$CLOUD/zones/$ZONE/rrsets/$NAME/A")
      now=$(jq -r '.rrset.records // [] | map(.value) | join(" ")' <<< "$set")
      echo "A $NAME.$ZONE now: ${now:-none}"
      [ "$now" = "$IPV4" ] && exit 0
      records=$(jq -nc --arg v "$IPV4" '[{value: $v}]')
      if jq -e .rrset > /dev/null <<< "$set"; then
        curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' -d "{\"records\": $records}" "$CLOUD/zones/$ZONE/rrsets/$NAME/A/actions/set_records" > /dev/null
      else
        curl -fsS -X POST -H "$H" -H 'Content-Type: application/json' -d "$(jq -nc --arg n "$NAME" --argjson r "$records" '{name: $n, type: "A", ttl: 300, records: $r}')" "$CLOUD/zones/$ZONE/rrsets" > /dev/null
      fi
    fi
    echo "A $NAME.$ZONE set: $IPV4"
    ;;
  remove)
    [ -n "$api" ] || { echo "::error::No token reaches the zone $ZONE: remove $NAME.$ZONE by hand"; exit 1; }
    if [ "$api" = dns ]; then
      H="Auth-API-Token: $DNS_TOKEN"
      records=$(curl -fsS -H "$H" "$DNS/records?zone_id=$zone" | jq -c --arg n "$NAME" '[.records[] | select(.name == $n)]')
      echo "$NAME.$ZONE now: $(jq -r 'map("\(.type) \(.value)") | join(", ") | if . == "" then "none" else . end' <<< "$records")"
      for id in $(jq -r '.[].id' <<< "$records"); do curl -fsS -X DELETE -H "$H" "$DNS/records/$id" > /dev/null; done
    else
      H="Authorization: Bearer $CLOUD_DNS"
      sets=$(curl -fsS -H "$H" "$CLOUD/zones/$ZONE/rrsets?name=$NAME&per_page=100" | jq -c --arg n "$NAME" '[.rrsets[] | select(.name == $n)]')
      echo "$NAME.$ZONE now: $(jq -r 'map("\(.type) \(.records | map(.value) | join(" "))") | join(", ") | if . == "" then "none" else . end' <<< "$sets")"
      for type in $(jq -r '.[].type' <<< "$sets"); do curl -fsS -X DELETE -H "$H" "$CLOUD/zones/$ZONE/rrsets/$NAME/$type" > /dev/null; done
    fi
    echo "$NAME.$ZONE: no record left"
    ;;
  *) echo "dns.sh: set or remove, not $MODE"; exit 2 ;;
esac
