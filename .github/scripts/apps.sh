#!/usr/bin/env bash
# Knows which files feed which image, so CI builds and deploys only the app
# that changed. Used by .github/workflows/ci.yaml.
#
#   apps.sh changed [<base commit>]   print the apps to build, as a JSON array
#   apps.sh pin <directory>           pin the digests in <directory>/digest-<app>
set -euo pipefail

apps=(web bot)
# A change here rebuilds every image.
shared=(Dockerfile .dockerignore .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .github)

# Add a workspace package here when an app starts importing it.
app_paths() {
  case "$1" in
    web) echo apps/web ;;
    bot) echo apps/bot packages/knowledge ;;
  esac
}

changed() {
  local base=${1:-} list=() app
  for app in "${apps[@]}"; do
    # No usable base (new branch, manual run): build everything.
    if ! git cat-file -e "$base^{commit}" 2>/dev/null ||
      ! git diff --quiet "$base" HEAD -- "${shared[@]}" $(app_paths "$app"); then
      list+=("\"$app\"")
    fi
  done
  (IFS=,; echo "[${list[*]}]")
}

pin() {
  local dir=$1 file=k8s/kustomization.yaml app digest newer
  for app in "${apps[@]}"; do
    [ -f "$dir/digest-$app" ] || continue
    digest=$(cat "$dir/digest-$app")
    case "$digest" in sha256:*) ;; *) echo "No digest for $app"; exit 1 ;; esac
    # Runs can finish out of order: a later change to this app deploys itself.
    newer=$(git log --first-parent --format=%h "$GITHUB_SHA..HEAD" -- "${shared[@]}" $(app_paths "$app"))
    if [ -n "$newer" ]; then
      echo "$app: main already has a newer change ($(echo $newer)); leaving it to that run."
      continue
    fi
    # The digest line directly follows the image's name line.
    sed -i -E "\\|name: ghcr.io/$OWNER/dungeon-crew-$app\$|{n;s|digest: .*|digest: $digest|}" "$file"
    grep -q "digest: $digest" "$file" || { echo "Could not pin $app in $file"; exit 1; }
    echo "$app: pinned $digest"
  done
  if git diff --quiet -- "$file"; then
    echo "Nothing to deploy."
    return
  fi
  kubectl kustomize k8s > /dev/null
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git commit -qm "Deploy ${GITHUB_SHA::7}" -- "$file"
  git push origin HEAD:main
}

"$@"
