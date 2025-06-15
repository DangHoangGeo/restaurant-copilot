import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getUserFromRequest } from '@/lib/server/getUserFromRequest'

interface LogRequest {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  endpoint: string
  message: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    const body: LogRequest = await request.json()
    
    // Validate request body
    if (!body.level || !body.endpoint || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: level, endpoint, message' },
        { status: 400 }
      )
    }

    // Route to appropriate logger method
    switch (body.level) {
      case 'INFO':
        await logger.info(body.endpoint, body.message, body.metadata, user?.restaurantId || undefined, user?.userId)
        break
      case 'WARN':
        await logger.warn(body.endpoint, body.message, body.metadata, user?.restaurantId || undefined, user?.userId)
        break
      case 'ERROR':
        await logger.error(body.endpoint, body.message, body.metadata, user?.restaurantId || undefined, user?.userId)
        break
      case 'DEBUG':
        await logger.debug(body.endpoint, body.message, body.metadata, user?.restaurantId || undefined, user?.userId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid log level' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    await logger.error('internal-logs-api', 'Failed to process log request', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
