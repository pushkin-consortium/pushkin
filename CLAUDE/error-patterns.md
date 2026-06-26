# Pushkin Error Patterns & Solutions

## Current Known Issues

### 🔴 Critical Deployment Issues

**1. Incomplete AWS Deployment**
```
Error Pattern: pushkin aws init creates RDS database but fails to create ECS cluster/load balancer
Status: Confirmed in deployment logs
```
- **Symptoms**: Only database appears in `pushkin aws list`, no ECS or load balancer
- **Root Cause**: ECS service-linked role missing or timing issues
- **Workaround**: Manual AWS CLI commands to create missing infrastructure
- **Permanent Fix**: Implement proper error handling and retry logic in SDK migration

**2. Service Dependency Failures**
```
Error Pattern: API container stuck waiting for RabbitMQ
Log Output: "API container loaded, waiting for rabbitmq"
```
- **Symptoms**: ECS tasks start but fail health checks, load balancer shows unhealthy targets
- **Root Cause**: Services deployed independently without dependency management
- **Workaround**: Ensure RabbitMQ starts before API containers
- **Permanent Fix**: Implement proper service orchestration

### 🟡 Migration-Specific Errors

**3. Missing AWS SDK Imports**
```javascript
Error: ListHostedZonesByNameCommand is not defined
File: packages/pushkin-cli/src/commands/aws/awsConfigs.js
```
- **Symptoms**: Import errors when running AWS commands
- **Root Cause**: Incomplete migration from CLI to SDK
- **Fix**: Add missing imports:
  ```javascript
  import { Route53Client, ListHostedZonesByNameCommand } from "@aws-sdk/client-route-53";
  ```

**4. Function Signature Mismatches**  
```javascript
Error: makeRecordSet() expects different parameters
Current Call: makeRecordSet(domainName, hostedZoneId, recordName, ...)
Updated Function: makeRecordSet(domainName, recordName, ...) // hostedZoneId removed
```
- **Files Affected**: `packages/pushkin-cli/src/commands/aws/index.js:deployFrontEnd()`
- **Fix**: Update function calls to match new signature
- **Status**: Partially fixed in recent commits

### 🟢 Infrastructure Setup Issues

**5. ECS Service-Linked Role Missing**
```bash
Error: The service-linked role for ECS does not exist
AWS Error: InvalidInput when creating ECS cluster
```
- **Symptoms**: CloudFormation stack creation fails
- **Diagnostic**: `aws iam get-role --role-name AWSServiceRoleForECS`
- **Fix**: `aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com`
- **Auto-Fix**: Should be handled automatically in SDK migration

**6. Load Balancer Health Check Failures**
```bash
Target Health: unhealthy
Reason: Health check timeout
```
- **Symptoms**: Application unreachable via load balancer URL
- **Root Cause**: Services not responding on correct ports or paths
- **Diagnostic**: `aws elbv2 describe-target-health --target-group-arn <arn>`
- **Fix**: Verify container port mapping and health check paths

## Error Handling Anti-Patterns (Current Code)

### ❌ Inconsistent Error Handling
```javascript
// Pattern 1: Try-catch with console.log only
try {
  const response = await route53Client.send(command);
} catch (error) {
  console.log('Route53 error:', error.message);
  // No recovery or proper error propagation
}

// Pattern 2: Promise catch chains
someFunction()
  .then(result => processResult(result))
  .catch(error => {
    console.error(error);
    process.exit(1); // Abrupt termination
  });

// Pattern 3: No error handling at all
const result = await awsCommand(); // Could throw unhandled exception
```

### ✅ Recommended Error Handling Patterns
```javascript
// Standardized error handling with context
try {
  const response = await route53Client.send(command);
  return response;
} catch (error) {
  const contextualError = new Error(`Route53 operation failed: ${error.message}`);
  contextualError.originalError = error;
  contextualError.operation = 'createRecordSet';
  contextualError.resourceName = domainName;
  
  // Add retry logic for transient errors
  if (isRetriableError(error) && retryCount < MAX_RETRIES) {
    return retryWithBackoff(operation, retryCount + 1);
  }
  
  throw contextualError;
}
```

## Testing Error Scenarios

### Local Development Errors
```bash
# Build errors
Error: Module not found
Fix: npm run build in packages/pushkin-cli/

# Permission errors  
Error: AWS credentials not found
Fix: aws configure --profile cherriechang

# Version conflicts
Error: Babel transpilation failed
Fix: Check Node version compatibility
```

### AWS Integration Errors
```bash
# Authentication
Error: The security token included in the request is invalid
Fix: aws sts get-caller-identity --profile cherriechang

# Resource limits
Error: Cannot create more resources in region
Fix: Clean up with pushkin aws armageddon

# Networking  
Error: Security group rules prevent access
Fix: Check VPC and security group configurations
```

## Diagnostic Commands

### Quick Health Checks
```bash
# 1. Basic AWS connectivity
aws sts get-caller-identity --profile cherriechang

# 2. Check current Pushkin resources
pushkin aws list

# 3. Verify infrastructure state
aws cloudformation list-stacks --profile cherriechang

# 4. Service health
aws ecs describe-services --cluster pushkin-cluster --profile cherriechang

# 5. Load balancer status
aws elbv2 describe-load-balancers --profile cherriechang
```

### Detailed Debugging
```bash
# Container logs (if ECS tasks exist)
aws logs describe-log-streams --log-group-name /ecs/pushkin-api --profile cherriechang
aws logs get-log-events --log-group-name /ecs/pushkin-api --log-stream-name <stream> --profile cherriechang

# CloudFormation events
aws cloudformation describe-stack-events --stack-name <stack-name> --profile cherriechang

# Target group health
aws elbv2 describe-target-health --target-group-arn <arn> --profile cherriechang
```

## Common Fix Patterns

### 1. Import Resolution
```javascript
// Before (CLI-based)
const { exec } = require('child_process');
exec('aws route53 list-hosted-zones-by-name', ...);

// After (SDK-based)
import { Route53Client, ListHostedZonesByNameCommand } from "@aws-sdk/client-route-53";
const client = new Route53Client({ region: 'us-east-1', credentials: fromIni({ profile: 'cherriechang' }) });
const command = new ListHostedZonesByNameCommand({});
const response = await client.send(command);
```

### 2. Parameter Standardization
```javascript
// Old function signature (with hostedZoneId parameter)
function makeRecordSet(domainName, hostedZoneId, recordName, recordValue) { ... }

// New function signature (hostedZoneId looked up internally)  
function makeRecordSet(domainName, recordName, recordValue) { ... }

// Update all call sites:
// makeRecordSet(domain, zoneId, record, value) → makeRecordSet(domain, record, value)
```

### 3. Resource Cleanup Patterns
```javascript
// Robust cleanup with error handling
async function cleanupResources(resourceList) {
  const failures = [];
  
  for (const resource of resourceList) {
    try {
      await deleteResource(resource);
      console.log(`✅ Deleted: ${resource.name}`);
    } catch (error) {
      console.warn(`⚠️ Failed to delete: ${resource.name} - ${error.message}`);
      failures.push({ resource, error });
    }
  }
  
  if (failures.length > 0) {
    console.warn(`${failures.length} resources failed to delete`);
    // Could implement manual cleanup prompts
  }
}
```

## Prevention Strategies

### 1. Pre-deployment Validation
- Verify AWS credentials before starting deployment
- Check for existing resources to prevent conflicts
- Validate required dependencies (Docker, domain configuration)

### 2. Incremental Deployment
- Deploy services in dependency order (Database → Message Queue → API → Load Balancer)
- Wait for service health before proceeding to next step
- Implement rollback on any deployment failure

### 3. Comprehensive Logging
- Log all AWS API calls with request/response details
- Include operation context (which deployment step, target resources)
- Separate logs by service type for easier debugging

### 4. Testing Integration  
- Add unit tests for all error scenarios
- Mock AWS service failures to test error handling
- Create integration tests that simulate real deployment failures