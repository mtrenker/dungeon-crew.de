# Dungeon Crew

WoW Forever guild monorepo. TypeScript, pnpm workspaces, Next.js App Router,
and discord.js. No database until a feature needs one.

`packages/knowledge` holds WoW Forever game knowledge as plain JSON (zones,
dungeons, farming spots with mob levels, and their sources) plus the rules
derived from it, such as the level a spot becomes viable. It has no build step
and no dependencies, so the bot, the website or a script can all import it.

## Local development

Use Node.js 22 and pnpm 10.24.0 (`mise install`, or Corepack).
The lockfile is committed. Dependency build scripts are allowlisted in
`pnpm-workspace.yaml`; new releases must be at least 24 hours old.

```sh
pnpm install --frozen-lockfile
pnpm dev:web
```

Web: http://localhost:3000. The page is a placeholder, not a finished design.

For the bot, copy `apps/bot/.env.example` to `apps/bot/.env` and fill in
the token, application ID, and guild ID from the Discord developer portal.
Install the application in your guild with `bot` and `applications.commands`
scopes. No privileged gateway intents or administrator permissions are needed.

```sh
pnpm --filter @dungeon/bot commands:register
pnpm dev:bot
```

Registration replaces this application's guild command list with the commands in
`apps/bot/src/commands.ts`. Run it explicitly when commands change, not on startup.
Try `/ping` in Discord. `/farm` suggests gold farming spots for a character,
given as an armory link (the bot reads level, class and gathering skills from
the public armory page) or as level, professions and class. The spot list and
its price estimates are data in `packages/knowledge/data/farm-spots.json`. A
spot is only suggested once the mobs there are within reach of the character's
level. `pnpm dev` runs both apps and requires bot credentials.

### Proton Pass (no plaintext secrets file)

With an authenticated `pass-cli` session, copy `.env.pass.example` to
`.env.pass` at the repository root and replace the vault/item placeholders.
This ignored file contains only references, not secret values.
Use unique vault/item names or IDs to avoid ambiguous lookups.

```sh
pnpm bot:register:pass  # Replaces this application's guild command list
pnpm dev:bot:pass
```

These commands resolve references into the child process environment without
writing credentials to disk. They use your current Proton Pass session; set
`PROTON_PASS_SESSION_DIR` if using a dedicated session. Agent sessions also
require a task-specific `PROTON_PASS_AGENT_REASON`.
Runtime injection takes precedence over values in `apps/bot/.env`.
The public application key is not needed for the Gateway connection.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Containers and cluster

`Dockerfile` has separate `web` and `bot` targets:

```sh
docker build --target web -t dungeon-web .
docker build --target bot -t dungeon-bot .
kubectl kustomize k8s
```

The setup follows ../clean.dev: GHCR images, Kustomize, Argo CD, nginx ingress,
cert-manager's `letsencrypt-prod` issuer, and Sealed Secrets. The web exposes
`/api/health`. The bot has internal liveness and Discord-readiness probes on
port 3001, no Service or public ingress, and a Recreate strategy to avoid
overlapping sessions. Keep it at one replica unless sharding is implemented.

CI checks and builds PRs, and publishes both images with full commit-SHA tags on
main. It does not apply manifests or automatically change deployment tags yet.
Unlike clean.dev's automatic image-tag commits, promotion is explicit while the
repository and cluster registration are being established.

Before the first deployment:

1. Confirm the GitHub owner (manifests currently assume `mtrenker`), domain
   `dungeon-crew.de`, and target namespace `dungeon-crew`.
2. Publish images, then replace both `bootstrap` tags in
   `k8s/kustomization.yaml` with the published `sha-<full commit SHA>`.
   Make packages public or configure a registry pull secret.
3. In the cluster's GitOps configuration, register an Argo CD Application pointing
   at this repository's `main` branch and `k8s` path, with namespace creation
   enabled. clean.dev does not contain that external registration.
4. Confirm DNS points at the ingress and the issuer exists.
5. Provision a SealedSecret named `dungeon-discord` in `dungeon-crew` with key
   `token`. Add the sealed manifest to Kustomize resources. The sibling project
   uses controller `sealed-secrets-controller` in `kube-system`; verify that
   target before sealing. Never commit plaintext credentials or reuse clean.dev's
   sealed secrets (they are bound to their names and namespaces).
6. Register guild commands, then change the bot's replicas from 0 to 1 in Git.

No cluster resources, Discord commands, DNS, or remote repository are created by
this scaffold. No secret is needed to build either image.
