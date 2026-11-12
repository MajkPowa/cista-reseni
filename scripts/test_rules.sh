#!/usr/bin/env bash
# Kontrola veřejné části pravidel databáze proti lokálnímu emulátoru.
# Spuštění: firebase emulators:start --only auth,firestore,storage  (v jiném okně)
#           bash scripts/test_rules.sh
P=cista-reseni-20261112
B="http://127.0.0.1:8080/v1/projects/$P/databases/(default)/documents"
N="projects/$P/databases/(default)/documents"
fail=0
expect() { # popis, očekávaný kód, skutečný kód
  if [ "$2" = "$3" ]; then echo "ok    $1 ($3)"; else echo "FAIL  $1: čekáno $2, vráceno $3"; fail=1; fi
}
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
commit() { code -X POST -H "Content-Type: application/json" "$B:commit" -d "$1"; }
inquiry() { # id, pole navíc/změněná (JSON fragment), transformace ano/ne
  local fields="\"status\":{\"stringValue\":\"new\"},\"service\":{\"stringValue\":\"servis\"},\"serviceLabel\":{\"stringValue\":\"Servis\"},\"location\":{\"stringValue\":\"Tábor\"},\"name\":{\"stringValue\":\"Test\"},\"email\":{\"stringValue\":\"a@b.cz\"}"
  [ -n "$2" ] && fields="$fields,$2"
  local transform=',"updateTransforms":[{"fieldPath":"createdAt","setToServerValue":"REQUEST_TIME"}],"currentDocument":{"exists":false}'
  [ "$3" = "no" ] && transform=''
  commit "{\"writes\":[{\"update\":{\"name\":\"$N/inquiries/$1\",\"fields\":{$fields}}$transform}]}"
}

expect "veřejné čtení zveřejněných referencí" 200 "$(code -X POST -H 'Content-Type: application/json' "$B:runQuery" -d '{"structuredQuery":{"from":[{"collectionId":"references"}],"where":{"fieldFilter":{"field":{"fieldPath":"published"},"op":"EQUAL","value":{"booleanValue":true}}}}}')"
expect "veřejné čtení všech referencí bez filtru" 403 "$(code "$B/references")"
expect "veřejné čtení nastavení" 200 "$(code "$B/settings/site")"
expect "veřejné čtení poptávek" 403 "$(code "$B/inquiries")"
expect "veřejné čtení správců" 403 "$(code "$B/admins")"
expect "platná poptávka" 200 "$(inquiry rules-test-1 '"message":{"stringValue":"x"}')"
expect "poptávka s jiným stavem" 403 "$(inquiry rules-test-2 '"status":{"stringValue":"won"}')"
expect "poptávka s polem navíc" 403 "$(inquiry rules-test-3 '"note":{"stringValue":"x"}')"
expect "poptávka s neplatným e-mailem" 403 "$(inquiry rules-test-4 '"email":{"stringValue":"nope"}')"
expect "poptávka s neznámou službou" 403 "$(inquiry rules-test-5 '"service":{"stringValue":"jine"}')"
expect "poptávka bez serverového času" 403 "$(inquiry rules-test-6 '' no)"
expect "přepsání existující poptávky" 409 "$(inquiry rules-test-1 '')"
expect "veřejný zápis reference" 403 "$(commit "{\"writes\":[{\"update\":{\"name\":\"$N/references/hack\",\"fields\":{\"title\":{\"stringValue\":\"x\"},\"published\":{\"booleanValue\":true},\"featured\":{\"booleanValue\":false},\"categories\":{\"arrayValue\":{}},\"photos\":{\"arrayValue\":{}}}}}]}")"
expect "veřejný zápis správce" 403 "$(commit "{\"writes\":[{\"update\":{\"name\":\"$N/admins/x@y.cz\",\"fields\":{\"email\":{\"stringValue\":\"x@y.cz\"}}}}]}")"
expect "veřejná změna nastavení" 403 "$(commit "{\"writes\":[{\"update\":{\"name\":\"$N/settings/site\",\"fields\":{\"categories\":{\"arrayValue\":{}}}}}]}")"
code -X DELETE -H "Authorization: Bearer owner" "$B/inquiries/rules-test-1" > /dev/null
exit $fail
