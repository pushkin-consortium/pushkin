# AWS Utils

Shared utilities for AWS deployment operations.

## AWSClientFactory

Centralized factory for creating AWS SDK v3 clients.

### Usage

```javascript
import { AWSClientFactory } from './utils/aws-client-factory.js';

// Create factory (handles both string and { iam: string } formats)
const factory = new AWSClientFactory('us-east-1', 'my-profile');
// or
const factory = new AWSClientFactory('us-east-1', { iam: 'my-profile' });

// Create clients
const rds = factory.createRDS();
const s3 = factory.createS3();
const ecs = factory.createECS();

// Use clients normally
const buckets = await s3.send(new ListBucketsCommand({}));
```

### Benefits

- **Single configuration point**: Change region/credentials in one place
- **Easy to mock**: In tests, pass a mock factory
- **Consistent**: All clients configured identically
- **Type-safe**: Each create method returns the correct client type

### Migration from Old Code

**Before:**
```javascript
const rds = new RDSClient({
  region: myRegion,
  credentials: fromIni({ profile: useIAM }),
});
```

**After:**
```javascript
const rds = clientFactory.createRDS();
```

## Future Utils

- `retry.js` - Exponential backoff retry logic
- `dns-utils.js` - DNS subdomain resolution
- `errors.js` - Custom error classes
- `logger.js` - Structured logging
- `config-builder.js` - AWS config builders
