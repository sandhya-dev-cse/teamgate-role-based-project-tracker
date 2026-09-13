import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =========================
    // DynamoDB
    // =========================

    const teamgateTable = new dynamodb.Table(this, 'TeamGateTable', {
      tableName: 'TeamGate',

      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },

      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },

      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // =========================
    // Cognito User Pool
    // =========================

    const userPool = new cognito.UserPool(this, 'TeamGateUserPool', {
      userPoolName: 'TeamGateUserPool',

      selfSignUpEnabled: true,

      signInAliases: {
        email: true,
      },

      autoVerify: {
        email: true,
      },

      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },

      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // =========================
    // Cognito App Client
    // =========================

    const userPoolClient = userPool.addClient('TeamGateWebClient', {
      userPoolClientName: 'TeamGateWebClient',

      authFlows: {
        userPassword: true,
        userSrp: true,
      },

      preventUserExistenceErrors: true,
    });

    // =========================
    // Python Lambda
    // =========================

    const projectsLambda = new lambda.Function(this, 'TeamGateProjectsLambda', {
      functionName: 'TeamGateProjectsLambda',

      runtime: lambda.Runtime.PYTHON_3_14,

      handler: 'handler.lambda_handler',

      code: lambda.Code.fromAsset(
        `${__dirname}/../lambda/projects`
      ),

      environment: {
        TABLE_NAME: teamgateTable.tableName,
      },

      timeout: cdk.Duration.seconds(10),

      memorySize: 256,
    });

    // Give Lambda permission to access DynamoDB.
    teamgateTable.grantReadWriteData(projectsLambda);

    // =========================
    // API Gateway HTTP API
    // =========================

    const httpApi = new apigateway.HttpApi(this, 'TeamGateHttpApi', {
  apiName: 'TeamGateApi',

  description: 'TeamGate role-based project tracker API',

  corsPreflight: {
    allowHeaders: [
      'Content-Type',
      'Authorization',
    ],
    allowMethods: [
      apigateway.CorsHttpMethod.GET,
      apigateway.CorsHttpMethod.POST,
      apigateway.CorsHttpMethod.PUT,
      apigateway.CorsHttpMethod.DELETE,
      apigateway.CorsHttpMethod.OPTIONS,
    ],
    allowOrigins: ["*"],
    maxAge: cdk.Duration.days(1),
  },
});
    // =========================
    // Cognito JWT Authorizer
    // =========================

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      'TeamGateJwtAuthorizer',

      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,

      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    // =========================
    // Lambda Integration
    // =========================

    const lambdaIntegration =
      new integrations.HttpLambdaIntegration(
        'TeamGateLambdaIntegration',
        projectsLambda
      );

    // =========================
    // API Routes
    // =========================

    httpApi.addRoutes({
      path: '/projects',
      methods: [
        apigateway.HttpMethod.GET,
        apigateway.HttpMethod.POST,
      ],
      integration: lambdaIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/projects/{projectId}',
      methods: [
        apigateway.HttpMethod.PUT,
        apigateway.HttpMethod.DELETE,
      ],
      integration: lambdaIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/me',
      methods: [apigateway.HttpMethod.GET],
      integration: lambdaIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/users',
      methods: [apigateway.HttpMethod.GET],
      integration: lambdaIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/users/{userId}/role',
      methods: [apigateway.HttpMethod.PUT],
      integration: lambdaIntegration,
      authorizer: jwtAuthorizer,
    });

    // =========================
    // CloudFormation Outputs
    // =========================

    new cdk.CfnOutput(this, 'TeamGateTableName', {
      value: teamgateTable.tableName,
      description: 'TeamGate DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'TeamGate Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'TeamGate Cognito App Client ID',
    });

    new cdk.CfnOutput(this, 'UserPoolIssuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      description: 'TeamGate Cognito JWT issuer',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'TeamGate API Gateway endpoint',
    });

    new cdk.CfnOutput(this, 'LambdaName', {
      value: projectsLambda.functionName,
      description: 'TeamGate Python Lambda function',
    });
  }
}