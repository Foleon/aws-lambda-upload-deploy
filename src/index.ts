import * as AWS from "aws-sdk";
import ora from "ora";
import * as os from "os";
import * as fs from "fs";
import deepmerge from "deepmerge";
import chalk from "chalk";
import { AwsCloudFormationDeploy } from "@erwinverdonk/aws-cloudformation-deploy";

import {
  createZip,
  upload,
  generateCloudFormationTemplate,
  checkLambdaExists,
  updateCode,
} from "./lib";

export type UploadDeployOptions = {
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

const getDefaultOptions = (functionName: string) => ({
  s3: {
    bucketPath: "",
  },
  handlerName: "handler",
  settings: {
    runtime: "nodejs8.10",
    memory: 128,
    timeout: 3,
    environment: {},
    servicesAllowed: ["lambda.amazonaws.com"],
    tracingConfig: {
      mode: "PassThrough",
    },
    permissions: [
      {
        effect: "Allow",
        action: ["lambda:InvokeFunction"],
        resource: [`arn:aws:lambda:*:*:function:${functionName}`],
      },
    ],
    exportForCloudFormation: true,
  },
});

const oraPromise = (message: string, promise: Promise<any>) => {
  const indicator = ora(message);

  indicator.start();

  return promise
    .then((_) => {
      indicator.succeed();
      return _;
    })
    .catch((_) => {
      indicator.fail();
      throw _;
    });
};

export const AwsLambdaUploadDeploy = ($options: UploadDeployOptions) => {
  const options: typeof $options = deepmerge(
    getDefaultOptions($options.functionName),
    $options,
    { arrayMerge: (dest, src, opt) => src }
  );

  // Version may only contain alphabetical character, colon and hyphen.
  options.version = options.version.replace(/[^a-z0-9:-]/gi, "-");

  const start = ({
    assumeYes,
    noVersioning,
  }: { assumeYes?: boolean; noVersioning?: boolean } = {}) => {
    const zipFileName = `${options.functionName}-${
      options.version
    }-${new Date().getTime()}.zip`;
    options.s3.key = `${options.s3.bucketPath}${zipFileName}`;

    return (
      (
        oraPromise(
          "Creating Lambda package...",
          createZip({
            input: options.sourcePath,
            output: `${os.tmpdir()}/${zipFileName}`,
          })
        ) as ReturnType<typeof createZip>
      )
        // Upload Lambda package
        .then(async (pkg) => {
          const uploadResult = await (oraPromise(
            "Uploading Lambda package...",
            upload({ source: pkg.output, bucketName: options.s3.bucketName })
          ) as ReturnType<typeof upload>);

          return {
            pkg,
            uploadResult,
          };
        })
        // Remove temporary ZIP file
        .then((_) => {
          fs.unlinkSync(_.pkg.output);
          return _;
        })
        // Deploy Lambda to AWS with CloudFormation
        .then(async ({ pkg, uploadResult }) => {
          const lambdaExists = await checkLambdaExists({
            functionName: options.functionName,
          });
          const outputs = [] as AWS.CloudFormation.Outputs;

          // Deploy the base Lambda
          const lambdaBaseResult = await AwsCloudFormationDeploy({
            stackName: `Lambda-${options.functionName}`,
            templateBody: generateCloudFormationTemplate(options, false),
          }).start({ assumeYes });

          // Store the outputs of the Lambda base for later return.
          outputs.splice.apply(
            outputs,
            [0, 0].concat(lambdaBaseResult.outputs as any)
          );

          // When the Lambda does already exist we update the code
          // TODO: Add hash to ZIP filename so we can check whether code has actually changed
          if (lambdaExists) {
            await updateCode({
              functionName: options.functionName,
              s3BucketName: options.s3.bucketName,
              s3Key: `${options.s3.bucketPath}${uploadResult.fileKey}`,
            });
          }

          // When Lambda base already existed or is deployed successfully we can
          // continue deploy the version.
          if (!noVersioning && (lambdaExists || lambdaBaseResult.succeed)) {
            outputs.splice.apply(
              outputs,
              [0, 0].concat(
                (
                  await AwsCloudFormationDeploy({
                    stackName: `Lambda-${options.functionName}-${options.version}`,
                    templateBody: generateCloudFormationTemplate(
                      options,
                      await checkLambdaExists({
                        functionName: options.functionName,
                      })
                    ),
                  }).start({ assumeYes })
                ).outputs as any
              )
            );
          }

          return { outputs };
        })
        // Pass info down
        .then((_) => ({
          functionName: options.functionName,
          bucketName: options.s3.bucketName,
          cloudformation: _,
        }))
        // Give the 'not-ok' sign
        .catch((_) => {
          console.error(chalk.red(_));
        })
    );
  };

  return {
    start,
  };
};
