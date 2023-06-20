export const pushkinACL = {
    "Name": "pushkinACL",
    "Scope": "CLOUDFRONT",
    "DefaultAction": {
        "Allow": {}
    },
    "Description": "Default ACL for Pushkin",
    "Rules": [
        {
            "Name": "AWS-AWSManagedRulesAmazonIpReputationList",
            "Priority": 0,
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesAmazonIpReputationList"
                }
            },
            "OverrideAction": {
                "None": {}
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "AWS-AWSManagedRulesAmazonIpReputationList"
            }
        },
        {
            "Name": "AWS-AWSManagedRulesCommonRuleSet",
            "Priority": 1,
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesCommonRuleSet"
                }
            },
            "OverrideAction": {
                "None": {}
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "AWS-AWSManagedRulesCommonRuleSet"
            }
        },
        {
            "Name": "AWS-AWSManagedRulesKnownBadInputsRuleSet",
            "Priority": 2,
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesKnownBadInputsRuleSet"
                }
            },
            "OverrideAction": {
                "None": {}
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "AWS-AWSManagedRulesKnownBadInputsRuleSet"
            }
        }
    ],
    "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "pushkinACL"
    },
}


export const policy = {
    "Version": "2008-10-17",
    "Id": "PolicyForCloudFrontPrivateContent",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::example.com/*", //TODO: add bucket arn
            "Condition": {
                "StringEquals": {
                  "AWS:SourceArn": "cloudfront" //TODO: add cloudfront arn
                }
            }
        }
    ]
  }


export const cloudFront = {
    "CallerReference": "string",
    "Aliases": {
        "Quantity": 0
    },
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "bucket",
                "DomainName": "URL",
                "OriginPath": "",
                "CustomHeaders": {
                    "Quantity": 0
                },
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                },
                "ConnectionAttempts": 3,
                "ConnectionTimeout": 10,
                "OriginShield": {
                    "Enabled": false
                },
                "OriginAccessControlId": "OACID"
            }
        ]
    },
"OriginGroups": {
        "Quantity": 0
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "bucket",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": [
                "HEAD",
                "GET"
            ],
            "CachedMethods": {
                "Quantity": 2,
                "Items": [
                    "HEAD",
                    "GET"
                ]
            }
        },
        "SmoothStreaming": false,
        "Compress": true,
        "LambdaFunctionAssociations": {
            "Quantity": 0
        },
        "FieldLevelEncryptionId": "",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
    },
    "CacheBehaviors": {
        "Quantity": 0
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 403,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 60
            }
        ]
    },
    "Comment": "",
    "Logging": {
        "Enabled": false,
        "IncludeCookies": false,
        "Bucket": "",
        "Prefix": ""
    },
    "PriceClass": "PriceClass_All",
    "Enabled": true,
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true,
        "MinimumProtocolVersion": "TLSv1",
        "CertificateSource": "cloudfront"
    },
    "Restrictions": {
        "GeoRestriction": {
            "RestrictionType": "none",
            "Quantity": 0
        }
    },
    "WebACLId": "ACLID",
    "HttpVersion": "http2and3",
    "IsIPV6Enabled": true,
    "ContinuousDeploymentPolicyId": "",
    "Staging": false,
    "Tags": {
        "Items": [
            {
                "Key": "PUSHKIN",
                "Value": "PUSHKIN"
            }
        ]
    }
}

export const dbConfig = {
    "DBName": "FUBAR",
    "DBInstanceIdentifier": "FUBAR1234",
    "AllocatedStorage": 20,
    "DBInstanceClass": "db.t2.micro",
    "Engine": "postgres",
    "EngineVersion": "11",
    "MasterUsername": "postgres",
    "VpcSecurityGroupIds": [
        "FUBAR"
    ],
    "MasterUserPassword": "FUBAR",
    "BackupRetentionPeriod": 7,
    "Port": 5432,
    "MultiAZ": true,
    "AutoMinorVersionUpgrade": true,
    "PubliclyAccessible": true,
    "StorageType": "gp2",
    "StorageEncrypted": false,
    "CopyTagsToSnapshot": true,
    "MonitoringInterval": 0,
    "EnableIAMDatabaseAuthentication": true,
    "EnableCloudwatchLogsExports": [
        "postgresql", "upgrade"
    ],
    "DeletionProtection": true,
    "MaxAllocatedStorage": 1000,
    "Tags": [
        {
            "Key": "PUSHKIN",
            "Value": ""
        }
    ],
}

export const rabbitTask = {
    "version": "2",
    "services": {
      "message-queue": {
        "image": "rabbitmq:3.7-management",
        "mem_limit": "512m",
        "environment": {
          "RABBITMQ_DEFAULT_USER": "RABBITMQ_USERNAME",
          "RABBITMQ_DEFAULT_PASS": "RABBITMQ_PASSWORD",
          "RABBITMQ_ERLANG_COOKIE": "RABBITMQ_COOKIE"
      },
        "ports": [
          "5672:5672/tcp",
          "4369:4369/tcp",
          "15672:15672/tcp",
          "25672:25672/tcp"
        ]    
      }
    }
}

export const apiTask = {
    'version': '2',
    'services': {
      'api': {
        'image': 'DOCKERHUB_ID/api:latest',
        'mem_limit': '128m',
        'environment': {
          "AMQP_ADDRESS":"amqp://RABBITMQ_USERNAME:RABBITMQ_PASSWORD@localhost:5672",
          'NODE_ENV':'production', //I'm not convinced this is ever used
          "PORT": 80
          },
        'command': [
              'bash',
              'dockerStart.sh'    
        ],
        "ports": [
            "80:80/tcp"
            ]
        }
    }
}

export const workerTask = {
    "version": '2',
    "services": {
      "EXPERIMENT_NAME": {
        "image": "DOCKERHUB_ID/EXPERIMENT_NAME:latest",
        "mem_limit": "128m",
        "environment": {
          "AMQP_ADDRESS": "amqp://RABBITMQ_USERNAME:RABBITMQ_PASSWORD@localhost:5672"
        },
        "command": [
            "bash", 
            "start.sh"
        ]
      }   
    }
}

export const changeSet = {
    "Action": "UPSERT",
    "ResourceRecordSet": {
        "Name": "DNS domain name",
        "Type": "A",
        "Region": "us-east-1",
        "SetIdentifier": "PushkinSet",
        "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "",
            "EvaluateTargetHealth": false
        },
    }
}

export const corsPolicy = {
    "Bucket": "",
    "CORSConfiguration": {
        "CORSRules": [
            {
                "AllowedHeaders": [
                    "Authorization"
                ],
                "AllowedMethods": [
                    "GET"
                ],
                "AllowedOrigins": [
                    "*"
                ],
                "MaxAgeSeconds": 3000
            }
        ]
    },
}

export const disableCloudfront = {
    "CallerReference": "myreference",
    "Aliases": {
        "Quantity": 0
    },
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "binbinaf254907-b471-45a0-8648-653a5c8b3ba7",
                "DomainName": "binbinaf254907-b471-45a0-8648-653a5c8b3ba7.s3.amazonaws.com",
                "OriginPath": "",
                "CustomHeaders": {
                    "Quantity": 0
                },
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "OriginGroups": {
        "Quantity": 0
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "awsexamplebucket.s3.amazonaws.com-1574382155-273939",
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            },
            "Headers": {
                "Quantity": 0
            },
            "QueryStringCacheKeys": {
                "Quantity": 0
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ViewerProtocolPolicy": "allow-all",
        "MinTTL": 0,
        "AllowedMethods": {
            "Quantity": 2,
            "Items": [
                "HEAD",
                "GET"
            ],
            "CachedMethods": {
                "Quantity": 2,
                "Items": [
                    "HEAD",
                    "GET"
                ]
            }
        },
        "SmoothStreaming": false,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": false,
        "LambdaFunctionAssociations": {
            "Quantity": 0
        },
        "FieldLevelEncryptionId": ""
    },
    "CacheBehaviors": {
        "Quantity": 0
    },
    "CustomErrorResponses": {
        "Quantity": 0
    },
    "Comment": "",
    "Logging": {
        "Enabled": false,
        "IncludeCookies": false,
        "Bucket": "",
        "Prefix": ""
    },
    "PriceClass": "PriceClass_All",
    "Enabled": false,
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true,
        "MinimumProtocolVersion": "TLSv1",
        "CertificateSource": "cloudfront"
    },
    "Restrictions": {
        "GeoRestriction": {
            "RestrictionType": "none",
            "Quantity": 0
        }
    },
    "WebACLId": "",
    "HttpVersion": "http2",
    "IsIPV6Enabled": true
}

export const alarmCPUHigh = {
    "AlarmName": "cpuHigh",
    "AlarmDescription": "CPU Usage is too high",
    "ActionsEnabled": true,
    "OKActions": [
        ""
    ],
    "AlarmActions": [
        ""
    ],
    "InsufficientDataActions": [
        ""
    ],
    "MetricName": "CPUUtilization",
    "Namespace": "AWS/ECS",
    "Statistic": "Average",
    "ExtendedStatistic": "",
    "Dimensions": [
        {
            "Name": "ClusterName",
            "Value": "FUBAR"
        }
    ],
    "Period": 300,
    "Unit": "Terabytes",
    "EvaluationPeriods": 1,
    "DatapointsToAlarm": 1,
    "Threshold": 60.0,
    "ComparisonOperator": "GreaterThanThreshold",
    "TreatMissingData": "breaching",
}

// export const alarmCPULow = {
//     "AlarmName": "cpuLow",
//     "AlarmDescription": "CPU Usage is too low",
//     "ActionsEnabled": true,
//     "OKActions": [
//         ""
//     ],
//     "AlarmActions": [
//         ""
//     ],
//     "InsufficientDataActions": [
//         ""
//     ],
//     "MetricName": "CPUUtilization",
//     "Namespace": "AWS/ECS",
//     "Statistic": "Average",
//     "ExtendedStatistic": "",
//     "Dimensions": [
//         {
//             "Name": "ClusterName",
//             "Value": "FUBAR"
//         }
//     ],
//     "Period": 300,
//     "Unit": "Terabytes",
//     "EvaluationPeriods": 1,
//     "DatapointsToAlarm": 1,
//     "Threshold": 10.0,
//     "ComparisonOperator": "LessThanThreshold",
//     "TreatMissingData": "breaching",
// }

export const alarmRAMHigh = {
    "AlarmName": "alarmRAMHigh",
    "AlarmDescription": "Memory Usage is too high",
    "ActionsEnabled": true,
    "OKActions": [
        ""
    ],
    "AlarmActions": [
        ""
    ],
    "InsufficientDataActions": [
        ""
    ],
    "MetricName": "MemoryUtilization",
    "Namespace": "AWS/ECS",
    "Statistic": "Average",
    "ExtendedStatistic": "",
    "Dimensions": [
        {
            "Name": "ClusterName",
            "Value": "FUBAR"
        }
    ],
    "Period": 300,
    "Unit": "Terabytes",
    "EvaluationPeriods": 1,
    "DatapointsToAlarm": 1,
    "Threshold": 60.0,
    "ComparisonOperator": "GreaterThanThreshold",
    "TreatMissingData": "breaching",
}

export const alarmRDSHigh = {
    "AlarmName": "alarmRDSHigh",
    "AlarmDescription": "Memory Usage is too high",
    "ActionsEnabled": true,
    "OKActions": [
        ""
    ],
    "AlarmActions": [
        ""
    ],
    "InsufficientDataActions": [
        ""
    ],
    "MetricName": "WriteLatency",
    "Namespace": "AWS/RDS",
    "Statistic": "Average",
    "ExtendedStatistic": "",
    "Dimensions": [
        {
            "Name": "DBInstanceIdentifier",
            "Value": "FUBAR"
        }
    ],
    "Period": 300,
    "Unit": "Terabytes",
    "EvaluationPeriods": 1,
    "DatapointsToAlarm": 1,
    "Threshold": 5.0,
    "ComparisonOperator": "GreaterThanThreshold",
    "TreatMissingData": "missing",
}

export const OriginAccessControl = {
    "Name": "pushkinOAC",
    "Description": "",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
}

// export const alarmRAMLow = {
//     "AlarmName": "alarmRAMLow",
//     "AlarmDescription": "Memory Usage is too low",
//     "ActionsEnabled": true,
//     "OKActions": [
//         ""
//     ],
//     "AlarmActions": [
//         ""
//     ],
//     "InsufficientDataActions": [
//         ""
//     ],
//     "MetricName": "MemoryUtilization",
//     "Namespace": "AWS/ECS",
//     "Statistic": "Average",
//     "ExtendedStatistic": "",
//     "Dimensions": [
//         {
//             "Name": "ClusterName",
//             "Value": "FUBAR"
//         }
//     ],
//     "Period": 300,
//     "Unit": "Terabytes",
//     "EvaluationPeriods": 1,
//     "DatapointsToAlarm": 1,
//     "Threshold": 10.0,
//     "ComparisonOperator": "LessThanThreshold",
//     "TreatMissingData": "breaching",
// }

export const launchGroup = {
    "LaunchConfigurationName": "CLItutorial-launchconfig",
    "MinSize": 2,
    "MaxSize": 10,
    "DesiredCapacity": 2,
    "DefaultCooldown": 300,
    "AvailabilityZones": [
        "us-west-2c"
    ],
    "HealthCheckType": "EC2",
    "HealthCheckGracePeriod": 300,
    "VPCZoneIdentifier": "subnet-abcd1234",
    "TerminationPolicies": [
        "DEFAULT"
    ],
    "NewInstancesProtectedFromScaleIn": true,
    "ServiceLinkedRoleARN": "arn:aws:iam::111122223333:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling"
}

export const scalingPolicyTargets = {
     "TargetValue": 700.0,
     "PredefinedMetricSpecification": {
          "PredefinedMetricType": "ALBRequestCountPerTarget",
          "ResourceLabel": "app/EC2Co-EcsEl-1TKLTMITMM0EO/f37c06a68c1748aa/targetgroup/EC2Co-Defau-LDNM7Q3ZH1ZN/6d4ea56ca2d6a18d"
     }
}