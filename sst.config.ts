/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'platanus-hack-26-ar-team-25',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      providers: {
        aws: {
          region: 'us-east-1',
          // Credentials are sourced from the standard AWS env-var chain.
          // We export them per-shell via:
          //   eval "$(aws configure export-credentials --profile personal --format env)"
          // See README for details.
        },
      },
    }
  },
  async run() {
    // ─── Secrets ──────────────────────────────────────────────────────────
    // Use `sst secret set <Name> <value> --stage <stage>` to populate.
    // Lambdas read these via the typed `Resource` import; we link them below.
    const secrets = {
      databaseUrl: new sst.Secret('DatabaseUrl'),
      supabaseUrl: new sst.Secret('SupabaseUrl'),
      supabaseServiceRoleKey: new sst.Secret('SupabaseServiceRoleKey'),
      anthropicApiKey: new sst.Secret('AnthropicApiKey'),
      voyageApiKey: new sst.Secret('VoyageApiKey'),
      falKey: new sst.Secret('FalKey'),
    }

    // ─── S3 buckets ───────────────────────────────────────────────────────
    const originalsBucket = new sst.aws.Bucket('OriginalsBucket', {
      cors: {
        allowMethods: ['PUT', 'GET'],
        allowOrigins: ['*'],
        allowHeaders: ['*'],
        exposeHeaders: ['ETag'],
        maxAge: '3600 seconds',
      },
    })
    const artifactsBucket = new sst.aws.Bucket('ArtifactsBucket')

    // 30-day lifecycle expiration on both buckets (hackathon hygiene)
    new aws.s3.BucketLifecycleConfigurationV2('OriginalsLifecycle', {
      bucket: originalsBucket.name,
      rules: [
        {
          id: 'expire-30d',
          status: 'Enabled',
          filter: {},
          expiration: { days: 30 },
        },
      ],
    })
    new aws.s3.BucketLifecycleConfigurationV2('ArtifactsLifecycle', {
      bucket: artifactsBucket.name,
      rules: [
        {
          id: 'expire-30d',
          status: 'Enabled',
          filter: {},
          expiration: { days: 30 },
        },
      ],
    })

    // ─── SQS queues + DLQs ────────────────────────────────────────────────
    // Helper for standard queue + DLQ pair
    function makeQueueWithDlq(
      name: string,
      opts: { visibilityTimeout?: string; fifo?: boolean } = {},
    ) {
      const dlq = new sst.aws.Queue(`${name}Dlq`, opts.fifo ? { fifo: true } : {})
      const main = new sst.aws.Queue(name, {
        ...(opts.fifo ? { fifo: true } : {}),
        ...(opts.visibilityTimeout ? { visibilityTimeout: opts.visibilityTimeout } : {}),
        dlq: { queue: dlq.arn, retry: 3 },
      })
      return { main, dlq }
    }

    const fileIngestionQ = makeQueueWithDlq('FileIngestionQueue', {
      visibilityTimeout: '60 seconds',
    })
    const pdfQ = makeQueueWithDlq('PdfQueue', { visibilityTimeout: '300 seconds' })
    const docQ = makeQueueWithDlq('DocQueue', { visibilityTimeout: '60 seconds' })
    const imageQ = makeQueueWithDlq('ImageQueue', { visibilityTimeout: '120 seconds' })
    const videoQ = makeQueueWithDlq('VideoQueue', { visibilityTimeout: '900 seconds' })
    const embeddingQ = makeQueueWithDlq('EmbeddingQueue', { visibilityTimeout: '300 seconds' })
    const graphRecalcQ = makeQueueWithDlq('GraphRecalcQueue', {
      visibilityTimeout: '300 seconds',
      fifo: true,
    })

    // ─── Lambda env shared by all processors ─────────────────────────────
    const lambdaEnv = {
      // AWS_REGION is reserved and auto-injected by the Lambda runtime.
      ORIGINALS_BUCKET: originalsBucket.name,
      ARTIFACTS_BUCKET: artifactsBucket.name,
      FILE_INGESTION_QUEUE_URL: fileIngestionQ.main.url,
      PDF_QUEUE_URL: pdfQ.main.url,
      DOC_QUEUE_URL: docQ.main.url,
      IMAGE_QUEUE_URL: imageQ.main.url,
      VIDEO_QUEUE_URL: videoQ.main.url,
      EMBEDDING_QUEUE_URL: embeddingQ.main.url,
      GRAPH_RECALC_QUEUE_URL: graphRecalcQ.main.url,
    }

    const sharedLink = [
      secrets.databaseUrl,
      secrets.supabaseUrl,
      secrets.supabaseServiceRoleKey,
      secrets.anthropicApiKey,
      secrets.voyageApiKey,
      secrets.falKey,
      originalsBucket,
      artifactsBucket,
    ]

    // Cap how many concurrent invocations each SQS event source can spawn.
    // This limits runaway scaling per-queue without touching the account
    // unreserved-concurrency quota (which on new accounts is only 10 and forbids
    // function-level reservation). Effective burst cap = MAX_QUEUE_CONCURRENCY × #lambdas.
    const MAX_QUEUE_CONCURRENCY = 5

    function withConcurrency(args: { scalingConfig?: { maximumConcurrency?: number } }) {
      args.scalingConfig = { maximumConcurrency: MAX_QUEUE_CONCURRENCY }
    }

    // ─── Lambda: file-router ──────────────────────────────────────────────
    // Reads from FileIngestionQueue (which receives S3 events), classifies by
    // mime type, and forwards to the right type-specific queue.
    const fileRouter = new sst.aws.Function('FileRouter', {
      handler: 'lambdas/file-router/index.handler',
      memory: '512 MB',
      timeout: '60 seconds',
      environment: lambdaEnv,
      link: [
        ...sharedLink,
        fileIngestionQ.main,
        pdfQ.main,
        docQ.main,
        imageQ.main,
        videoQ.main,
      ],
    })
    fileIngestionQ.main.subscribe(fileRouter.arn, {
      transform: { eventSourceMapping: withConcurrency },
    })

    // ─── Lambda: pdf-processor ────────────────────────────────────────────
    const pdfProcessor = new sst.aws.Function('PdfProcessor', {
      handler: 'lambdas/pdf-processor/index.handler',
      memory: '1024 MB',
      timeout: '300 seconds',
      environment: lambdaEnv,
      link: [...sharedLink, pdfQ.main, embeddingQ.main],
    })
    pdfQ.main.subscribe(pdfProcessor.arn, {
      transform: { eventSourceMapping: withConcurrency },
    })

    // ─── Lambda: embedder ─────────────────────────────────────────────────
    const embedder = new sst.aws.Function('Embedder', {
      handler: 'lambdas/embedder/index.handler',
      memory: '1024 MB',
      timeout: '300 seconds',
      environment: lambdaEnv,
      link: [...sharedLink, embeddingQ.main, graphRecalcQ.main],
    })
    embeddingQ.main.subscribe(embedder.arn, {
      transform: { eventSourceMapping: withConcurrency },
    })

    // ─── Lambda: graph-recalc ─────────────────────────────────────────────
    const graphRecalc = new sst.aws.Function('GraphRecalc', {
      handler: 'lambdas/graph-recalc/index.handler',
      memory: '1024 MB',
      timeout: '300 seconds',
      environment: lambdaEnv,
      link: [...sharedLink, graphRecalcQ.main],
    })
    graphRecalcQ.main.subscribe(graphRecalc.arn)

    // ─── S3 → SQS event notification ──────────────────────────────────────
    originalsBucket.notify({
      notifications: [
        {
          name: 'FileIngestionNotify',
          queue: fileIngestionQ.main.arn,
          events: ['s3:ObjectCreated:*'],
        },
      ],
    })

    // ─── Outputs ──────────────────────────────────────────────────────────
    return {
      OriginalsBucket: originalsBucket.name,
      ArtifactsBucket: artifactsBucket.name,
      FileIngestionQueueUrl: fileIngestionQ.main.url,
      PdfQueueUrl: pdfQ.main.url,
      DocQueueUrl: docQ.main.url,
      ImageQueueUrl: imageQ.main.url,
      VideoQueueUrl: videoQ.main.url,
      EmbeddingQueueUrl: embeddingQ.main.url,
      GraphRecalcQueueUrl: graphRecalcQ.main.url,
    }
  },
})
