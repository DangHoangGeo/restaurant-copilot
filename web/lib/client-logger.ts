'use client'

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

interface ClientLogEntry {
  level: LogLevel
  endpoint: string
  message: string
  metadata?: Record<string, unknown>
}

class ClientLogger {
  private async sendLog(entry: ClientLogEntry): Promise<void> {
    // Only send logs in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_ENABLE_CLIENT_LOGGING) {
      return
    }

    try {
      await fetch('/api/v1/internal/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      // Fallback to console in development if API fails
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send log to server:', error)
        console.log('Original log:', entry)
      }
    }
  }

  async info(endpoint: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.sendLog({ level: 'INFO', endpoint, message, metadata })
  }

  async warn(endpoint: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.sendLog({ level: 'WARN', endpoint, message, metadata })
  }

  async error(endpoint: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.sendLog({ level: 'ERROR', endpoint, message, metadata })
  }

  async debug(endpoint: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.sendLog({ level: 'DEBUG', endpoint, message, metadata })
  }
}

export const clientLogger = new ClientLogger()
