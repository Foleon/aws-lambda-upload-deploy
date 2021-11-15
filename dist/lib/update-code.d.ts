declare type UpdateCodeParams = {
    functionName: string;
    s3BucketName: string;
    s3Key: string;
};
export declare const updateCode: ({ functionName, s3BucketName, s3Key }: UpdateCodeParams) => Promise<boolean>;
export {};
