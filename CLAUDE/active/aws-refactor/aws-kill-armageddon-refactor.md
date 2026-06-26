# AWS Kill & Armageddon Refactor

**Date:** 2025-04-07
**Status:** Planning
**Priority:** High (improves observability and user experience)

## Executive Summary

The current AWS resource deletion system lacks structured error reporting, making it difficult for users to understand what failed during `pushkin aws kill` or `pushkin aws armageddon`. This document outlines a comprehensive refactor to implement consistent error handling across all deletion operations.

## Problem Statement

### Current Issues

1. **No failure visibility**: Deletion functions return meaningless values (`true`, `undefined`) even when operations fail
2. **Inconsistent error handling**: Different services handle errors differently (throw vs. swallow vs. warn)
3. **No structured reporting**: Users must run `pushkin aws list` after deletion to manually check what failed
4. **Silent failures**: Only indication of failure is console warnings that may be missed
5. **No actionable guidance**: Users don't know which specific resources failed or why

### Example of Current Behavior

```javascript
// User runs: pushkin aws kill

// Current output:
Deleting 3 security group(s)...
Unable to delete security group DatabaseGroup. This is usually because AWS needs something else deleted first...
Successfully deleted security group ECSGroup
Successfully deleted security group BalancerGroup

// Problem: No summary, user doesn't know if kill succeeded or partially failed
// User has to run: pushkin aws list
// Then manually compare to see what's left
```

### What We Want

```javascript
// User runs: pushkin aws kill

// Desired output:
Deletion Summary:
✓ Security Groups: 2/3 deleted
  ✓ ECSGroup
  ✓ BalancerGroup
  ✗ DatabaseGroup (DependencyViolation: still attached to RDS instance db-main)
✓ S3 Buckets: 1/1 deleted
✓ RDS Databases: 2/2 deleted
✓ Load Balancers: 1/1 deleted
...

Failed Resources (1):
  - SecurityGroup "DatabaseGroup": Still in use by db-main
    → Recommendation: Wait for RDS deletion to complete, then retry

Overall: 12/13 resources deleted (92% success)
Run 'pushkin aws kill' again to retry failed deletions
```

## Architecture Analysis

### Current Three-Level Architecture

```
Level 1: Orchestrator (index.js:437-501)
├── Creates promises for all deletion operations
├── Waits with Promise.all([...])
└── No visibility into what actually failed ❌

Level 2: Batch Deleters (e.g., deleteSecurityGroups, deleteBucket)
├── Get list of resources to delete
├── Call Level 3 for each resource
├── Use Promise.all() to wait for all
└── Return meaningless array of booleans ❌

Level 3: Single Deleters (e.g., deleteSingleSecurityGroup)
├── Actually delete one resource
├── Log warnings on failure
├── Always return true/undefined
└── No structured error info ❌
```

### Current Deletion Functions

| Service | Batch Function | Single Function | Return Type | Error Handling |
|---------|---------------|-----------------|-------------|----------------|
| Security Groups | `deleteSecurityGroups()` | `deleteSingleSecurityGroup()` | `Promise<boolean[]>` | Swallow errors, return `true` |
| S3 | `deleteBucket()` | `deleteSingleBucket()` | `Promise<void>` | Swallow errors, return `undefined` |
| CloudFront | `deleteCloudFront()` | N/A (inline) | `Promise<boolean>` | Mixed (throws on some errors) |
| OAC | `deleteOACs()` | `deleteOACWithRetry()` | `Promise<boolean>` | Retry then throw |
| RDS | `deleteDatabases()` | N/A (inline) | `Promise<boolean>` | Warn for not found, continue |
| Load Balancer | `deleteLoadBalancer()` | N/A (inline) | `Promise<void>` | Throws on error |
| Target Group | `deleteTargetGroup()` | N/A (inline) | `Promise<void>` | Throws on error |
| Route53 | `deleteResourceRecords()` | N/A (inline) | `Promise<void>` | Throws on error |
| ECS Cluster | `deleteCluster()` | N/A (inline) | `Promise<void>` | Throws on error |
| ECS Stack | `deleteStack()` | N/A (inline) | `Promise<void>` | Throws on error |

**Problem:** Inconsistent return types and error handling make it impossible to aggregate results.

## Proposed Solution

### New Deletion Result Type

Create a shared type for all deletion operations:

```typescript
/**
 * Standardized deletion result for all AWS resource deletion operations
 */
interface DeletionResult {
  success: boolean;           // Whether the deletion succeeded
  resourceType: string;       // e.g., "SecurityGroup", "S3Bucket", "RDSInstance"
  resourceName: string;       // Human-readable identifier
  resourceId?: string;        // AWS resource ID (ARN, instance ID, etc.)
  alreadyDeleted?: boolean;   // True if resource didn't exist (not an error)
  error?: Error;              // Error object if deletion failed
  retryable?: boolean;        // Whether this failure is retryable
  recommendation?: string;    // User-facing guidance (e.g., "Wait 5 minutes and retry")
}

/**
 * Aggregated batch deletion results
 */
interface BatchDeletionResult {
  resourceType: string;       // e.g., "SecurityGroups"
  attempted: number;          // Total resources attempted
  succeeded: number;          // Successfully deleted
  failed: number;             // Failed to delete
  alreadyDeleted: number;     // Already deleted (not an error)
  results: DeletionResult[];  // Individual results
}

/**
 * Overall deletion summary for the entire kill/armageddon operation
 */
interface DeletionSummary {
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed: number;
  batches: BatchDeletionResult[];
  hasFailures: boolean;
  exitCode: number;           // 0 = success, 1 = partial failure, 2 = total failure
}
```

### Level 3: Single Deleters (Bottom-Up)

**Pattern:** All `deleteSingle*()` functions return `DeletionResult`

#### Example: Security Groups

```javascript
/**
 * Delete a single security group
 * @param {string} groupName - The security group name to delete
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose - Whether to log detailed info
 * @returns {Promise<DeletionResult>} - Structured deletion result
 */
const deleteSingleSecurityGroup = async (groupName, useIAM, verbose = false) => {
  if (verbose) {
    console.log(`Deleting security group ${groupName}`);
  }

  const ec2Client = createEC2Client(useIAM);

  // Check if group exists
  try {
    await ec2Client.send(new DescribeSecurityGroupsCommand({ GroupNames: [groupName] }));
  } catch (error) {
    // Not found - treat as success (already deleted)
    if (verbose) {
      console.log(`Security group ${groupName} not found (already deleted)`);
    }
    return {
      success: true,
      resourceType: "SecurityGroup",
      resourceName: groupName,
      alreadyDeleted: true
    };
  }

  // Try to delete the group
  try {
    await ec2Client.send(new DeleteSecurityGroupCommand({ GroupName: groupName }));
    if (verbose) {
      console.log(`✓ Successfully deleted security group ${groupName}`);
    }
    return {
      success: true,
      resourceType: "SecurityGroup",
      resourceName: groupName
    };
  } catch (error) {
    console.warn(`✗ Unable to delete security group ${groupName}: ${error.message}`);

    // Determine if retryable based on error type
    const retryable = error.name === "DependencyViolation" ||
                      error.name === "InvalidGroup.InUse";

    const recommendation = retryable
      ? "Wait for dependent resources (RDS, ECS) to be deleted, then retry"
      : "Check AWS console for details";

    return {
      success: false,
      resourceType: "SecurityGroup",
      resourceName: groupName,
      error,
      retryable,
      recommendation
    };
  }
};
```

#### Example: S3 Buckets

```javascript
/**
 * Delete a single S3 bucket (after emptying it)
 * @param {S3Client} s3Client - Configured S3 client
 * @param {string} bucketName - Name of the bucket to delete
 * @param {boolean} verbose - Whether to log detailed info
 * @returns {Promise<DeletionResult>} - Structured deletion result
 */
const deleteSingleBucket = async (s3Client, bucketName, verbose = false) => {
  if (verbose) {
    console.log(`Deleting S3 bucket ${bucketName}`);
  }

  try {
    // Empty bucket first
    await emptyBucket(s3Client, bucketName);

    // Delete bucket
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));

    if (verbose) {
      console.log(`✓ Successfully deleted S3 bucket ${bucketName}`);
    }

    return {
      success: true,
      resourceType: "S3Bucket",
      resourceName: bucketName
    };
  } catch (error) {
    // Check if bucket doesn't exist
    if (error.name === "NoSuchBucket") {
      if (verbose) {
        console.log(`S3 bucket ${bucketName} not found (already deleted)`);
      }
      return {
        success: true,
        resourceType: "S3Bucket",
        resourceName: bucketName,
        alreadyDeleted: true
      };
    }

    console.warn(`✗ Unable to delete S3 bucket ${bucketName}: ${error.message}`);

    return {
      success: false,
      resourceType: "S3Bucket",
      resourceName: bucketName,
      error,
      retryable: error.name === "BucketNotEmpty",
      recommendation: error.name === "BucketNotEmpty"
        ? "Bucket may still be receiving requests. Wait a few minutes and retry."
        : "Check AWS console for details"
    };
  }
};
```

### Level 2: Batch Deleters

**Pattern:** Aggregate individual `DeletionResult` objects into `BatchDeletionResult`

#### Example: Security Groups

```javascript
/**
 * Delete security groups based on killTag filter
 * @param {string} useIAM - The IAM profile to use
 * @param {string|boolean} killTag - If string (project name), only delete project groups; if false, delete all (except default)
 * @param {Promise} deletedDBs - Promise that resolves when databases are deleted
 * @param {boolean} verbose - Whether to log detailed info
 * @returns {Promise<BatchDeletionResult>} - Aggregated deletion results
 */
const deleteSecurityGroups = async (useIAM, killTag, deletedDBs, verbose = false) => {
  console.log(`Waiting for databases to be deleted before removing security groups...`);
  await deletedDBs;
  console.log(`Databases deleted. Starting security group deletion.`);

  const ec2Client = createEC2Client(useIAM);

  // Get list of security groups
  let securityGroups;
  try {
    const response = await ec2Client.send(new DescribeSecurityGroupsCommand({}));
    securityGroups = response.SecurityGroups || [];
  } catch (error) {
    console.error(`Unable to list security groups: ${error.message}`);
    throw error; // Fatal error - can't proceed without listing
  }

  // Filter security groups based on killTag
  const groupsToDelete = [];
  for (const group of securityGroups) {
    // Skip the default security group (can't be deleted)
    if (group.GroupName === "default") {
      continue;
    }

    if (!killTag) {
      // Armageddon mode: delete all non-default groups
      groupsToDelete.push(group.GroupName);
    } else {
      // Kill mode: delete only groups tagged with the project name
      const hasProjectTag = group.Tags?.some(
        (tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === killTag
      );
      if (hasProjectTag) {
        groupsToDelete.push(group.GroupName);
      }
    }
  }

  if (groupsToDelete.length === 0) {
    console.log(`No security groups to delete.`);
    return {
      resourceType: "SecurityGroups",
      attempted: 0,
      succeeded: 0,
      failed: 0,
      alreadyDeleted: 0,
      results: []
    };
  }

  console.log(`Deleting ${groupsToDelete.length} security group(s)...`);

  // Delete all groups (non-blocking - all attempts complete)
  const results = await Promise.all(
    groupsToDelete.map((g) => deleteSingleSecurityGroup(g, useIAM, verbose))
  );

  // Aggregate results
  const succeeded = results.filter(r => r.success && !r.alreadyDeleted).length;
  const failed = results.filter(r => !r.success).length;
  const alreadyDeleted = results.filter(r => r.alreadyDeleted).length;

  // Print summary
  console.log(`Security Groups: ${succeeded}/${groupsToDelete.length} deleted`);
  if (alreadyDeleted > 0) {
    console.log(`  (${alreadyDeleted} already deleted)`);
  }
  if (failed > 0) {
    console.warn(`  ✗ ${failed} failed to delete`);
    results.filter(r => !r.success).forEach(r => {
      console.warn(`    - ${r.resourceName}: ${r.error?.message}`);
    });
  }

  return {
    resourceType: "SecurityGroups",
    attempted: groupsToDelete.length,
    succeeded,
    failed,
    alreadyDeleted,
    results
  };
};
```

### Level 1: Orchestrator

**Pattern:** Collect all `BatchDeletionResult` objects and generate `DeletionSummary`

#### Updated kill/armageddon Command

```javascript
/**
 * Kill or armageddon command - delete AWS resources
 * @param {string} killType - "kill" (project only) or "armageddon" (everything)
 * @param {string} profileName - AWS profile name
 */
async function performDeletion(killType, profileName) {
  // ... existing setup code ...

  const killTag = killType === "kill" ? projName : false;

  // Start all deletions (they manage dependencies internally)
  console.log("Starting resource deletion...\n");

  const deletionPromises = [
    deleteStack(profileName, killTag),
    deleteCluster(deleteStack(profileName, killTag), profileName, killTag, projName, awsResources),
    deleteDatabases(dbsToDeleteFunc(profileName, killTag, awsResources), profileName, killTag),
    deleteLoadBalancer(profileName, killTag),
    deleteCloudFront(profileName, projName, killTag),
    deleteOACs(profileName, deleteCloudFront(profileName, projName, killTag), killTag),
    deleteResourceRecords(profileName, killTag, projName),
    deleteTargetGroup(profileName, deleteLoadBalancer(profileName, killTag)),
    deleteBucket(profileName, killTag, awsResources, deleteCloudFront(profileName, projName, killTag)),
    deleteSecurityGroups(profileName, killTag, deleteDatabases(...))
  ];

  // Wait for all deletions (use allSettled to get all results even if some throw)
  const settledResults = await Promise.allSettled(deletionPromises);

  // Extract BatchDeletionResult objects (filter out functions that still throw)
  const batchResults = settledResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  const rejectedResults = settledResults
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);

  // Generate summary
  const summary = generateDeletionSummary(batchResults, rejectedResults);

  // Update awsResources.js
  if (summary.hasFailures) {
    console.log("\nSome resources failed to delete. Updating awsResources.js with remaining resources...");
    // Only null out successfully deleted resources
    updateAwsResourcesPartial(summary);
  } else {
    console.log("\nAll resources deleted successfully. Clearing awsResources.js...");
    writeAwsResources({
      name: projName,
      awsName: null,
      iam: profileName,
      dbs: [],
      cloudFrontId: null,
      ECSName: null,
      OAC: null,
    });
  }

  // Print comprehensive summary
  printDeletionSummary(summary);

  // Set exit code
  process.exitCode = summary.exitCode;
}

/**
 * Generate deletion summary from batch results
 */
function generateDeletionSummary(batchResults, rejectedResults) {
  const totalAttempted = batchResults.reduce((sum, b) => sum + b.attempted, 0);
  const totalSucceeded = batchResults.reduce((sum, b) => sum + b.succeeded, 0);
  const totalFailed = batchResults.reduce((sum, b) => sum + b.failed, 0) + rejectedResults.length;

  const hasFailures = totalFailed > 0;
  const exitCode = hasFailures ? (totalSucceeded > 0 ? 1 : 2) : 0;

  return {
    totalAttempted,
    totalSucceeded,
    totalFailed,
    batches: batchResults,
    hasFailures,
    exitCode,
    rejectedOperations: rejectedResults
  };
}

/**
 * Print user-friendly deletion summary
 */
function printDeletionSummary(summary) {
  console.log("\n" + "=".repeat(60));
  console.log("DELETION SUMMARY");
  console.log("=".repeat(60) + "\n");

  // Print each resource type
  summary.batches.forEach(batch => {
    const icon = batch.failed === 0 ? "✓" : "✗";
    const color = batch.failed === 0 ? "\x1b[32m" : "\x1b[33m"; // green or yellow
    const reset = "\x1b[0m";

    console.log(`${color}${icon} ${batch.resourceType}: ${batch.succeeded}/${batch.attempted} deleted${reset}`);

    if (batch.alreadyDeleted > 0) {
      console.log(`  (${batch.alreadyDeleted} already deleted)`);
    }

    // Show failures with details
    const failures = batch.results.filter(r => !r.success);
    failures.forEach(failure => {
      console.log(`    ✗ ${failure.resourceName}`);
      console.log(`      Error: ${failure.error?.message || "Unknown error"}`);
      if (failure.recommendation) {
        console.log(`      → ${failure.recommendation}`);
      }
    });
  });

  // Print overall stats
  console.log("\n" + "-".repeat(60));
  console.log(`Overall: ${summary.totalSucceeded}/${summary.totalAttempted} resources deleted`);

  if (summary.totalFailed > 0) {
    const percentage = Math.round((summary.totalSucceeded / summary.totalAttempted) * 100);
    console.log(`${summary.totalFailed} resources failed to delete (${percentage}% success rate)`);

    // Check if failures are retryable
    const retryableFailures = summary.batches
      .flatMap(b => b.results)
      .filter(r => !r.success && r.retryable);

    if (retryableFailures.length > 0) {
      console.log("\n\x1b[33m⚠ Retryable failures detected\x1b[0m");
      console.log("These resources likely have dependencies that haven't been deleted yet.");
      console.log(`Wait 5-10 minutes, then run 'pushkin aws ${summary.exitCode === 1 ? 'kill' : 'armageddon'}' again.`);
    }
  } else {
    console.log("\x1b[32m✓ All resources successfully deleted!\x1b[0m");
  }

  console.log("=".repeat(60) + "\n");
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal:** Establish the pattern with security groups

- [ ] Create shared types/interfaces for deletion results
  - [ ] Define `DeletionResult` interface
  - [ ] Define `BatchDeletionResult` interface
  - [ ] Define `DeletionSummary` interface
- [ ] Update `deleteSingleSecurityGroup()` to return `DeletionResult`
- [ ] Update `deleteSecurityGroups()` to return `BatchDeletionResult`
- [ ] Update `index.js` to handle new return type for security groups
- [ ] Test with actual AWS deployment
- [ ] Document the pattern in code comments

**Deliverables:**
- Working security group deletion with structured results
- Pattern established for other services to follow

### Phase 2: Core Services (Week 2-3)
**Goal:** Apply pattern to most critical deletion operations

- [ ] **S3 Buckets**
  - [ ] Update `deleteSingleBucket()` to return `DeletionResult`
  - [ ] Update `deleteBucket()` to return `BatchDeletionResult`
- [ ] **RDS Databases**
  - [ ] Refactor `deleteDatabases()` to use `deleteSingleDatabase()` helper
  - [ ] Implement `deleteSingleDatabase()` returning `DeletionResult`
  - [ ] Update `deleteDatabases()` to return `BatchDeletionResult`
- [ ] **CloudFront Distributions**
  - [ ] Refactor inline deletion to use `deleteSingleDistribution()` helper
  - [ ] Implement status object return
  - [ ] Update `deleteCloudFront()` to return `BatchDeletionResult`
- [ ] **Origin Access Controls (OAC)**
  - [ ] Update `deleteOACWithRetry()` to return `DeletionResult`
  - [ ] Update `deleteOACs()` to return `BatchDeletionResult`

### Phase 3: Remaining Services (Week 4)
**Goal:** Complete coverage of all deletion operations

- [ ] **Load Balancers**
  - [ ] Refactor to use helper function pattern
  - [ ] Return `BatchDeletionResult`
- [ ] **Target Groups**
  - [ ] Refactor to use helper function pattern
  - [ ] Return `BatchDeletionResult`
- [ ] **Route53 Records**
  - [ ] Refactor to use helper function pattern
  - [ ] Return `BatchDeletionResult`
- [ ] **ECS Clusters**
  - [ ] Refactor to use helper function pattern
  - [ ] Return `BatchDeletionResult`
- [ ] **ECS Stacks**
  - [ ] Refactor to use helper function pattern
  - [ ] Return `BatchDeletionResult`

### Phase 4: Orchestrator Improvements (Week 5)
**Goal:** Implement comprehensive reporting at the top level

- [ ] Update `index.js` kill command
  - [ ] Use `Promise.allSettled()` instead of `Promise.all()`
  - [ ] Collect all `BatchDeletionResult` objects
  - [ ] Implement `generateDeletionSummary()`
  - [ ] Implement `printDeletionSummary()`
- [ ] Update `awsResources.js` management
  - [ ] Only null out successfully deleted resources
  - [ ] Keep failed resources in state for retry
- [ ] Set appropriate exit codes
  - [ ] 0 = complete success
  - [ ] 1 = partial success (some failures)
  - [ ] 2 = total failure (all failed)

### Phase 5: Future Enhancements (Backlog)
**Goal:** Advanced features for better UX

- [ ] **Automatic Retry Logic**
  - [ ] Detect retryable failures
  - [ ] Implement exponential backoff
  - [ ] Auto-retry up to N times
- [ ] **Deletion Report Export**
  - [ ] Export summary to JSON file
  - [ ] Include timestamps, durations
  - [ ] Useful for debugging and auditing
- [ ] **Dry Run Mode**
  - [ ] `pushkin aws kill --dry-run`
  - [ ] Preview what would be deleted
  - [ ] Estimate cost savings
- [ ] **Dependency Visualization**
  - [ ] Show dependency graph
  - [ ] Explain deletion order
  - [ ] Help users understand why things fail

## Testing Strategy

### Unit Tests

Create tests for each deletion function:

```javascript
// Example: security.test.js
describe('deleteSingleSecurityGroup', () => {
  test('returns success when group is deleted', async () => {
    // Mock EC2 client
    const mockSend = jest.fn()
      .mockResolvedValueOnce({}) // DescribeSecurityGroups succeeds
      .mockResolvedValueOnce({}); // DeleteSecurityGroup succeeds

    const result = await deleteSingleSecurityGroup('TestGroup', 'default');

    expect(result).toEqual({
      success: true,
      resourceType: 'SecurityGroup',
      resourceName: 'TestGroup'
    });
  });

  test('returns success when group already deleted', async () => {
    // Mock EC2 client - group not found
    const mockSend = jest.fn()
      .mockRejectedValueOnce(new Error('InvalidGroup.NotFound'));

    const result = await deleteSingleSecurityGroup('TestGroup', 'default');

    expect(result).toEqual({
      success: true,
      resourceType: 'SecurityGroup',
      resourceName: 'TestGroup',
      alreadyDeleted: true
    });
  });

  test('returns failure with retryable=true for dependency violation', async () => {
    // Mock EC2 client - dependency violation
    const mockSend = jest.fn()
      .mockResolvedValueOnce({}) // DescribeSecurityGroups succeeds
      .mockRejectedValueOnce({
        name: 'DependencyViolation',
        message: 'resource sg-123 has a dependent object'
      });

    const result = await deleteSingleSecurityGroup('TestGroup', 'default');

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.error).toBeDefined();
    expect(result.recommendation).toContain('Wait for dependent resources');
  });
});
```

### Integration Tests

Test with actual AWS resources (using test account):

```javascript
describe('deleteSecurityGroups integration', () => {
  let testGroupId;

  beforeEach(async () => {
    // Create test security group
    testGroupId = await createTestSecurityGroup('TestGroup');
  });

  afterEach(async () => {
    // Clean up (best effort)
    try {
      await deleteSecurityGroup(testGroupId);
    } catch (e) {
      // Ignore - test may have deleted it
    }
  });

  test('successfully deletes security group', async () => {
    const result = await deleteSecurityGroups('default', false, Promise.resolve());

    expect(result.succeeded).toBeGreaterThan(0);
    expect(result.results.some(r => r.resourceName === 'TestGroup')).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Test `pushkin aws kill` on fresh deployment
- [ ] Test `pushkin aws kill` with partial failures (e.g., RDS still running)
- [ ] Test `pushkin aws armageddon` with multiple projects
- [ ] Test retry behavior (run kill twice)
- [ ] Test with no resources to delete
- [ ] Verify exit codes are set correctly
- [ ] Verify awsResources.js is updated correctly

## Migration Strategy

### Backward Compatibility

During migration, support both old and new patterns:

```javascript
// In index.js orchestrator
const deletedGroups = await deleteSecurityGroups(...);

// Check if new format (BatchDeletionResult) or old format (boolean[])
if (Array.isArray(deletedGroups)) {
  // Old format - no detailed reporting available
  console.log("Security groups deletion completed (no details available)");
} else if (deletedGroups.resourceType) {
  // New format - use structured results
  printBatchSummary(deletedGroups);
}
```

### Rollout Plan

1. **Week 1:** Implement Phase 1 (security groups) in feature branch
2. **Week 2:** Test thoroughly, merge to main
3. **Week 3-4:** Implement Phase 2 (core services)
4. **Week 5:** Implement Phase 4 (orchestrator improvements)
5. **Week 6:** Final testing, documentation, release

### Communication

- Update CHANGELOG.md with breaking changes notice
- Add migration guide to docs
- Announce in GitHub discussions/issues

## Success Metrics

### User Experience Improvements

- **Before:** Users must manually run `pushkin aws list` to check failures
- **After:** Users see structured summary with actionable recommendations

### Observability Improvements

- **Before:** No visibility into partial failures
- **After:** Know exactly which resources failed and why

### Developer Experience Improvements

- **Before:** Inconsistent error handling across services
- **After:** Consistent pattern, easy to add new services

### Quantifiable Goals

- [ ] 100% of deletion functions return structured results
- [ ] Exit code reflects actual success/failure
- [ ] User satisfaction (fewer GitHub issues about "why didn't it delete?")

## Open Questions

1. **Should we add telemetry?**
   - Track deletion success rates
   - Identify common failure patterns
   - Improve AWS deployment reliability

2. **Should we persist deletion history?**
   - Keep log of past deletions
   - Useful for debugging
   - Privacy/security concerns?

3. **Should we implement automatic cleanup?**
   - Detect orphaned resources (not in awsResources.js but tagged)
   - Prompt user to clean them up
   - Risk of deleting unrelated resources?

4. **Should we add `--force` flag?**
   - Skip confirmation prompts
   - Useful for CI/CD
   - Risk of accidental deletions?

## Related Work

- **Terraform**: Uses state file + plan/apply pattern
- **AWS CDK**: Tracks resources in CloudFormation stack
- **Pulumi**: Structured diff output

**Key Insight:** Users expect to see what will be deleted and what actually was deleted.

## References

- AWS SDK Error Handling: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/error-handling.html
- Promise.allSettled(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- Exit Codes: https://nodejs.org/api/process.html#process_exit_codes

## Appendix: Code Examples

### Example Output (Target UX)

```
$ pushkin aws kill

Starting resource deletion for project: my-site
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Waiting for databases to be deleted...
✓ RDS instance db-main deleted (took 8m 32s)
✓ RDS instance db-transactions deleted (took 8m 45s)

Deleting security groups...
✓ ECSGroup deleted
✓ BalancerGroup deleted
✗ DatabaseGroup failed: DependencyViolation (still attached to db-main)

Deleting S3 buckets...
✓ my-site-frontend deleted (2.3 GB freed)

Deleting CloudFront distributions...
⏳ Distribution E1234567 disabling... (this may take 15+ minutes)
✓ Distribution E1234567 deleted (took 18m 12s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELETION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ RDS Databases: 2/2 deleted
✗ Security Groups: 2/3 deleted
  ✗ DatabaseGroup: DependencyViolation
    → Wait for dependent resources to be deleted, then retry
✓ S3 Buckets: 1/1 deleted
✓ CloudFront Distributions: 1/1 deleted
✓ Load Balancers: 1/1 deleted
✓ Target Groups: 1/1 deleted
✓ ECS Clusters: 1/1 deleted

Overall: 12/13 resources deleted (92% success)

⚠ 1 retryable failure detected
Run 'pushkin aws kill' again in 5 minutes to retry failed deletions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Exit code: 1 (partial success)
```

