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
Promotion is explicit: update the image digests in `k8s/kustomization.yaml` to
promote a build. The initial pins refer to the successful `da6bf5f` build.
Both images are publicly pullable; no registry credential is needed.

First deployment order:

1. Merge the application deployment preparation before the infra registration.
2. Register the Application from `mtrenker/infra` under
   `argocd/applications/dungeon-crew.yaml`. It watches this repository's `main:k8s`
   and creates namespace `dungeon-crew`. Its merge triggers automatic reconciliation.
3. Observe Argo sync/health, the web deployment, `/api/health`, and TLS issuance
   for `dungeon-crew.de`. DNS must reach the ingress and `letsencrypt-prod` must be ready.
4. Verify `dungeon-discord` SealedSecret status without reading its decrypted data.
   The encrypted token is bound to that name and namespace, using the production
   `sealed-secrets-controller` in `kube-system`. No plaintext secret is committed.
5. Leave the bot at zero replicas until the operator stops the local Pullbert
   instance and explicitly approves activation. Guild commands are already registered.
   Then change `k8s/bot.yaml` to one replica in a reviewed Git change.

Rollback: revert image digests to the last working build for an application
failure, or keep the bot at zero replicas to disable it. Removing the infra
Application can cascade-delete its namespace resources via its finalizer;
there is no application database or persistent volume in this deployment.
Do not use imperative cluster changes to bypass GitOps.

No secret is needed to build either image. Token rotation requires resealing the
new token for the same namespace/name and restarting the bot after reconciliation;
changing a Secret alone does not update an existing process's environment.
