import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const updaterUrl = new URL("../deploy/vps/deploy-quiz-ownerinc-candidate-from-github.sh", import.meta.url);
const composeUrl = new URL("../deploy/compose.yaml", import.meta.url);

test("keeps pull deployment gated in both OFF and public capture-only states", async () => {
  const updater = await readFile(updaterUrl, "utf8");
  assert.match(updater, /BRANCH_FILE="\$SHARED_DIR\/repo_branch"/);
  assert.match(updater, /flock -n 9/);
  assert.match(updater, /CAPTURE_ONLY_PUBLIC_ENABLED_V1/);
  assert.match(updater, /PUBLIC_ORIGIN=https:\/\/quiz\.ownerinc\.com\.br/);
  assert.match(updater, /OWNERINC_QUIZ_WEBHOOK_ENABLED=\$\{WEBHOOK_ENABLED\}/);
  assert.match(updater, /candidate health failed/);
  assert.match(updater, /rollback applied/);
  assert.doesNotMatch(updater, /cloudflare|proxy_host|nginx proxy manager/i);
});

test("keeps the app private behind ownerinc_proxy", async () => {
  const compose = await readFile(composeUrl, "utf8");
  assert.match(compose, /networks: \[ownerinc_proxy\]/);
  assert.match(compose, /expose: \["3000"\]/);
  assert.doesNotMatch(compose, /^\s*ports:/m);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /no-new-privileges:true/);
});
