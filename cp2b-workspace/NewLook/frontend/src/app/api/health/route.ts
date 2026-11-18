import { NextResponse } from 'next/server';

export async function GET() {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    i18n: {
      locales: ['en', 'pt-BR'],
      default: 'en'
    }
  };

  return NextResponse.json(healthcheck);
}

