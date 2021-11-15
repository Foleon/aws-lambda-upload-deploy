import * as AWS from "aws-sdk";
export declare type UploadDeployOptions = {
    functionName: AWS.Lambda.FunctionName;
    handlerName: string;
    sourcePath: string;
    version: string;
    s3: {
        bucketName: AWS.S3.BucketName;
        bucketPath?: string;
        key?: AWS.S3.ObjectKey;
    };
    settings?: {
        runtime?: AWS.Lambda.Runtime;
        reservedConcurrentExecutions?: AWS.Lambda.ReservedConcurrentExecutions;
        memory?: AWS.Lambda.MemorySize;
        timeout?: AWS.Lambda.Timeout;
        environment?: AWS.Lambda.EnvironmentVariables;
        servicesAllowed?: string[];
        managedPolicies?: string[];
        permissions?: {
            effect: "Allow" | "Deny";
            action: string[];
            resource: string[];
        }[];
        tracingConfig?: {
            mode?: AWS.Lambda.TracingMode;
        };
        vpcConfig?: {
            subnetIds?: AWS.Lambda.SubnetIds;
            securityGroupIds?: AWS.Lambda.SecurityGroupIds;
        };
        exportForCloudFormation?: boolean;
    };
};
export declare const AwsLambdaUploadDeploy: ($options: UploadDeployOptions) => {
    start: ({ assumeYes, noVersioning, }?: {
        assumeYes?: boolean;
        noVersioning?: boolean;
    }) => Promise<void | {
        functionName: string;
        bucketName: string;
        cloudformation: {
            outputs: AWS.CloudFormation.Outputs;
        };
    }>;
};
