# Pushkin Development Workflow

## Current Development Status
- **Branch**: `fixAWS` (working branch)
- **Base Branch**: `main` (for PRs)
- **Primary Goal**: Migrate AWS CLI commands to AWS SDK for JavaScript v3
- **Known Issue**: "CLI-based AWS deploy does not currently work and is being updated" (official docs)

## Build & Test Environment

### Build System  
```bash
# From packages/pushkin-cli/
npm run build          # Babel transpilation: src/ → build/
npm run prepack        # Copy LICENSE for publishing

# Root level
yarn test              # Run Jest test suite
yarn test:e2e          # End-to-end testing
```

### Current Testing Infrastructure

**Framework**: Jest (configured in root package.json)
- **Unit Tests**: ❌ None for AWS functionality  
- **Integration Tests**: ❌ Very limited
- **AWS SDK Mocking**: ❌ Not set up
- **Test Files Found**: Only built test in `packages/pushkin-cli/build/commands/aws/integration.test.js`

**Missing Test Coverage:**
- No unit tests for AWS CLI→SDK migration
- No mocking for AWS services (S3, RDS, ECS, etc.)
- No integration tests with real AWS resources
- No error handling validation

### Development Commands

**Core Development Cycle:**
```bash
# 1. Make changes to source
cd packages/pushkin-cli/src/commands/aws/

# 2. Build changes
npm run build

# 3. Test locally (in CLI package)
node build/index.js aws list

# 4. Test in real environment (quickstart site)
cd ~/Documents/Pushkin/pushkin_quickstart/
pushkin aws list
```

**AWS Testing Commands:**
```bash
# Primary validation
pushkin aws list              # Check current AWS resources

# Full deployment test  
pushkin aws init              # Initialize AWS infrastructure

# Reset for clean testing
pushkin aws armageddon        # Delete all AWS resources

# Specific resource checks
aws cloudformation list-stacks --profile cherriechang
aws ecs describe-services --cluster pushkin-cluster --profile cherriechang
```

## Project Structure & Dependencies

### Workspace Management
- **Package Manager**: Yarn with workspaces
- **Monorepo Structure**: Multiple packages in `/packages/`
- **CLI Location**: `packages/pushkin-cli/` (our focus)

### Key Dependencies
```json
// From packages/pushkin-cli/package.json
{
  "dependencies": {
    "@aws-sdk/client-acm": "^3.454.0",
    "@aws-sdk/client-route-53": "^3.552.0", 
    "@aws-sdk/client-s3": "^3.884.0",
    "@aws-sdk/client-sts": "^3.454.0",
    "@aws-sdk/credential-provider-ini": "^3.451.0",
    "commander": "^9.4.0",        // CLI framework
    "inquirer": "^8.2.4"          // Interactive prompts
  }
}
```

### Missing Dependencies (for full migration)
Need to install for remaining AWS services:
```json
{
  "@aws-sdk/client-rds": "^3.x",
  "@aws-sdk/client-ecs": "^3.x", 
  "@aws-sdk/client-cloudfront": "^3.x",
  "@aws-sdk/client-elastic-load-balancing-v2": "^3.x",
  "@aws-sdk/client-ec2": "^3.x",
  "@aws-sdk/client-cloudwatch": "^3.x"
}
```

## Testing Strategy & Environment

### Primary Test Environment
**Location**: `/Users/cherriechang/Documents/Pushkin/pushkin_quickstart/`
- **Created via**: Pushkin Quickstart Tutorial
- **Purpose**: Real-world testing environment with actual AWS resources
- **Benefits**: Exposes real integration issues, dependency problems
- **Reset Method**: `pushkin aws armageddon` for clean slate

### Testing Approach (Based on Previous Experience)

**Incremental Testing Pattern:**
1. Make 1-2 function changes (e.g., fix Route53 imports)
2. Build: `npm run build`
3. Test locally: `node build/index.js aws list`
4. Test integration: `pushkin aws init` (in quickstart site)
5. Validate: `pushkin aws list` + manual AWS console checking

**Key Validation Checkpoints:**
```bash
# ✅ Basic connectivity  
pushkin aws list | grep -E "(DBInstances|ECS|LoadBalancers)"

# ✅ Infrastructure creation
aws cloudformation list-stacks --profile cherriechang

# ✅ Service health
aws ecs describe-services --cluster pushkin-cluster --profile cherriechang

# ✅ Load balancer health  
aws elbv2 describe-target-health --target-group-arn <arn> --profile cherriechang

# ✅ Application accessibility (end-to-end)
curl -I http://<load-balancer-dns>/
```

## Git Workflow & Commit Patterns

### Current Branch Strategy
```bash
git status                    # Check current changes
git log --oneline -5         # Recent commits for context
git diff                     # Review changes before commit
```

**Recent Commit Patterns:**
```
1c0b0918 fix makeRecordSet() call in deployFrontEnd()
7aa9e212 delete hostedZoneId parameter from makeRecordSet(); delete unreferenced builtFrontEnd var
d0f968ec first pass at fixing makeRecordSet(); not yet tested
```

**Recommended Commit Style:**
- Start with action verb: `fix`, `add`, `update`, `remove`
- Include function/file context: `fix makeRecordSet() in deployFrontEnd()`  
- Reference line numbers for small changes: `fix Route53 import on line 32`

### Current Modified Files (from git status)
```
M packages/pushkin-cli/package.json        # Dependencies
M packages/pushkin-cli/src/commands/aws/awsConfigs.js  # Config updates  
M packages/pushkin-cli/src/commands/aws/index.js       # Main logic
M yarn.lock                                            # Dependency lock
```

## AWS Profile & Credentials

### Profile Configuration
- **AWS Profile**: `cherriechang` (for testing)
- **Region**: `us-east-1` (required by Pushkin)
- **Credential Method**: AWS CLI profiles (`~/.aws/config`)

### Credential Validation
```bash
# Test AWS connectivity
aws sts get-caller-identity --profile cherriechang

# Test specific service access  
aws s3 ls --profile cherriechang
aws rds describe-db-instances --profile cherriechang
```

## Development Best Practices

### Code Style & Patterns
- **ES6+ Modules**: `import/export` syntax
- **Async/Await**: Preferred over Promises chains
- **Error Handling**: Needs standardization (current inconsistency)
- **Function Size**: Break down large functions (3,700+ line file)

### Migration Approach
1. **One Service at a Time**: Don't change multiple AWS services simultaneously
2. **Maintain Backward Compatibility**: Keep CLI commands working during transition
3. **Test Each Change**: Don't batch multiple function updates
4. **Document Errors**: Keep track of issues found during testing

### Recommended Testing Additions

**Unit Testing Setup:**
```javascript
// Add to package.json
"devDependencies": {
  "aws-sdk-client-mock": "^3.x",    // Mock AWS SDK calls
  "jest": "^29.x"                   // Already configured
}
```

**Integration Testing Scripts:**
```bash
# Create test-basic.sh
#!/bin/bash
echo "=== Testing Basic Infrastructure ==="
pushkin aws list | grep -E "(DBInstances|ECS Clusters|Load Balancers)"

# Create test-services.sh  
#!/bin/bash
echo "=== Testing Service Health ==="
aws ecs describe-services --cluster pushkin-cluster --profile cherriechang
```

## Environment Setup for New Sessions

**Quick Context Check:**
```bash
cd /Users/cherriechang/Documents/Pushkin/pushkin
git status                    # See current work
git log --oneline -3         # Recent progress
cat CLAUDE/current-focus.md  # Session-specific context
```

**Build & Test Readiness:**
```bash
cd packages/pushkin-cli
npm run build                # Ensure latest changes built
cd ~/Documents/Pushkin/pushkin_quickstart  
pushkin aws list            # Verify AWS connectivity
```