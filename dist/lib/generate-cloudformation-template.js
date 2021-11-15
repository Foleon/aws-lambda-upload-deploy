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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCloudFormationTemplate = void 0;
const fs = __importStar(require("fs"));
const generateCloudFormationTemplate = (options, lambdaExists) => {
    const template = fs.readFileSync(`${__dirname}/../../src/lambda${lambdaExists ? '.version' : ''}.template.yaml`, 'utf8');
    return template
        .replace(/@{S3Bucket}/g, options.s3.bucketName)
        .replace(/@{S3Key}/g, options.s3.key)
        .replace(/@{FunctionName}/g, options.functionName)
        .replace(/@{HandlerName}/g, options.handlerName)
        .replace(/@{Runtime}/g, options.settings.runtime)
        .replace(/@{MemorySize}/g, options.settings.memory.toString())
        .replace(/@{ReservedConcurrentExecutions}/g, (!Number.isNaN(Number.parseInt(options.settings.reservedConcurrentExecutions))
        ? options.settings.reservedConcurrentExecutions
        : '!Ref AWS::NoValue').toString())
        .replace(/@{Timeout}/g, options.settings.timeout.toString())
        .replace(/@{VpcConfig}/g, options.settings.vpcConfig
        ? JSON.stringify(Object.keys(options.settings.vpcConfig).reduce((acc, key) => {
            acc[key.replace(/^\w/, _ => _.toUpperCase())] = options
                .settings.vpcConfig[key];
            return acc;
        }, {}))
        : '!Ref AWS::NoValue')
        .replace(/@{Environment}/g, JSON.stringify(options.settings.environment))
        .replace(/@{Version}/g, options.version)
        .replace(/@{TracingMode}/g, options.settings.tracingConfig.mode)
        .replace(/@{RoleStatement}/g, JSON.stringify([
        {
            Effect: 'Allow',
            Principal: {
                Service: options.settings.servicesAllowed
            },
            Action: ['sts:AssumeRole']
        }
    ]))
        .replace(/@{ManagedPolicies}/g, options.settings.managedPolicies
        ? `ManagedPolicyArns: ${JSON.stringify(options.settings.managedPolicies)}`
        : '')
        .replace(/@{PolicyStatement}/g, JSON.stringify(options.settings.permissions
        .concat([
        {
            effect: 'Allow',
            action: ['lambda:InvokeFunction'],
            resource: [
                `arn:aws:lambda:*:*:function:${options.functionName}`,
                `arn:aws:lambda:*:*:function:${options.functionName}:*`
            ]
        },
        {
            effect: 'Allow',
            action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resource: ['*']
        }
    ])
        .map((_) => Object.keys(_).reduce((acc, key) => {
        acc[key.replace(/^\w/, _ => _.toUpperCase())] = _[key];
        return acc;
    }, {}))));
};
exports.generateCloudFormationTemplate = generateCloudFormationTemplate;
