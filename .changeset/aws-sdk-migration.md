---
"pushkin-cli": major
---

Complete AWS Fargate deployment modernization and critical bug fixes

This major update completely modernizes the AWS deployment infrastructure with critical bug fixes and improvements:

**Breaking Changes:**
- Migrated from AWS CLI to AWS SDK v3 for all AWS operations
- Standardized database configuration to use `url` instead of `host` throughout

**Critical Bug Fixes:**
- Fix #364: Replace localhost with Service Discovery DNS for RabbitMQ in Fargate awsvpc networking mode
- Fix #363: RabbitMQ passwords now persist across multiple deployments (idempotent behavior)

**New Features:**
- Added AWS Cloud Map (Service Discovery) support for ECS Fargate service-to-service communication
- Improved DNS handling with subdomain fallback to parent hosted zones
- Enhanced OAC (Origin Access Control) handling with retry logic
- Added comprehensive CloudWatch logging for ECS tasks
- Improved database connection reliability with exponential backoff retry logic

**Improvements:**
- Complete JSDoc documentation for all AWS-related functions
- Better error messages and logging throughout deployment process
- Standardized async/await patterns for better error handling
- Improved security group and VPC configuration handling
- Enhanced RDS instance management with proper wait conditions

**Infrastructure Updates:**
- Modernized all AWS service clients (S3, CloudFront, RDS, ECS, EC2, Route53, etc.)
- Better handling of AWS resource lifecycle (create, update, delete)
- Improved idempotency for AWS resource creation
- Enhanced cleanup with aws armageddon command

This update has been manually tested on AWS Fargate deployments and significantly improves the reliability and maintainability of AWS infrastructure management.