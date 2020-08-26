# AWS Deletion

## Skip to section

* [using cli](awsDeletion.md#cli)
* [using AWS console](awsDeletion.md#console)

## CLI

The pushkin CLI will delete resources it was responsible for creating. Run:

```bash
$ pushkin aws armageddon
```

This will leave in place your IAM users, any database snapshots, and task definitions, but otherwise everything is deleted INCLUDING YOUR DATA (unless you have snapshots), so use this with caution. 

When the program finishes running, it will list any deletable resources that were not successfully deleted. Sometimes, running `pushkin aws armageddon` more than once will remove the hold-outs. If not...

## Console

The CLI does its best to remove things it was responsible for creating. However, if you creating anything outside the CLI, or if AWS changes how some things work, or if `pushkin aws init` crashed when running, the CLI may not be able to delete everything. In that case, you should use the AWS CLI:

1. Go to the [RDS service](https://console.aws.amazon.com/rds). Click on "DB Instances". For each instance:

	A. Choose Modify.

	B. Scroll to the bottom and deselect `Enable deletion proection`.
	
	C. On the next page, choose to apply changes immediately.
	
	D. After saving, select the database again and choose Actions->Delete. If you want to save a snapshot of your database (including all data), go ahead and select that option. Otherwise, deselect. 

2. Go to the [Cloudformation service](https://console.aws.amazon.com/cloudformation). Select the stack, then choose 'delete'. 

3. Go to the [ECS service](https://console.aws.amazon.com/ecs). Click on your cluster. Then choose 'Delete Cluster'. 

4. Go to the [EC2 service](https://console.aws.amazon.com/ec2). Click on 'Load Balancers'. Select your load balancer (if more than one). Then choose Actions->Delete.

5. Go to the [Cloudfront service](https://console.aws.amazon.com/cloudfront). Select your distribution. Choose 'Disable'. 

6. Wait a while (about 5 minutes). Once your distribution's state is displayed as 'Disabled', you can now select it and click 'Delete'. 

7. Go back to the [EC2 service](https://console.aws.amazon.com/ec2). Select 'Security Groups'. Select all the security groups EXCEPT the one named 'default' (and, if you are developing on an AWS EC2 instance, the security group(s) you created when setting that up). Then choose Actions->Delete. 

You may be told you can't delete one of the security groups because it is still in use. That's probably because the databases haven't finished deleting. Check to see if that's the case (go back to RDS). If so, wait a while longer, then try again.

Finally, go to the [S3 service](https://s3.console.aws.amazon.com/s3). Choose your s3 bucket(s) and click "Delete". 

------

At this point, you've deleted mostly everything. We have not deleted any database snapshots or backups. We did not delete SSL certificates or domain names, which you created during initial deploy. We also didn't delete any ECS task definitions, because that does not appear to be possible. 

However, we have deleted everything that costs a significant amount of money, or would interfere with re-deploying your pushkin site. Note that DB snapshots aren't free to store (they are cheap, though), and your domain name may be on auto-renewal. If you really want to get rid of *everything*, the best bet is to delete your account itself.

