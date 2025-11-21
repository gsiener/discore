# Deployment Setup

This document describes how to set up CI/CD for the Scorebot project.

## GitHub Secrets

You need to add the following secrets to your GitHub repository:

1. Go to your repository Settings → Secrets and variables → Actions
2. Add the following secrets:

### Required Secrets

- **CLOUDFLARE_API_TOKEN**: Your Cloudflare API token with Workers and Pages permissions
  - Create at: https://dash.cloudflare.com/profile/api-tokens
  - Required permissions:
    - Account - Workers Scripts - Edit
    - Account - Workers KV Storage - Edit
    - Account - D1 - Edit
    - Account - Cloudflare Pages - Edit

- **CLOUDFLARE_ACCOUNT_ID**: Your Cloudflare account ID
  - Find at: https://dash.cloudflare.com/ (in the URL or sidebar)

## Setting Up Branch Protection

To ensure tests pass before merging to main:

1. Go to Settings → Branches
2. Add a branch protection rule for `main`
3. Enable these settings:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - Add required status checks:
     - `test` (from CI workflow)
   - ✅ Require branches to be up to date before merging
4. Save changes

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`:
- Installs dependencies
- Builds shared package
- Runs all tests
- Type checks bot package
- Builds web package

### CD Workflow (`.github/workflows/cd.yml`)

Runs on every push to `main` (after tests pass):
- Runs tests first
- Deploys bot to Cloudflare Workers
- Deploys web to Cloudflare Pages

Both deploy jobs only run if tests pass.

## Manual Deployment

You can also trigger deployment manually:

1. Go to Actions tab
2. Select "CD - Deploy to Cloudflare"
3. Click "Run workflow"

## Initial Setup

Before the first deployment, you need to:

### 1. Create D1 Database

```bash
cd packages/bot
npx wrangler d1 create scorebot
```

Copy the database ID to `wrangler.toml`

### 2. Run Migrations

```bash
npx wrangler d1 execute scorebot --file=./migrations/0001_initial_schema.sql
```

### 3. Create Durable Object

The Durable Object will be automatically created when you deploy the Worker.

### 4. Create Pages Project

```bash
cd packages/web
npx wrangler pages project create scorebot-web
```

## TDD Workflow

This project follows Test-Driven Development:

1. **Write tests first**: Before adding a feature, write tests that define the expected behavior
2. **Run tests locally**: `npm test`
3. **Implement the feature**: Write code to make the tests pass
4. **Push to GitHub**: CI will automatically run tests
5. **Create PR**: Tests must pass before merging
6. **Merge to main**: Automatic deployment after tests pass

## Running Tests Locally

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for a specific package
cd packages/shared && npm test
cd packages/bot && npm test
cd packages/web && npm test
```

## Troubleshooting

### Tests failing in CI but passing locally

- Ensure you've committed all files
- Check that you've built the shared package: `cd packages/shared && npm run build`
- Verify Node.js versions match (CI uses Node 20)

### Deployment failing

- Verify secrets are set correctly in GitHub
- Check Cloudflare API token has correct permissions
- Ensure wrangler.toml has correct project names and IDs
- Check the Actions logs for specific errors
