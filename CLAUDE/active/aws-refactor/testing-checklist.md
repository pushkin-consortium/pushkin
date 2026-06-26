# Testing Checklist

**Targets:**
- Unit tests for all phase modules (80%+ coverage target)
- Unit tests for utilities (file.js, pushkin-config.js, docker.js)
- Integration tests for full deployment cycle
- CI/CD pipeline for automated testing

---

## 1. Unit Tests

### Test file locations

```
src/
  __tests__/
    handleAWSInit.test.js             ← co-located with src/index.js

  commands/aws/
    phases/
      __tests__/
        configure-deployment.test.js  ← phase unit tests
    utils/
      __tests__/
        aws-client-factory.test.js    ✅ passing
        retry.test.js                 ✅ passing
    __tests__/
      awsInit.test.js                 ← orchestration test for aws/index.js

  utils/
    __tests__/                        ← future: pushkin-config, docker tests

  commands/prep/
    __tests__/                        ← future, after v5 prep refactor

  commands/setupdb/
    __tests__/                        ← future, after v5 setupdb refactor
```

### Already Passing ✅

- [x] `src/commands/aws/utils/__tests__/aws-client-factory.test.js`
- [x] `src/commands/aws/utils/__tests__/retry.test.js`
- [x] `src/commands/aws/index.spec.js` (docker buildx arg handling)

### aws init workflow — to write next

#### `src/commands/aws/phases/__tests__/configure-deployment.test.js`

- [ ] `updateDeploymentConfig()` writes correct fields to pushkin.yaml
- [ ] `chooseSiteDomain()` returns null when user selects "No custom domain"
- [ ] `chooseSiteDomain()` returns domain when user picks from list
- [ ] `chooseSiteDomain()` prompts for custom input when user selects "Enter a custom domain"
- [ ] `chooseSSLCertificate()` returns the ARN matching the user's selection
- [ ] `configureDeployment()` threads domain + certificate through to the config write

#### `src/commands/aws/__tests__/awsInit.test.js`

- [ ] All six phase functions are called when `awsInit()` runs
- [ ] `provisionDbs`, `buildFrontend`, `setupBackend`, `migrateDbs`, `deployFrontEnd`, `deployWorkers` each receive correct args
- [ ] `configureDeployment` is called before any parallel phases start
- [ ] `Promise.all([backendSetup, dbMigrations, frontendDeployment, workersDeployment])` is awaited
- [ ] Error in any phase propagates and rejects the top-level promise

#### `src/__tests__/handleAWSInit.test.js`

- [ ] Exits with error if `aws --version` fails (AWS CLI not installed)
- [ ] Uses existing `projectName` + `s3BucketName` from config when user picks existing project
- [ ] Generates new bucket name and writes awsResources when user picks "new"
- [ ] `--force` flag resets awsResources and generates a new bucket name
- [ ] Calls `initAwsProfile(iam)` before `awsInit()`

### Run Tests

```bash
cd packages/pushkin-cli
yarn test
```

Expected output: All tests passing ✅

---

## 2. Local Development Testing

Test on a **fresh Pushkin project** to ensure clean-slate functionality.

### Setup

```bash
# Create new test project
pushkin install site test-refactor-site
cd test-refactor-site
```

### Commands to Test

- [ ] `pushkin prep`
  - [ ] Front-end builds successfully
  - [ ] Docker compose file updated
  - [ ] Migrations run without errors
  - [ ] No console errors or warnings

- [ ] `pushkin start`
  - [ ] Docker containers start successfully
  - [ ] All 3 containers running (frontend, api, db)
  - [ ] Can access http://localhost:3000
  - [ ] API responds at http://localhost:5000

- [ ] `pushkin stop`
  - [ ] All containers stop cleanly
  - [ ] No orphaned containers

- [ ] `pushkin kill`
  - [ ] Containers and volumes removed
  - [ ] Clean docker state

### Experiment Management

- [ ] `pushkin install experiment basic-exp`
  - [ ] Experiment installed successfully
  - [ ] Config files updated

- [ ] `pushkin remove basic-exp`
  - [ ] Experiment removed successfully
  - [ ] Config files cleaned up

---

## 3. AWS Deployment Testing

Test on a **test AWS account** (NOT production Games With Words account).

⚠️ **WARNING:** This will create AWS resources that cost money. Remember to run armageddon when done!

### Prerequisites

- [ ] AWS credentials configured
- [ ] DockerHub account set up
- [ ] Test project prepared

### AWS Init Flow

- [ ] `pushkin setDockerHub <username>`
  - [ ] DockerHub username saved to config

- [ ] `pushkin aws init`
  - [ ] Prompts for AWS profile (if not already configured)
  - [ ] Creates S3 bucket
  - [ ] Creates CloudFront distribution
  - [ ] Creates RDS databases (Main + Transaction)
  - [ ] Creates ECS cluster and services
  - [ ] Creates load balancer
  - [ ] Creates security groups
  - [ ] No errors or crashes
  - [ ] Returns CloudFront URL

### Resource Verification

- [ ] S3 bucket exists and contains frontend files

  ```bash
  aws s3 ls s3://<bucket-name>
  ```

- [ ] CloudFront distribution is deployed

  ```bash
  aws cloudfront list-distributions
  ```

- [ ] RDS databases are available

  ```bash
  aws rds describe-db-instances
  ```

  - [ ] Both Main and Transaction databases listed
  - [ ] Status: available

- [ ] ECS services running

  ```bash
  aws ecs list-services --cluster <cluster-name>
  ```

  - [ ] API service running
  - [ ] Worker service running

- [ ] Load balancer healthy
  ```bash
  aws elbv2 describe-load-balancers
  ```

  - [ ] State: active

### Status Commands

- [ ] `pushkin aws list`
  - [ ] Lists all Pushkin resources
  - [ ] Shows resource IDs
  - [ ] No errors

- [ ] `pushkin aws status`
  - [ ] Shows detailed status of all resources
  - [ ] CloudFront status displayed
  - [ ] RDS status displayed (database-agnostic - shows all DBs)
  - [ ] ECS status displayed
  - [ ] Load balancer status displayed
  - [ ] S3 bucket status displayed
  - [ ] No hardcoded database assumptions

### Deployed Site Verification

- [ ] Can access site via CloudFront URL
- [ ] Frontend loads correctly
- [ ] Experiments load
- [ ] Database connection works
- [ ] No console errors in browser

### Cleanup

- [ ] `pushkin aws armageddon`
  - [ ] Prompts for confirmation
  - [ ] Deletes CloudFront distribution
  - [ ] Deletes S3 bucket
  - [ ] Deletes RDS databases
  - [ ] Deletes ECS cluster and services
  - [ ] Deletes load balancer
  - [ ] Deletes security groups
  - [ ] No orphaned resources

### Verify Cleanup

```bash
aws s3 ls | grep pushkin
aws cloudfront list-distributions | grep pushkin
aws rds describe-db-instances | grep pushkin
aws ecs list-clusters | grep pushkin
```

Expected: No Pushkin resources found ✅

---

## 4. Games With Words Site Testing

**CRITICAL:** Test that existing production deployment still works.

⚠️ **WARNING:** Do NOT run `pushkin aws armageddon` on this project!

### Setup

```bash
cd /path/to/gww-site
git checkout main
```

### Verification Tests

- [ ] Current deployment status

  ```bash
  pushkin aws status
  ```

  - [ ] Shows all existing resources
  - [ ] Database-agnostic code handles existing DBs correctly
  - [ ] No errors reading configuration

- [ ] Can view current resources

  ```bash
  pushkin aws list
  ```

  - [ ] Lists all resources
  - [ ] No errors

- [ ] Local development still works
  ```bash
  pushkin prep
  pushkin start
  ```

  - [ ] Builds successfully
  - [ ] Starts successfully
  - [ ] Site accessible locally

### Update Deployment (Optional - CAUTION)

Only if confident and have backup:

- [ ] Make minor change to site
- [ ] Run `pushkin prep`
- [ ] Deploy update to AWS
- [ ] Verify update deployed successfully
- [ ] Site still accessible at gameswithwords.org

**If ANY issues:** Immediately rollback and investigate before proceeding.

---

## 5. Database-Agnostic Testing

Create a test project with 3+ databases to verify database-agnostic code.

### Setup

Create custom pushkin.yaml with 3 databases:

```yaml
productionDBs:
  Main:
    type: Main
    name: test-main-db
    # ...
  Transaction:
    type: Transaction
    name: test-transaction-db
    # ...
  Analytics:
    type: Analytics
    name: test-analytics-db
    # ...
```

### Tests

- [ ] `pushkin aws init` handles 3 databases
- [ ] All 3 databases created in RDS
- [ ] `pushkin aws status` shows all 3 databases
- [ ] No hardcoded assumptions about database count
- [ ] No array index errors

---

## 6. Security Testing

### Command Injection Prevention

Test that shell-quote prevents command injection:

- [ ] Create experiment with malicious name

  ```bash
  # Experiment name: "test; rm -rf /" (should be safe)
  ```

  - [ ] Command does not execute dangerous payload
  - [ ] Shell quote properly escapes

- [ ] Path with spaces and special characters
  - [ ] Paths properly quoted
  - [ ] No command injection

### Input Validation

- [ ] Invalid pushkin.yaml format handled gracefully
- [ ] Missing required fields show helpful errors
- [ ] Invalid AWS credentials show clear error message

---

## 7. Code Quality Checks

### Linting (if configured)

```bash
yarn lint
```

- [ ] No linting errors
- [ ] No warnings in new code

### File Organization

- [ ] No duplicate files (docker.js in both locations)
- [ ] All imports resolve correctly
- [ ] No circular dependencies

### Documentation

- [ ] All new utilities have JSDoc comments
- [ ] All modules have @module annotations
- [ ] README updated (if needed)
- [ ] CHANGELOG.md updated

---

## 8. Regression Testing

Test that nothing previously working is now broken:

### Backwards Compatibility

- [ ] All v4.2.x commands still work
- [ ] No breaking changes to user-facing API
- [ ] Config file format unchanged
- [ ] Output format unchanged (or only enhanced)

### Error Messages

- [ ] Error messages are helpful
- [ ] Stack traces show correct file paths
- [ ] No confusing "Cannot read property of undefined" errors

---

## 9. Performance Testing

### Build Time

- [ ] `pushkin prep` completes in reasonable time
  - [ ] Small project: < 30 seconds
  - [ ] Large project (3+ experiments): < 2 minutes

### AWS Deployment Time

- [ ] `pushkin aws init` completes in reasonable time
  - [ ] Fresh init: 10-15 minutes (waiting for RDS, CloudFront)
  - [ ] No indefinite hangs

---

## 10. Documentation Review

### Code Documentation

- [ ] refactor-internal-structure.md is accurate
- [ ] v5-future-architecture.md is clear
- [ ] testing-checklist.md is complete (this file!)

### User-Facing Documentation

- [ ] README reflects current state
- [ ] CHANGELOG.md has entry for v4.3.0
- [ ] Any user-facing changes documented

---

## Test Environments Summary

### Environment 1: Fresh Test Project

**Purpose:** Test clean installation flow
**Location:** Create new temp project
**AWS:** Test account only

### Environment 2: Games With Words Site

**Purpose:** Verify existing deployments work
**Location:** Production site repository
**AWS:** Production account (READ ONLY - no destructive operations)

### Environment 3: Multi-Database Test Project

**Purpose:** Test database-agnostic code
**Location:** Custom test project
**AWS:** Test account only

---

## Completion Checklist

Before merging to main:

- [ ] All unit tests passing
- [ ] Fresh project test complete
- [ ] AWS deployment test complete
- [ ] GWW site verified working
- [ ] Database-agnostic test complete
- [ ] Security tests passed
- [ ] Code quality checks passed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] PR description complete with test results

---

## Test Results Template

Use this when creating PR:

```markdown
## Test Results

### Unit Tests

- ✅ All tests passing
- Coverage: XX%

### Local Development

- ✅ Fresh project install works
- ✅ `pushkin prep` works
- ✅ `pushkin start` works
- ✅ Site loads at localhost:3000

### AWS Deployment

- ✅ `pushkin aws init` works
- ✅ All AWS resources created
- ✅ `pushkin aws status` shows all resources
- ✅ Deployed site accessible
- ✅ `pushkin aws armageddon` cleans up

### Regression

- ✅ Games With Words site unaffected
- ✅ All existing commands work
- ✅ No breaking changes

### Database-Agnostic

- ✅ Works with 3+ databases
- ✅ No hardcoded assumptions

### Security

- ✅ shell-quote prevents injection
- ✅ Input validation works

### Code Quality

- ✅ Linting passed
- ✅ No duplicate files
- ✅ Documentation complete
```

---

## Notes

- Run tests in order listed above
- Stop immediately if critical test fails
- Document any issues found
- Create GitHub issues for non-blocking problems
- Test coverage is important but not blocking (aim for >80%)
