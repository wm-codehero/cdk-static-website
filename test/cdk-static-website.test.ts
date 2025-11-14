import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStaticWebsiteStack } from '../lib/cdk-static-website-stack';

test('Static website stack wird korrekt erstellt', () => {
    const app = new cdk.App();

    // WHEN
    const stack = new CdkStaticWebsiteStack(app, 'TestStaticWebsiteStack');

    // THEN
    const template = Template.fromStack(stack);

    // S3 Bucket existiert und ist nicht öffentlich sowie verschlüsselt
    template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
        },
        BucketEncryption: {
            ServerSideEncryptionConfiguration: [
                {
                    ServerSideEncryptionByDefault: {
                        SSEAlgorithm: 'AES256',
                    },
                },
            ],
        },
    });

    // CloudFront Distribution existiert mit defaultRootObject und PriceClass_100
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            DefaultRootObject: 'index.html',
            PriceClass: 'PriceClass_100',
        },
    });

    // BucketDeployment existiert (Deployment der Website)
    template.hasResource('Custom::CDKBucketDeployment', {});

    // CloudFront URL Output existiert
    template.hasOutput('CloudFrontUrl', {});
});