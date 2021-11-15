"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsLambdaUploadDeploy = void 0;
const ora_1 = __importDefault(require("ora"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const deepmerge_1 = __importDefault(require("deepmerge"));
const chalk_1 = __importDefault(require("chalk"));
const aws_cloudformation_deploy_1 = require("@erwinverdonk/aws-cloudformation-deploy");
const lib_1 = require("./lib");
const getDefaultOptions = (functionName) => ({
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
const oraPromise = (message, promise) => {
    const indicator = (0, ora_1.default)(message);
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
const AwsLambdaUploadDeploy = ($options) => {
    const options = (0, deepmerge_1.default)(getDefaultOptions($options.functionName), $options, { arrayMerge: (dest, src, opt) => src });
    options.version = options.version.replace(/[^a-z0-9:-]/gi, "-");
    const start = ({ assumeYes, noVersioning, } = {}) => {
        const zipFileName = `${options.functionName}-${options.version}-${new Date().getTime()}.zip`;
        options.s3.key = `${options.s3.bucketPath}${zipFileName}`;
        return (oraPromise("Creating Lambda package...", (0, lib_1.createZip)({
            input: options.sourcePath,
            output: `${os.tmpdir()}/${zipFileName}`,
        }))
            .then((pkg) => __awaiter(void 0, void 0, void 0, function* () {
            const uploadResult = yield oraPromise("Uploading Lambda package...", (0, lib_1.upload)({ source: pkg.output, bucketName: options.s3.bucketName }));
            return {
                pkg,
                uploadResult,
            };
        }))
            .then((_) => {
            fs.unlinkSync(_.pkg.output);
            return _;
        })
            .then(({ pkg, uploadResult }) => __awaiter(void 0, void 0, void 0, function* () {
            const lambdaExists = yield (0, lib_1.checkLambdaExists)({
                functionName: options.functionName,
            });
            const outputs = [];
            const lambdaBaseResult = yield (0, aws_cloudformation_deploy_1.AwsCloudFormationDeploy)({
                stackName: `Lambda-${options.functionName}`,
                templateBody: (0, lib_1.generateCloudFormationTemplate)(options, false),
            }).start({ assumeYes });
            outputs.splice.apply(outputs, [0, 0].concat(lambdaBaseResult.outputs));
            if (lambdaExists) {
                yield (0, lib_1.updateCode)({
                    functionName: options.functionName,
                    s3BucketName: options.s3.bucketName,
                    s3Key: `${options.s3.bucketPath}${uploadResult.fileKey}`,
                });
            }
            if (!noVersioning && (lambdaExists || lambdaBaseResult.succeed)) {
                outputs.splice.apply(outputs, [0, 0].concat((yield (0, aws_cloudformation_deploy_1.AwsCloudFormationDeploy)({
                    stackName: `Lambda-${options.functionName}-${options.version}`,
                    templateBody: (0, lib_1.generateCloudFormationTemplate)(options, yield (0, lib_1.checkLambdaExists)({
                        functionName: options.functionName,
                    })),
                }).start({ assumeYes })).outputs));
            }
            return { outputs };
        }))
            .then((_) => ({
            functionName: options.functionName,
            bucketName: options.s3.bucketName,
            cloudformation: _,
        }))
            .catch((_) => {
            console.error(chalk_1.default.red(_));
        }));
    };
    return {
        start,
    };
};
exports.AwsLambdaUploadDeploy = AwsLambdaUploadDeploy;
