# Pushkin v5.0 - Unified Architecture (Future)

**Status:** Planning/Design Phase
**Target Branch:** `feature/v5-unified-workflow` (branches from `refactor/aws-deployment`)
**Target Release:** v5.0.0 (major version - breaking changes)

---

## Vision

Redesign Pushkin CLI to reflect the natural researcher workflow: develop locally → test → publish to production.

**Key Philosophy:**

- Local and cloud deployment are **phases of the same workflow**, not separate systems
- Commands should mirror familiar tools (npm, git, docker)
- Interactive by default, scriptable when needed
- One status command that knows about everything

---

## Command Structure

### Current (v4.x) vs. Proposed (v5.0)

| Current                             | v5.0                           | Rationale                   |
| ----------------------------------- | ------------------------------ | --------------------------- |
| `pushkin install site`              | `pushkin init`                 | Matches npm, clearer intent |
| `pushkin install experiment <name>` | `pushkin add <name>`           | Shorter, clearer            |
| `pushkin remove <name>`             | `pushkin remove <name>`        | Keep same ✅                |
| `pushkin prep`                      | `pushkin build`                | More intuitive              |
| `pushkin start`                     | `pushkin start`                | Keep same ✅                |
| `pushkin stop`                      | `pushkin stop`                 | Keep same ✅                |
| `pushkin kill`                      | `pushkin clean`                | Less aggressive name        |
| `pushkin armageddon`                | `pushkin clean --all`          | Nuclear option as flag      |
| `pushkin aws init`                  | `pushkin publish`              | First publish auto-inits    |
| `pushkin aws update`                | `pushkin publish`              | Same command!               |
| `pushkin aws status`                | `pushkin status`               | Smart detection             |
| `pushkin aws list`                  | `pushkin status`               | Merged into one             |
| `pushkin aws armageddon`            | `pushkin publish --destroy`    | Less scary                  |
| `pushkin setDockerHub`              | `pushkin set dockerhub <user>` | Unified config              |
| `pushkin config`                    | `pushkin config`               | Keep same ✅                |

---

## Detailed Command Design

### `pushkin init` - Initialize new Pushkin site

**Interactive mode (default):**

```bash
pushkin init
# Prompts appear:
#   ? What's your project name? my-awesome-site
#   ? Use template? (default/@pushkin/basic/custom)
#   ? DockerHub username? cherriechang
#   ? Enable authentication? (y/N)
#   Creating Pushkin site...
```

**Non-interactive mode:**

```bash
pushkin init my-site --template @pushkin/basic --dockerhub cherriechang

# Or with defaults
pushkin init my-site
```

**Implementation:**

- Replaces `pushkin install site`
- Interactive prompts using inquirer
- CLI flags override prompts
- Collects ALL initial setup info (DockerHub, Auth0, etc.)

---

### `pushkin add <experiment>` - Add experiment

**Examples:**

```bash
pushkin add lexical-decision
pushkin add stroop-task --template @pushkin/exp-basic
pushkin add my-exp --from ./local-template
```

**Implementation:**

- Replaces `pushkin install experiment`
- Shorter, clearer command
- Same functionality

---

### `pushkin build` - Build project for local development

**Examples:**

```bash
pushkin build
pushkin build --verbose
```

**What it does:**

1. Build front-end assets
2. Update docker-compose config
3. Run database migrations
4. Prepare experiment workers

**Implementation:**

- Replaces `pushkin prep`
- More intuitive name (matches `npm run build`, `docker build`)
- Same underlying logic from prep/index.js

---

### `pushkin start` - Start local development server

**Examples:**

```bash
pushkin start
pushkin start --verbose
```

**Keep exactly as is** ✅

---

### `pushkin publish` - Deploy to AWS (smart init/update)

**First time (auto-init):**

```bash
pushkin publish
# Detects no AWS resources exist
# Prompts for AWS credentials if needed
# Runs full initialization
# Deploys to AWS
# Outputs: https://my-site.com
```

**Subsequent times (update):**

```bash
pushkin publish
# Detects existing AWS resources
# Updates deployment with changes
# Outputs: Updated https://my-site.com
```

**Force re-init:**

```bash
pushkin publish --init
```

**Destroy resources:**

```bash
pushkin publish --destroy
# Prompts: Are you sure? This will delete all AWS resources. (y/N)
```

**Implementation:**

```javascript
async function publish(options) {
  const awsResources = readAwsResources();

  if (!awsResources || options.init) {
    // First time or forced init
    console.log("Initializing AWS infrastructure...");
    await awsInit();
  } else {
    // Update existing deployment
    console.log("Updating AWS deployment...");
    await awsUpdate();
  }

  console.log(`✅ Deployed to ${cloudFrontUrl}`);
}
```

**Replaces:**

- `pushkin aws init` (first time)
- `pushkin aws update` (subsequent)
- Unified workflow!

---

### `pushkin status` - Smart status detection

**Example output:**

```bash
pushkin status

📍 Local Development
   Docker: ✅ Running (3 containers)
   API: http://localhost:5000
   Frontend: http://localhost:3000
   Database: ✅ Connected (test_db)

☁️  Production (AWS)
   Status: ✅ Deployed
   URL: https://my-site.com
   CloudFront: ✅ Deployed
   RDS: ✅ 2 databases available
   ECS: ✅ 3 services running (6/6 tasks)
   Last deployed: 2 hours ago

📦 Project
   Name: my-awesome-site
   Experiments: 3 (lexical-decision, stroop-task, simon-task)
```

**If nothing running:**

```bash
pushkin status

📍 Local Development
   Docker: ⚪ Not running
   Run `pushkin start` to start local server

☁️  Production (AWS)
   Status: ⚪ Not deployed
   Run `pushkin publish` to deploy to AWS
```

**Implementation:**

- Detects what exists (local Docker, AWS resources, both, neither)
- Shows relevant information based on what's running
- Helpful next steps if nothing exists
- Database-agnostic (shows all configured DBs)

**Replaces:**

- `pushkin aws status`
- `pushkin aws list`
- Adds local status checking (new!)

---

### `pushkin set <key> <value>` - Unified configuration

**Examples:**

```bash
pushkin set dockerhub cherriechang
pushkin set auth.domain dev-abc123.us.auth0.com
pushkin set auth.clientId xyz789

pushkin get dockerhub
# Output: cherriechang

pushkin config
# Shows all configuration
```

**Implementation:**

- Unified way to set configuration
- Modifies pushkin.yaml
- Can handle nested keys with dot notation

**Replaces:**

- `pushkin setDockerHub`
- Adds general config management

---

### Other Commands

**Keep as-is:**

- `pushkin stop` ✅
- `pushkin remove <experiment>` ✅
- `pushkin config [what]` ✅

**New/Modified:**

- `pushkin clean` - Remove local Docker resources (was: `pushkin kill`)
- `pushkin clean --all` - Complete reset (was: `pushkin armageddon`)
- `pushkin logs [service]` - View logs (new!)
- `pushkin restart` - Restart local server (new! shorthand for stop + start)

---

## Folder Structure (v5.0)

```
src/
  index.js                          ← Slim CLI router (200 lines)

  /commands/
    /init/
      site.js                       ← pushkin init

    /experiments/
      add.js                        ← pushkin add
      remove.js                     ← pushkin remove

    /dev/                           ← Local development
      build.js                      ← pushkin build
      start.js                      ← pushkin start
      stop.js                       ← pushkin stop
      restart.js                    ← pushkin restart
      clean.js                      ← pushkin clean
      logs.js                       ← pushkin logs

    /publish/                       ← Production deployment
      index.js                      ← pushkin publish (orchestration)
      init.js                       ← First-time AWS setup
      update.js                     ← Update existing deployment
      destroy.js                    ← Tear down AWS resources
      /aws/                         ← AWS-specific implementations
        cloudfront.js
        rds.js
        s3.js
        ecs.js
        elb.js
        route53.js
        security.js
      /utils/
        aws-client-factory.js
        aws-config.js
        aws-resources.js

    /status/                        ← Status checking
      index.js                      ← Smart detection coordinator
      local.js                      ← Check local Docker status
      aws.js                        ← Check AWS resource status

    /config/
      set.js                        ← pushkin set
      get.js                        ← pushkin get
      view.js                       ← pushkin config

  /utils/                           ← Shared utilities
    docker.js                       ← Docker operations
    build.js                        ← Build logic
    migrations.js                   ← Database migrations
    file.js                         ← File operations
    pushkin-config.js               ← Config management
    package-manager.js              ← npm/yarn detection
```

---

## User Workflows

### Workflow 1: New User, First Project

```bash
# Initialize new site
pushkin init
#   ? What's your project name? my-experiment-site
#   ? DockerHub username? myusername
#   ✅ Created my-experiment-site/

cd my-experiment-site

# Add experiments
pushkin add lexical-decision
pushkin add stroop-task

# Build and test locally
pushkin build
pushkin start
# Visit http://localhost:3000
# Test experiments...

# Check status
pushkin status
#   📍 Local Development: ✅ Running
#   ☁️  Production: ⚪ Not deployed

# Deploy to production
pushkin publish
#   ? AWS profile to use? default
#   Initializing AWS infrastructure...
#   ✅ Deployed to https://my-experiment-site.com

# Check status again
pushkin status
#   📍 Local Development: ✅ Running
#   ☁️  Production: ✅ Deployed (https://my-experiment-site.com)
```

### Workflow 2: Existing User, Update Deployment

```bash
# Make changes to experiments
# Edit experiment code...

# Rebuild
pushkin build

# Test locally
pushkin restart
# Visit http://localhost:3000

# Deploy updates
pushkin publish
#   Updating AWS deployment...
#   ✅ Updated https://my-experiment-site.com
```

### Workflow 3: Tear Down Resources

```bash
# When project is complete
pushkin publish --destroy
#   ⚠️  This will delete all AWS resources
#   ? Are you sure? (y/N) y
#   Deleting CloudFront distribution...
#   Deleting RDS databases...
#   Deleting ECS cluster...
#   ✅ All AWS resources deleted
```

---

## Interactive Prompts

All commands support both interactive and non-interactive modes:

**Pattern:**

```javascript
async function init(projectName, options) {
  // If argument not provided, prompt for it
  if (!projectName) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "What is your project name?",
        default: "my-pushkin-site",
      },
    ]);
    projectName = answer.projectName;
  }

  // If flag not provided, prompt for it
  if (!options.dockerhub) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "dockerhub",
        message: "DockerHub username?",
      },
    ]);
    options.dockerhub = answer.dockerhub;
  }

  // Proceed with init...
}
```

**Allows:**

```bash
# Fully interactive
pushkin init

# Partially interactive (provides name, prompts for rest)
pushkin init my-site

# Fully scripted (CI/CD friendly)
pushkin init my-site --template @pushkin/basic --dockerhub myuser --no-auth
```

---

## Migration Strategy

### Phase 1: Implement New Structure

1. Create new command files in new folder structure
2. Implement smart status detection
3. Implement unified publish command
4. Add interactive prompts

### Phase 2: Deprecate Old Commands

1. Keep old commands working with deprecation warnings
2. Internally route to new implementations

Example:

```javascript
// OLD: pushkin aws init
program.command("aws <cmd>").action((cmd, options) => {
  if (cmd === "init") {
    console.warn("⚠️  DEPRECATED: Use `pushkin publish` instead");
    console.warn("   This command will be removed in v6.0.0");
    // Then call new implementation
    return publish(options);
  }
});
```

### Phase 3: Update Documentation

1. Update all docs to use new commands
2. Add migration guide
3. Update examples in README

### Phase 4: Release v5.0.0

1. Mark as major version (breaking changes)
2. Clear changelog
3. Migration guide prominent in release notes

---

## Breaking Changes Summary

**Commands renamed:**

- `pushkin install site` → `pushkin init`
- `pushkin install experiment` → `pushkin add`
- `pushkin prep` → `pushkin build`
- `pushkin aws init` → `pushkin publish`
- `pushkin aws status` → `pushkin status`
- `pushkin setDockerHub` → `pushkin set dockerhub`

**Commands removed:**

- `pushkin aws list` (merged into `pushkin status`)
- `pushkin aws update` (merged into `pushkin publish`)
- `pushkin aws armageddon` (now `pushkin publish --destroy`)
- `pushkin kill` (now `pushkin clean`)
- `pushkin armageddon` (now `pushkin clean --all`)

**New commands:**

- `pushkin status` (smart detection)
- `pushkin publish` (smart init/update)
- `pushkin set/get` (unified config)
- `pushkin restart` (convenience)
- `pushkin logs` (new feature)

**Config changes:**

- None! pushkin.yaml structure unchanged

---

## Timeline Estimate

**Phase 1: Implementation** - 2-3 weeks

- Week 1: New folder structure, basic commands
- Week 2: Smart status, unified publish
- Week 3: Interactive prompts, polish

**Phase 2: Testing** - 1 week

- Unit tests
- Integration tests
- E2E testing on real projects

**Phase 3: Documentation** - 1 week

- Update all docs
- Write migration guide
- Update examples

**Total:** ~4-5 weeks for v5.0.0 release

---

## Dependencies

**Must complete first:**

- ✅ `refactor/aws-deployment` branch (internal structure cleanup)

**Can do in parallel:**

- Documentation updates
- Test suite expansion
- Example projects update

---

## Success Criteria

1. ✅ All old functionality preserved (just renamed)
2. ✅ Smart status detection works
3. ✅ `pushkin publish` auto-detects init vs update
4. ✅ Interactive prompts work in all commands
5. ✅ Non-interactive mode works (CI/CD)
6. ✅ Migration guide complete
7. ✅ All tests passing
8. ✅ Games With Words site upgradeable to v5.0

---

## Future GUI (Post-v5.0)

After v5.0 is stable, consider adding:

```bash
pushkin ui
# Opens web interface at localhost:5050
# Shows project status, experiments, deployment info
# Provides GUI for common operations
```

**NOT a replacement for CLI**, just a complement for users who prefer visual interfaces.

See section in previous discussion for details.

---

## Notes

- This is a **MAJOR** version bump (v4.x → v5.0)
- Breaking changes are acceptable since user base is small
- Focus on getting the API right, not preserving backwards compatibility
- CLI should be intuitive for NEW users, not just existing ones
