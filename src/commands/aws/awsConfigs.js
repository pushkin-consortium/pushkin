export const policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::example.com/*"
            ]
        }
    ]
}

export const cloudfront = {
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
                "ConnectionTimeout": 10
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
        "Compress": false,
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
    "WebACLId": "",
    "HttpVersion": "http2",
    "IsIPV6Enabled": true
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
    "MaxAllocatedStorage": 1000
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
          "AMPQ_ADDRESS":"amqp://RABBITMQ_USERNAME:RABBITMQ_PASSWORD@localhost:5672",
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
          "AMPQ_ADDRESS": "amqp://RABBITMQ_USERNAME:RABBITMQ_PASSWORD@localhost:5672"
        },
        "command": [
            "bash", 
            "start.sh"
        ]
      }   
    }
}

export const recordSet = {
    "HostedZoneId": "us-east-1",
    "ChangeBatch": {
        "Comment": "",
        "Changes": [
            {
                "Action": "CREATE",
                "ResourceRecordSet": {
                    "Name": "",
                    "Type": "A",
                    "SetIdentifier": "",
                    "Weight": 0,
                    "Region": "us-east-1",
                    "GeoLocation": {
                        "ContinentCode": "",
                        "CountryCode": "",
                        "SubdivisionCode": ""
                    },
                    "Failover": "SECONDARY",
                    "MultiValueAnswer": true,
                    "TTL": 0,
                    "ResourceRecords": [
                        {
                            "Value": ""
                        }
                    ],
                    "AliasTarget": {
                        "HostedZoneId": "",
                        "DNSName": "",
                        "EvaluateTargetHealth": true
                    },
                    "HealthCheckId": "",
                    "TrafficPolicyInstanceId": ""
                }
            }
        ]
    }
}
