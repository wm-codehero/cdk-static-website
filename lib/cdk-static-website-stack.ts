import * as cdk from 'aws-cdk-lib/core';
import {Construct} from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class CdkStaticWebsiteStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. Create a private bucket for your website content
        const websiteBucket = new s3.Bucket(this, 'CdkStaticWebsiteBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            versioned: false,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
        });

        // 2. Create the CloudFront Distribution with cost optimizations
        const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
            defaultRootObject: 'index.html',

            // Verwende die günstigste Preisklasse (nur USA, Kanada, Europa)
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,

            // Minimiere Logging-Kosten (deaktiviert)
            enableLogging: false,

            // HTTP/2 ist Standard und kostet nichts extra
            httpVersion: cloudfront.HttpVersion.HTTP2,

            // Minimale Cache-Konfiguration
            defaultBehavior: {
                // Verwende S3Origin - CDK erstellt automatisch OAI
                origin: new origins.S3Origin(websiteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,

                // Caching-Optimierungen für geringere Kosten
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,

                // Kompression aktivieren (reduziert Transfer-Kosten)
                compress: true,

                // Keine zusätzlichen HTTP-Methoden (nur GET, HEAD)
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
            },

            // Error Responses für SPAs
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                }
            ],
        });

        // 3. Deploy the website content
        new s3Deployment.BucketDeployment(this, 'DeployStaticWebsite', {
            sources: [s3Deployment.Source.asset(path.join(__dirname, '..', 'src'))],
            destinationBucket: websiteBucket,
            distribution: distribution,
            distributionPaths: ['/*'],

            // Optimierung: Nur geänderte Dateien hochladen
            prune: true,
        });

        // 4. Output the CloudFront URL
        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${distribution.distributionDomainName}`,
            description: 'The URL of the static website via CloudFront',
        });
    }
}