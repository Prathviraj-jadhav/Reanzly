# Switching CD to a self-hosted runner

## Why

The current deploy job (`Continuous Deployment (CD)` in
`.github/workflows/ci-cd.yml`) connects **out** from GitHub's cloud runners to
the deploy server over SSH. That requires the server's SSH port (`65002` by
default) to accept inbound connections from GitHub Actions' IP ranges. In
practice that port has been unreachable, so every deploy step is skipped —
the pipeline reports success (build + security checks pass) but nothing
actually reaches the live server.

A self-hosted runner flips the direction: a small agent process installed
**on the deploy server** opens an outbound connection to GitHub and pulls
jobs down. No inbound port needs to be open at all — the same way `git pull`
or checking email works through a firewall that blocks everything inbound.

This repo already has both deploy paths defined, gated by a repository
variable:

- `DEPLOY_MODE` unset (default) → the existing SSH-based job runs, unchanged.
- `DEPLOY_MODE = self-hosted-runner` → the SSH job is skipped and the new
  `cd-deploy-self-hosted-runner` job runs instead.

Switching is a two-part job: the steps below need **direct access to the
deploy server** (SSH/console) to run once. Nothing here works without that —
if you don't have that access, this needs to go to whoever manages the
server.

## One-time server setup

Run these **on the deploy server itself**, as a regular (non-root) user that
will own the deploy:

### 1. Create the app directory

```bash
sudo mkdir -p /opt/reanzly
sudo chown "$USER":"$USER" /opt/reanzly
```

### 2. Install the GitHub Actions runner

In the GitHub repo: **Settings → Actions → Runners → New self-hosted
runner**, choose Linux/x64. GitHub shows the exact `curl`/`tar` download
commands with a version number and a short-lived registration token baked
in — copy them from there rather than hardcoding a version here, since
runner releases move fast. It looks like:

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/vX.XXX.X/actions-runner-linux-x64-X.XXX.X.tar.gz
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/Prathviraj-jadhav/Reanzly --token <TOKEN_FROM_GITHUB_UI>
```

Accept the defaults when `config.sh` prompts (runner name, work folder,
labels) unless you have a reason to change them — the workflow targets
`runs-on: [self-hosted]`, which matches any self-hosted runner registered to
this repo regardless of its name.

### 3. Install it as a persistent service

So it survives reboots and keeps running after you log out:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Check it's running:

```bash
sudo ./svc.sh status
```

### 4. Make sure the deploy prerequisites are present

The deploy script (`scripts/deploy-prod.sh`) expects Docker + Docker
Compose, and `rsync` (used by the new job to copy the checked-out code into
`/opt/reanzly`):

```bash
docker --version
docker compose version
rsync --version
```

Install whichever are missing before continuing.

## Flip the switch

Once the runner shows **Idle** under Settings → Actions → Runners:

1. GitHub repo → **Settings → Secrets and variables → Actions → Variables**
   tab → **New repository variable**.
2. Name: `DEPLOY_MODE`, Value: `self-hosted-runner`.
3. Confirm these secrets still exist (the self-hosted job reuses them):
   `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. The `SSH_*` secrets are
   no longer used once switched over — safe to leave them, or remove them
   later.
4. Push to `main` (or re-run the last workflow run) and watch the
   `Continuous Deployment (CD) - Self-Hosted Runner` job pick it up.

## Rolling back

Delete the `DEPLOY_MODE` repository variable (or set it to anything other
than `self-hosted-runner`) and the next push goes back through the SSH path
exactly as before. The self-hosted runner can stay registered and idle with
no effect either way.
