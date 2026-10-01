type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'workflow';

interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  workflowId?: string;
  lessonPlanId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  // Token metrics
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  totalAiCalls?: number;
  // Additional context
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { error: String(error) };

    const fullContext = { ...context, ...errorDetails };

    console.error(this.formatMessage('error', message, fullContext));

    // TODO: In production, send to monitoring service
    // Example integrations:
    // - Sentry: Sentry.captureException(error, { contexts: { custom: context } });
    // - LogRocket: LogRocket.captureException(error, { extra: context });
    // - CloudWatch: cloudwatchLogs.putLogEvents({ logEvents: [...] });
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('info', message, context));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  // Helper for API route errors
  logApiError(
    error: Error | unknown,
    req: Request,
    context?: Omit<LogContext, 'path'>
  ) {
    this.error(
      'API route error',
      error,
      {
        path: new URL(req.url).pathname,
        method: req.method,
        ...context,
      }
    );
  }

  // Workflow-specific logging
  logWorkflowStart(context: LogContext) {
    const { sessionId, workflowId, lessonPlanId, userId } = context;
    this.info(
      `[WORKFLOW] Starting workflow`,
      { sessionId, workflowId, lessonPlanId, userId }
    );
  }

  logWorkflowStep(stepName: string, context: LogContext) {
    const { sessionId, workflowId, duration } = context;
    this.info(
      `[WORKFLOW] Step: ${stepName}`,
      { sessionId, workflowId, stepName, duration }
    );
  }

  logWorkflowComplete(context: LogContext) {
    const {
      sessionId,
      workflowId,
      lessonPlanId,
      userId,
      duration,
      totalAiCalls,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
    } = context;

    this.info(
      `[WORKFLOW] Workflow completed`,
      {
        sessionId,
        workflowId,
        lessonPlanId,
        userId,
        duration,
        totalAiCalls,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
      }
    );
  }

  logWorkflowError(
    error: Error | unknown,
    context: LogContext
  ) {
    const { sessionId, workflowId, lessonPlanId, userId } = context;
    this.error(
      `[WORKFLOW] Workflow failed`,
      error,
      { sessionId, workflowId, lessonPlanId, userId }
    );
  }
}

export const logger = new Logger();
