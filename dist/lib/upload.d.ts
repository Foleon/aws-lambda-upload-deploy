import * as AWS from 'aws-sdk';
declare type UploadOptions = {
    source: string;
    bucketName: AWS.S3.BucketName;
    path?: AWS.S3.ObjectKey;
};
export declare const upload: ({ source, bucketName, path }: UploadOptions) => Promise<{
    bucketName: string;
    fileKey: string;
}>;
export {};
