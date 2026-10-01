/**
 * Parser Debug Files Endpoint
 *
 * List and read debug files saved by AIDocumentParser
 *
 * GET /api/test/parser-debug-files
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from 'fs';
import * as path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'prompt', 'response', 'request', 'all'
    const latest = searchParams.get('latest'); // 'true' to get latest only

    const debugDir = path.join(process.cwd(), 'debug-outputs');

    if (!fs.existsSync(debugDir)) {
      return NextResponse.json({
        success: true,
        message: 'No debug outputs yet',
        files: []
      });
    }

    const files = fs.readdirSync(debugDir);
    const parserFiles = files.filter(f => f.startsWith('parser-'));

    // Group by timestamp
    const timestamps = new Set<string>();
    parserFiles.forEach(f => {
      const match = f.match(/parser-(prompt|response|request)-(\d+)\./);
      if (match) {
        timestamps.add(match[2]);
      }
    });

    const sortedTimestamps = Array.from(timestamps).sort().reverse();

    if (latest === 'true') {
      const latestTimestamp = sortedTimestamps[0];
      if (!latestTimestamp) {
        return NextResponse.json({
          success: true,
          files: []
        });
      }

      const getContent = (fileType: string) => {
        const f = parserFiles.find(f => f.includes(`-${fileType}-${latestTimestamp}`));
        if (f) {
          return fs.readFileSync(path.join(debugDir, f), 'utf8');
        }
        return null;
      };

      return NextResponse.json({
        success: true,
        timestamp: latestTimestamp,
        files: {
          request: getContent('request'),
          prompt: getContent('prompt'),
          response: getContent('response'),
        }
      });
    }

    // Return list of all timestamps
    const result = sortedTimestamps.map(ts => {
      const requestFile = parserFiles.find(f => f.includes(`-request-${ts}`));
      const promptFile = parserFiles.find(f => f.includes(`-prompt-${ts}`));
      const responseFile = parserFiles.find(f => f.includes(`-response-${ts}`));

      return {
        timestamp: ts,
        date: new Date(parseInt(ts)).toISOString(),
        files: {
          request: !!requestFile,
          prompt: !!promptFile,
          response: !!responseFile,
        }
      };
    });

    return NextResponse.json({
      success: true,
      count: result.length,
      files: result
    });

  } catch (error) {
    console.error('[Parser Debug Files] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
