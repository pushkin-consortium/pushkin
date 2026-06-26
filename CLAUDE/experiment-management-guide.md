# Experiment Management Guide - Pushkin v4.2+ with AWS

**Created:** October 16, 2025
**For:** PI review - Games With Words lab site
**Purpose:** Document how to easily add, remove, and archive experiments with the new AWS deployment

---

## Executive Summary

The new Pushkin v4.2+ AWS deployment makes experiment management straightforward and automated. Here's what you need to know:

✅ **Easy to Add:** Single command + automatic deployment
✅ **Safe Updates:** Zero-downtime rolling deployments
✅ **No Manual AWS Work:** All infrastructure managed automatically
✅ **Cost Efficient:** Only pay for running experiments
✅ **Data Persistent:** Experiment data remains even if experiment removed

---

## Architecture Overview

### How Experiments Work in Pushkin v4.2+

Each experiment consists of:
1. **Front-end:** React components (integrated into main site)
2. **Worker:** Node.js Docker container (processes experiment data)
3. **Database schema:** PostgreSQL tables (stores participant responses)
4. **Config file:** `config.yaml` (experiment settings)

### AWS Infrastructure Per Experiment

When you deploy, each experiment gets:
- **ECS Service:** Fargate-managed container running the worker
- **Docker Image:** Automatically built and pushed to DockerHub
- **Database Tables:** Created via migrations in RDS PostgreSQL
- **CloudWatch Logs:** Automatic logging for debugging
- **Auto-scaling:** Can scale up/down based on load

**Communication Flow:**
```
Participant → CloudFront/S3 (front-end) → ALB → API → RabbitMQ → Experiment Worker → RDS
```

---

## Adding a New Experiment

### Step-by-Step Workflow

#### 1. Install Experiment Template (Local)

```bash
cd /path/to/your/pushkin-site
pushkin install experiment my-new-quiz
```

**What happens:**
- Interactive prompts guide you through setup
- Creates experiment directory: `experiments/my-new-quiz/`
- Includes: config.yaml, web page, worker, migrations

**Time:** 2-3 minutes

#### 2. Customize Experiment (Local)

Edit the experiment files:
- `config.yaml` - Set experiment name, display settings
- `web page/src/` - Build your jsPsych timeline or custom React components
- `worker/` - Add custom data processing logic (if needed)
- `migrations/` - Define database schema for your data

**Time:** Hours to weeks (depending on complexity)

#### 3. Test Locally (Local)

```bash
pushkin prep          # Rebuild site with new experiment
pushkin start         # Start local development server
```

Visit `http://localhost` and test your experiment.

**Time:** 5-10 minutes

#### 4. Deploy to AWS (Automated)

```bash
pushkin prep          # Final rebuild
pushkin aws init      # Deploy to AWS
```

**What happens automatically:**
1. ✅ Scans `experiments/` directory
2. ✅ Builds Docker image for your worker (`docker buildx build`)
3. ✅ Pushes image to DockerHub
4. ✅ Creates ECS task definition for worker
5. ✅ Creates or updates ECS service (zero downtime)
6. ✅ Runs database migrations
7. ✅ Rebuilds front-end with new experiment
8. ✅ Syncs front-end to S3
9. ✅ Invalidates CloudFront cache

**Time:** 10-15 minutes (mostly CloudFront propagation)

#### 5. Verify Deployment (Manual)

- Visit your site URL
- Check experiment appears in quiz listing
- Run through experiment
- Verify data saves to database
- Check CloudWatch logs for any errors

**Time:** 5-10 minutes

### Total Time to Add Experiment

- **Template setup:** 2-3 minutes
- **Development:** Variable (hours to weeks)
- **Testing:** 10-15 minutes
- **Deployment:** 10-15 minutes
- **Verification:** 5-10 minutes

**Deployment effort:** ~30 minutes total

---

## Updating an Existing Experiment

### Step-by-Step Workflow

#### 1. Make Changes Locally

Edit experiment files as needed:
- Update jsPsych timeline
- Modify worker logic
- Add new stimuli
- Update database schema (create new migration)

#### 2. Test Locally

```bash
pushkin prep
pushkin start
```

Test your changes thoroughly.

#### 3. Redeploy to AWS

```bash
pushkin prep
pushkin aws init
```

**What happens:**
- Rebuilds Docker image with your changes
- **Updates existing ECS service** (not recreates)
- Uses `forceNewDeployment: true` for zero downtime
- Runs any new migrations
- Updates front-end

**Important:** ECS performs a rolling deployment:
1. Starts new task with updated code
2. Waits for health check
3. Stops old task
4. Participants never experience downtime

**Time:** 10-15 minutes

### Deployment Strategy

The system uses **ECS UpdateServiceCommand** which:
- Keeps the service running
- Gradually replaces tasks
- Monitors health checks
- Rolls back automatically if new version fails

This means **zero downtime** for updates!

---

## Removing an Experiment

### Method 1: Soft Delete (Recommended)

**Best for:** Temporarily hiding an experiment or archiving

#### Steps:

1. **Remove from front-end listing** (edit Quizzes page)
2. **Keep worker running** (no AWS changes)
3. **Data remains in database**

**Pros:**
- Instant (no deployment needed)
- Can easily re-enable
- Existing participant links still work
- Data preserved

**Cons:**
- Still paying for ECS worker (minimal cost)

**Cost Impact:** ~$10-20/month per worker

#### When to Use:
- Temporarily pausing data collection
- "Archived" experiments you might reactivate
- Experiments awaiting IRB renewal

### Method 2: Full Removal

**Best for:** Permanently removing an experiment

#### Steps:

```bash
# 1. Delete experiment directory
rm -rf experiments/my-old-quiz

# 2. Rebuild and redeploy
pushkin prep
pushkin aws init
```

**What happens:**
- Worker service continues running in AWS (becomes orphaned)
- New experiments deploy normally
- Front-end no longer includes the experiment
- Database tables remain (data preserved)

#### Optional: Clean up AWS resources

```bash
# List all services to find orphaned ones
aws ecs list-services --cluster your-cluster-name

# Delete specific service
aws ecs delete-service --cluster your-cluster-name --service my-old-quiz_worker --force

# Or use nuclear option (deletes ALL Pushkin resources)
pushkin aws armageddon
```

**Pros:**
- Completely removes experiment
- Stops ECS costs for that worker
- Data still preserved in database

**Cons:**
- Requires manual AWS cleanup for worker service
- Permanent (need to re-install to restore)

**Cost Savings:** ~$10-20/month per worker

#### When to Use:
- Experiment permanently concluded
- Reducing AWS costs
- Site cleanup

### Method 3: Archive (Hybrid Approach)

**Best for:** Long-term storage with option to view results

#### Steps:

1. **Create archive page or section**
2. **Move experiment to "archived" status in config**
3. **Remove worker but keep database**

```yaml
# experiments/my-old-quiz/config.yaml
archived: true
dateArchived: "2025-10-16"
```

Update Quizzes page to show archived experiments separately.

**Pros:**
- Clear organization
- Can display findings/results
- Data accessible for analysis
- No worker costs

**Cons:**
- Can't collect new data without redeployment

#### When to Use:
- Published experiments you want to showcase
- Studies with completed data collection
- Historical reference

---

## Cost Analysis

### Per-Experiment Costs

**Active Experiment:**
- ECS Fargate worker: ~$5-15/month (depends on memory/CPU)
- RDS database storage: ~$2-5/month per 10GB
- CloudWatch logs: ~$1-2/month
- **Total:** ~$8-22/month per active experiment

**Archived Experiment (worker stopped):**
- RDS database storage only: ~$2-5/month
- **Total:** ~$2-5/month

**Shared Costs (all experiments):**
- RDS instances: ~$30-50/month (two databases)
- ALB: ~$16/month
- CloudFront/S3: ~$1-5/month
- **Total:** ~$47-71/month (regardless of experiment count)

### Example Scenarios

**Small lab (3 active experiments):**
- Shared: $50/month
- Per-experiment: $30/month (3 × $10)
- **Total:** ~$80/month

**Medium lab (10 active experiments):**
- Shared: $50/month
- Per-experiment: $120/month (10 × $12)
- **Total:** ~$170/month

**Large lab (20 active experiments):**
- Shared: $50/month
- Per-experiment: $300/month (20 × $15)
- **Total:** ~$350/month

### Cost Optimization Strategies

1. **Archive completed experiments** → Save $8-17/month per experiment
2. **Use smaller ECS task sizes** → Save $5-10/month per experiment
3. **Set up auto-scaling** → Scale to zero during low traffic
4. **Use RDS storage autoscaling** → Only pay for data you use
5. **Enable RDS deletion protection** → Prevent accidental data loss

---

## Data Management

### Database Persistence

**Important:** Removing an experiment does NOT delete its data.

**Database tables persist because:**
- RDS instances are separate from ECS services
- Tables created via migrations are not automatically dropped
- Deletion protection enabled by default

### Accessing Experiment Data

#### Option 1: Direct Database Query

```bash
# Get RDS endpoint from pushkin.yaml
cat pushkin.yaml | grep -A 5 "productionDBs"

# Connect with psql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d your-database
```

#### Option 2: Export Via Pushkin Admin Panel

(If implemented in your site)

#### Option 3: AWS Console

1. Go to RDS in AWS Console
2. Find your database
3. Use Query Editor
4. Run SQL queries

### Data Retention Policies

**Recommended approach:**
1. **Active experiments:** Data in production RDS
2. **Archived experiments:** Export to S3 for long-term storage
3. **Deleted experiments:** Keep data in RDS for 6-12 months, then archive

**Backup strategy:**
- RDS automated backups: 7 days (configurable)
- Manual snapshots before major changes
- Export to S3 for archival (beyond 7 days)

---

## Common Scenarios

### Scenario 1: Adding First Experiment to New Site

**Context:** You have a fresh Pushkin site with no experiments

**Steps:**
```bash
# 1. Install experiment
pushkin install experiment first-quiz

# 2. Customize (edit files in experiments/first-quiz/)

# 3. Test locally
pushkin prep
pushkin start

# 4. Deploy
pushkin prep
pushkin aws init
```

**What AWS creates:**
- ECS service: `first-quiz_worker`
- Task definition: `first-quiz_worker:1`
- Database tables: (defined in migrations)
- CloudWatch log group: `ecs/your-project-name`

**Time:** ~15 minutes for deployment

---

### Scenario 2: Adding Second Experiment to Existing Site

**Context:** You already have one experiment running

**Steps:**
```bash
# 1. Install second experiment
pushkin install experiment second-quiz

# 2. Customize

# 3. Test locally
pushkin prep
pushkin start

# 4. Deploy
pushkin prep
pushkin aws init
```

**What happens to existing experiment:**
- ✅ First experiment continues running (zero downtime)
- ✅ ECS updates first experiment's service (in case of API changes)
- ✅ Both experiments run in parallel
- ✅ Each has its own worker container

**Time:** ~15 minutes (same as first deployment)

---

### Scenario 3: Temporarily Pausing an Experiment

**Context:** You want to stop collecting data but might resume later

**Best approach: Soft delete**

**Steps:**
1. Edit `pushkin/front-end/src/pages/Quizzes.js`
2. Comment out or hide the experiment from the listing
3. Commit and redeploy front-end only:
   ```bash
   pushkin prep
   pushkin aws init
   ```

**Result:**
- Experiment not visible to participants
- Worker still running (small cost)
- Can easily unhide and resume
- Existing participant links might still work (if shared)

**Time:** 5 minutes + 15 minutes deployment

---

### Scenario 4: Updating Experiment After Data Collection Started

**Context:** You need to fix a bug or add features mid-study

**Steps:**
```bash
# 1. Make changes in experiments/your-quiz/

# 2. Create database migration if schema changes
pushkin experiment:setup:migrations your-quiz

# 3. Test locally
pushkin prep
pushkin start

# 4. Deploy (updates existing service)
pushkin prep
pushkin aws init
```

**Important considerations:**
- **Database schema:** New migration runs automatically
- **Existing data:** Preserved (migrations are additive)
- **In-flight participants:** Finish with old version (no interruption)
- **New participants:** Get new version immediately

**Best practices:**
- Make changes backward-compatible if possible
- Test migrations on staging site first
- Consider versioning your experiment
- Document changes for data analysis

**Time:** 15 minutes deployment

---

### Scenario 5: Archiving Completed Experiment

**Context:** Data collection complete, want to reduce costs

**Steps:**
```bash
# 1. Export data from RDS
pg_dump -h your-rds-endpoint.amazonaws.com -U postgres -d your-db -t your_experiment_table > experiment_data.sql

# 2. Upload to S3 for archival
aws s3 cp experiment_data.sql s3://your-archive-bucket/experiments/

# 3. Remove experiment from site
rm -rf experiments/your-quiz

# 4. Redeploy
pushkin prep
pushkin aws init

# 5. Optional: Delete worker service
aws ecs delete-service --cluster your-cluster --service your-quiz_worker --force

# 6. Optional: Drop database tables (BE CAREFUL!)
# psql -h your-rds-endpoint.amazonaws.com -U postgres -d your-db
# DROP TABLE your_experiment_table;
```

**Result:**
- Worker stopped (cost savings)
- Data safely archived in S3
- Can restore from backup if needed

**Cost savings:** ~$10-20/month

**Time:** 30-45 minutes (mostly data export)

---

### Scenario 6: Preparing for High Traffic Event

**Context:** Expecting surge in participants (e.g., media coverage)

**Preparation steps:**

1. **Enable auto-scaling**:
   ```bash
   # Already configured in current deployment!
   # ECS services auto-scale based on CPU/memory
   ```

2. **Increase task limits**:
   ```bash
   # Edit ECS service desired count (in AWS console or CLI)
   aws ecs update-service --cluster your-cluster --service your-worker --desired-count 3
   ```

3. **Monitor CloudWatch**:
   - Set up alarms for high CPU/memory
   - Watch RDS connection count
   - Monitor API response times

4. **Pre-warm CloudFront**:
   - No action needed (CloudFront scales automatically)

5. **Database optimization**:
   - Consider upgrading RDS instance size temporarily
   - Review slow queries
   - Add database indexes if needed

**Cost during surge:**
- ECS auto-scales (pay-per-use)
- RDS may need manual scaling (downgrade after event)
- CloudFront automatically handles traffic (pay-per-request)

**Expected cost increase:** 2-5x normal for duration of event

---

## Troubleshooting

### Issue: Experiment not appearing on site after deployment

**Possible causes:**
1. CloudFront cache not invalidated
2. Front-end not rebuilt
3. Experiment not registered in routing

**Solutions:**
```bash
# 1. Ensure prep was run
pushkin prep

# 2. Manually invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# 3. Check experiment config.yaml is correct
cat experiments/your-quiz/config.yaml

# 4. Verify experiment shows up in front-end routing
grep -r "your-quiz" pushkin/front-end/src/
```

---

### Issue: Worker service failing to start

**Possible causes:**
1. Docker image build failed
2. Worker code has runtime error
3. Database connection issue
4. RabbitMQ connection issue

**Solutions:**
```bash
# 1. Check CloudWatch logs
aws logs tail /ecs/your-project-name --follow

# 2. Test Docker image locally
docker run -it your-dockerhub-id/your-quiz_worker:latest

# 3. Verify database connection
psql -h your-rds-endpoint.amazonaws.com -U postgres -d your-db

# 4. Check ECS service events
aws ecs describe-services --cluster your-cluster --services your-quiz_worker
```

---

### Issue: Data not saving to database

**Possible causes:**
1. Migrations didn't run
2. Worker not connected to database
3. Database credentials wrong
4. Table doesn't exist

**Solutions:**
```bash
# 1. Check if tables exist
psql -h your-rds-endpoint.amazonaws.com -U postgres -d your-db -c "\dt"

# 2. Manually run migrations
pushkin setupdb

# 3. Check worker logs for database errors
aws logs tail /ecs/your-project-name --filter-pattern "database|error" --follow

# 4. Verify database credentials in pushkin.yaml
cat pushkin.yaml | grep -A 10 "productionDBs"
```

---

### Issue: High AWS costs

**Diagnosis:**
```bash
# Check running ECS services
aws ecs list-services --cluster your-cluster

# Check RDS instance sizes
aws rds describe-db-instances

# Check CloudFront usage
aws cloudfront get-distribution --id YOUR_DIST_ID
```

**Cost reduction strategies:**
1. Stop unused worker services
2. Downgrade RDS instances if over-provisioned
3. Archive old experiment data
4. Set up billing alarms
5. Review CloudWatch log retention (reduce from 7 days to 1 day)

---

## Best Practices

### Development Workflow

1. **Always test locally first**
   ```bash
   pushkin prep
   pushkin start
   ```

2. **Use Git branches for new experiments**
   ```bash
   git checkout -b experiment/new-quiz
   # Develop and test
   git checkout main
   git merge experiment/new-quiz
   ```

3. **Document experiment changes**
   - Update README in experiment directory
   - Note any special deployment requirements
   - Document database schema

4. **Use staging environment**
   - Deploy to test subdomain first
   - Run full experiment as participant
   - Check data in database
   - Then deploy to production

### Deployment Workflow

1. **Pre-deployment checklist:**
   - [ ] Changes tested locally
   - [ ] Database migrations tested
   - [ ] No uncommitted changes in Git
   - [ ] Documented what changed

2. **Deployment:**
   ```bash
   pushkin prep
   pushkin aws init
   # Wait for CloudFront (5-15 minutes)
   ```

3. **Post-deployment verification:**
   - [ ] Visit site and test experiment
   - [ ] Check CloudWatch logs for errors
   - [ ] Verify data saves to database
   - [ ] Test on mobile device
   - [ ] Send test link to PI

### Cost Management

1. **Set up billing alarms**
   - $50, $100, $200 thresholds
   - Email notifications

2. **Monthly cost review**
   - Check AWS Cost Explorer
   - Identify expensive resources
   - Archive unused experiments

3. **Resource tagging**
   - All resources tagged with PUSHKIN:projectname
   - Easy to track costs per site

4. **Right-sizing**
   - Start small (t3.micro, 128MB workers)
   - Scale up only if needed
   - Monitor performance metrics

### Data Management

1. **Regular backups**
   - RDS automated backups (7 days)
   - Manual snapshots before major changes
   - Export to S3 for long-term archival

2. **Data export schedule**
   - Weekly exports during active data collection
   - Final export when archiving experiment
   - Keep exports in versioned S3 bucket

3. **Database maintenance**
   - Monitor table sizes
   - Add indexes for query performance
   - Archive old data to separate tables

---

## Quick Reference

### Common Commands

```bash
# Add new experiment
pushkin install experiment my-quiz

# Test locally
pushkin prep && pushkin start

# Deploy to AWS
pushkin prep && pushkin aws init

# List AWS resources
pushkin aws list

# Delete all AWS resources (CAREFUL!)
pushkin aws armageddon

# Database migrations
pushkin setupdb

# Update front-end only (after content changes)
pushkin prep
aws s3 sync pushkin/front-end/build s3://your-bucket/
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### AWS Console Quick Links

**ECS:**
- Services: https://console.aws.amazon.com/ecs/home#/clusters
- Task Definitions: https://console.aws.amazon.com/ecs/home#/taskDefinitions

**RDS:**
- Databases: https://console.aws.amazon.com/rds/home#databases:

**CloudWatch:**
- Log Groups: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups

**CloudFront:**
- Distributions: https://console.aws.amazon.com/cloudfront/home#distributions:

**Cost:**
- Cost Explorer: https://console.aws.amazon.com/cost-management/home#/cost-explorer

---

## Summary for PI

### Key Takeaways

1. **Adding experiments is straightforward:**
   - One command to create template
   - Automatic Docker builds and AWS deployment
   - ~15 minutes deployment time

2. **Updates are safe:**
   - Zero-downtime rolling deployments
   - ECS health checks ensure stability
   - Easy to roll back if needed

3. **Costs are predictable:**
   - ~$8-22/month per active experiment
   - ~$50/month baseline (shared resources)
   - Can reduce costs by archiving

4. **Data is protected:**
   - Databases persist even if experiment removed
   - Automated backups (7 days)
   - Deletion protection enabled

5. **Scalability is automatic:**
   - ECS auto-scales based on load
   - Can handle traffic surges
   - Pay only for what you use

### Comparison to Old System

**Old Pushkin v3:**
- ❌ Manual AWS resource creation
- ❌ Separate repos per experiment
- ❌ Complex deployment process
- ❌ No auto-scaling
- ❌ Difficult to update

**New Pushkin v4.2+:**
- ✅ Fully automated AWS deployment
- ✅ Monorepo (all experiments in one place)
- ✅ Single command deployment
- ✅ Built-in auto-scaling
- ✅ Easy updates

### Questions to Consider

1. **How many active experiments do you anticipate?**
   - Affects cost estimates
   - Helps plan RDS instance size

2. **What's your archival strategy?**
   - How long to keep data in production database?
   - Export schedule to S3?

3. **Do you need staging environment?**
   - Recommend using test subdomain
   - Small additional cost (~$30-50/month)

4. **Who manages deployments?**
   - Should we document process for lab members?
   - Set up CI/CD for automated deployments?

---

## Next Steps

1. **Review this guide** with your team
2. **Test experiment lifecycle** on gww.cherriechang.com
3. **Document lab-specific procedures**
4. **Set up cost monitoring**
5. **Plan first production experiment migration**

---

**Document Version:** 1.0
**Last Updated:** October 16, 2025
**Contact:** Cherrie (RSE) for questions or clarifications
