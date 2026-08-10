#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/ownerinc/apps/quiz-ownerinc-app"
REPO_DIR="$APP_DIR/repo"
RELEASES_DIR="$APP_DIR/releases"
SHARED_DIR="$APP_DIR/shared"
COMPOSE_FILE="$APP_DIR/compose/compose.yaml"
RUNTIME_ENV="/opt/ownerinc/secrets/quiz-ownerinc-app.runtime.env"
REPO="https://github.com/OWNERINC/quiz-ownerinc.git"
BRANCH_FILE="$SHARED_DIR/repo_branch"
CAPTURE_ONLY_MARKER="$SHARED_DIR/public_capture_only_enabled"
CONTAINER="quiz-ownerinc-app-web"
IMAGE_REPOSITORY="ownerinc/quiz-ownerinc"
NODE_IMAGE="node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43"

if [ "$APP_DIR" != "/opt/ownerinc/apps/quiz-ownerinc-app" ] || [ "$REPO_DIR" != "/opt/ownerinc/apps/quiz-ownerinc-app/repo" ]; then
  echo "gate closed: unexpected app path" >&2
  exit 3
fi

mkdir -p "$REPO_DIR" "$RELEASES_DIR" "$SHARED_DIR"
for required in "$BRANCH_FILE" "$RUNTIME_ENV" "$COMPOSE_FILE"; do
  if [ ! -f "$required" ]; then
    echo "gate closed: missing $(basename "$required")" >&2
    exit 3
  fi
done
WEBHOOK_ENABLED="$(sed -n 's/^OWNERINC_QUIZ_WEBHOOK_ENABLED=//p' "$RUNTIME_ENV" | tail -n 1)"
case "$WEBHOOK_ENABLED" in
  false)
    PUBLIC_CUTOVER="off"
    WEBHOOK_LABEL="off"
    ;;
  true)
    if [ ! -f "$CAPTURE_ONLY_MARKER" ] || [ "$(tr -d '\r\n' < "$CAPTURE_ONLY_MARKER")" != "CAPTURE_ONLY_PUBLIC_ENABLED_V1" ]; then
      echo "gate closed: public capture-only marker is absent or invalid" >&2
      exit 3
    fi
    for required_key in \
      OWNERINC_QUIZ_WEBHOOK_URL OWNERINC_QUIZ_CONSENT_TEXT_VERSION \
      OWNERINC_QUIZ_POLICY_REFERENCE PUBLIC_ORIGIN; do
      if ! grep -Eq "^${required_key}=.+$" "$RUNTIME_ENV"; then
        echo "gate closed: active capture-only config is incomplete (${required_key})" >&2
        exit 3
      fi
    done
    if ! grep -Eq '^OWNERINC_QUIZ_WEBHOOK_URL=https://[^[:space:]]+$' "$RUNTIME_ENV" ||
       ! grep -qx 'PUBLIC_ORIGIN=https://quiz.ownerinc.com.br' "$RUNTIME_ENV" ||
       ! grep -qx 'OWNERINC_QUIZ_ENVIRONMENT=production' "$RUNTIME_ENV"; then
      echo "gate closed: active capture-only endpoint/origin/environment is invalid" >&2
      exit 3
    fi
    PUBLIC_CUTOVER="on"
    WEBHOOK_LABEL="capture-only"
    ;;
  *)
    echo "gate closed: webhook flag must be explicitly true or false" >&2
    exit 3
    ;;
esac

BRANCH="$(tr -d '\r\n' < "$BRANCH_FILE")"
if [ -z "$BRANCH" ] || [[ ! "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]] || [[ "$BRANCH" == -* ]]; then
  echo "gate closed: invalid pinned branch" >&2
  exit 3
fi

exec 9>"$SHARED_DIR/deploy.lock"
if ! flock -n 9; then
  echo "deploy already running"
  exit 0
fi

REMOTE_REF="$(git ls-remote --heads "$REPO" "refs/heads/$BRANCH")"
if [ -z "$REMOTE_REF" ]; then
  echo "no-op: canonical repository has no commit on branch=${BRANCH}; current isolated candidate preserved"
  exit 0
fi
EXPECTED_REMOTE_SHA="${REMOTE_REF%%[[:space:]]*}"

if [ ! -d "$REPO_DIR/.git" ]; then
  find "$REPO_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$REPO_DIR" >/dev/null
fi
git -C "$REPO_DIR" fetch origin "+$BRANCH:refs/remotes/origin/$BRANCH" --depth 1 >/dev/null
REMOTE_SHA="$(git -C "$REPO_DIR" rev-parse "origin/$BRANCH")"
if [ "$REMOTE_SHA" != "$EXPECTED_REMOTE_SHA" ]; then
  echo "gate closed: remote SHA changed during fetch" >&2
  exit 3
fi

CURRENT_SHA="$(cat "$SHARED_DIR/deployed_sha" 2>/dev/null || true)"
CURRENT_HEALTH="missing"
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  CURRENT_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER")"
fi
FAILED_SHA="$(cat "$SHARED_DIR/failed_release_sha" 2>/dev/null || true)"
if [ "$REMOTE_SHA" = "$FAILED_SHA" ] && [ "$CURRENT_HEALTH" = "healthy" ]; then
  echo "skipped: remote commit previously failed pre-promotion; current isolated candidate preserved"
  exit 0
fi
if [ "$REMOTE_SHA" = "$CURRENT_SHA" ] && [ "$CURRENT_HEALTH" = "healthy" ]; then
  echo "no changes: branch=${BRANCH} ${REMOTE_SHA:0:12} health=healthy"
  exit 0
fi

record_failed_release() {
  local status="$?"
  printf '%s\n' "$REMOTE_SHA" > "$SHARED_DIR/failed_release_sha"
  echo "release quarantined after pre-promotion failure: ${REMOTE_SHA:0:12}" >&2
  exit "$status"
}
trap 'record_failed_release' ERR

SHORT_SHA="${REMOTE_SHA:0:12}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="$RELEASES_DIR/${STAMP}_${BRANCH//\//_}_${SHORT_SHA}"
mkdir -p "$RELEASE_DIR"
git -C "$REPO_DIR" archive "$REMOTE_SHA" | tar -x -C "$RELEASE_DIR"
for required_source in \
  package.json server.mjs public/index.html public/app.js public/quiz.js public/styles.css \
  public/client-submission.js src/contract.mjs src/lead-handler.mjs \
  contracts/ownerinc.quiz.submission.v1.schema.json deploy/Dockerfile deploy/compose.yaml; do
  if [ ! -e "$RELEASE_DIR/$required_source" ]; then
    echo "gate closed: canonical commit missing integrated artifact $required_source" >&2
    printf '%s\n' "$REMOTE_SHA" > "$SHARED_DIR/failed_release_sha"
    trap - ERR
    echo "remote commit quarantined before build; current isolated candidate preserved"
    exit 0
  fi
done
if ! grep -q 'response.status !== 202' "$RELEASE_DIR/public/app.js"; then
  printf '%s\n' "$REMOTE_SHA" > "$SHARED_DIR/failed_release_sha"
  trap - ERR
  echo "remote commit quarantined: client response contract is not 202; current isolated candidate preserved"
  exit 0
fi
grep -qx "OWNERINC_QUIZ_WEBHOOK_ENABLED=${WEBHOOK_ENABLED}" "$RUNTIME_ENV"

docker run --rm --network none -v "$RELEASE_DIR:/work:ro" -w /work "$NODE_IMAGE" npm run build
IMAGE="${IMAGE_REPOSITORY}:${SHORT_SHA}"
docker build --pull -f "$RELEASE_DIR/deploy/Dockerfile" -t "$IMAGE" "$RELEASE_DIR"

CANDIDATE="quiz-ownerinc-candidate-${SHORT_SHA}"
if docker inspect "$CANDIDATE" >/dev/null 2>&1; then
  if [ "$(docker inspect --format '{{index .Config.Labels "ownerinc.app"}}' "$CANDIDATE")" != "quiz-ownerinc-app-candidate" ]; then
    echo "gate closed: candidate name belongs to another workload" >&2
    exit 3
  fi
  docker rm -f "$CANDIDATE" >/dev/null
fi
docker run -d --name "$CANDIDATE" \
  --label ownerinc.app=quiz-ownerinc-app-candidate \
  --label "ownerinc.public-cutover=${PUBLIC_CUTOVER}" \
  --label "ownerinc.webhook=${WEBHOOK_LABEL}" \
  --network ownerinc_proxy \
  --env-file "$RUNTIME_ENV" \
  --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  --tmpfs /tmp:size=16m,mode=1777 \
  --health-cmd "node -e \"fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\"" \
  --health-interval 5s --health-timeout 3s --health-retries 6 --health-start-period 5s \
  "$IMAGE" >/dev/null
CANDIDATE_HEALTH="starting"
for _ in $(seq 1 30); do
  CANDIDATE_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CANDIDATE" 2>/dev/null || echo missing)"
  [ "$CANDIDATE_HEALTH" = "healthy" ] && break
  [ "$CANDIDATE_HEALTH" = "unhealthy" ] && break
  sleep 2
done
if [ "$CANDIDATE_HEALTH" != "healthy" ]; then
  docker logs --tail 80 "$CANDIDATE" >&2 || true
  docker rm -f "$CANDIDATE" >/dev/null 2>&1 || true
  echo "$REMOTE_SHA" > "$SHARED_DIR/failed_release_sha"
  echo "candidate health failed: $CANDIDATE_HEALTH" >&2
  exit 1
fi
docker rm -f "$CANDIDATE" >/dev/null

PREVIOUS_IMAGE=""
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")"
fi
IMAGE_ENV="$SHARED_DIR/image.env"
printf 'QUIZ_IMAGE=%s\n' "$IMAGE" > "$IMAGE_ENV.tmp"
chmod 0640 "$IMAGE_ENV.tmp"
mv -f "$IMAGE_ENV.tmp" "$IMAGE_ENV"

rollback() {
  if [ -n "$PREVIOUS_IMAGE" ]; then
    printf 'QUIZ_IMAGE=%s\n' "$PREVIOUS_IMAGE" > "$IMAGE_ENV.tmp"
    chmod 0640 "$IMAGE_ENV.tmp"
    mv -f "$IMAGE_ENV.tmp" "$IMAGE_ENV"
    docker compose --env-file "$IMAGE_ENV" -f "$COMPOSE_FILE" up -d --force-recreate >/dev/null
  else
    docker compose --env-file "$IMAGE_ENV" -f "$COMPOSE_FILE" down >/dev/null 2>&1 || true
  fi
}

docker compose --env-file "$IMAGE_ENV" -f "$COMPOSE_FILE" up -d --force-recreate >/dev/null
HEALTH="starting"
for _ in $(seq 1 45); do
  HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER" 2>/dev/null || echo missing)"
  [ "$HEALTH" = "healthy" ] && break
  if [ "$HEALTH" = "unhealthy" ] || [ "$HEALTH" = "exited" ] || [ "$HEALTH" = "dead" ]; then break; fi
  sleep 2
done
if [ "$HEALTH" != "healthy" ]; then
  docker logs --tail 80 "$CONTAINER" >&2 || true
  rollback
  echo "$REMOTE_SHA" > "$SHARED_DIR/failed_release_sha"
  echo "promotion failed health=${HEALTH}; rollback applied" >&2
  exit 1
fi

trap - ERR
ln -sfn "$RELEASE_DIR" "$APP_DIR/current.tmp"
mv -Tf "$APP_DIR/current.tmp" "$APP_DIR/current"
rm -f "$SHARED_DIR/failed_release_sha"
echo "$REMOTE_SHA" > "$SHARED_DIR/deployed_sha"
echo "$BRANCH" > "$SHARED_DIR/deployed_branch"
echo "$IMAGE" > "$SHARED_DIR/deployed_image"
if [ -n "$PREVIOUS_IMAGE" ] && [ "$PREVIOUS_IMAGE" != "$IMAGE" ]; then echo "$PREVIOUS_IMAGE" > "$SHARED_DIR/previous_image"; fi
ls -1dt "$RELEASES_DIR"/* 2>/dev/null | tail -n +11 | while read -r old_release; do rm -rf "$old_release"; done
echo "deployed: branch=${BRANCH} ${SHORT_SHA} health=healthy public_cutover=${PUBLIC_CUTOVER} webhook=${WEBHOOK_LABEL}"
