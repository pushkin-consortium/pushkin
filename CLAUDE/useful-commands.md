# Querying AwS RDS Databases

## Get list of AWS services in use

`aws ecs describe-services --cluster testewsite --services api --query 'services[0].taskDefinition'`

## Get list of AWS RDS DBs in use

`aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,Engine,DBInstanceStatus]'`

## Connect to psql to query DB

```
PGPASSWORD="DBPASSWORD" psql -h DBENDPOINT -U postgres -d DBNAME
```

## Common queries

```
-- List all tables
\dt

-- Describe a table structure
\d table_name

-- Query data
SELECT * FROM pushkin_users LIMIT 10;
SELECT * FROM ew_test_stimulusResponses LIMIT 10;

-- Count rows
SELECT COUNT(*) FROM pushkin_users;

-- Exit
\q
```

## Rebuild experiments

cd "/Users/cherriechang/Documents/Pushkin/test_ew_site/experiments/ew_test_pl/web page" && yarn build && yalc publish

cd /Users/cherriechang/Documents/Pushkin/test_ew_site/pushkin/front-end && yalc update && yarn build

aws s3 sync build/ s3://test-ew-site895da17a-9561-4f5d-9e00-442b20f29c13 --delete

aws cloudfront create-invalidation --distribution-id E1XSJP0WKXF9DT --paths "/\*"
