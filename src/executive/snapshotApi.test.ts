// Tests for the on-demand reporting API (Ratio v2 Wave 2b). Lives under src/ (not
// pages/) so Next.js never routes it as an endpoint. Drives the route handler
// with a minimal mock req/res and asserts the export contract: correct
// Content-Type + auto-timestamped attachment filename for both formats, valid
// document magic bytes, and clean rejection of bad method / bad format. Node env.
import { describe, it, expect } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/report/snapshot';
import { REPORT_FILENAME_PATTERN } from './reportFilename';

interface Captured {
  statusCode: number;
  headers: Record<string, string | number>;
  body: unknown;
}

function mockRes(): { res: NextApiResponse; captured: Captured } {
  const captured: Captured = { statusCode: 0, headers: {}, body: undefined };
  const res = {
    setHeader(key: string, value: string | number) {
      captured.headers[key.toLowerCase()] = value;
    },
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      captured.body = payload;
      return this;
    },
    send(payload: unknown) {
      captured.body = payload;
      return this;
    },
  } as unknown as NextApiResponse;
  return { res, captured };
}

function req(method: string, query: Record<string, string> = {}): NextApiRequest {
  return { method, query } as unknown as NextApiRequest;
}

function filenameOf(captured: Captured): string {
  const disposition = String(captured.headers['content-disposition']);
  const match = /filename="([^"]+)"/.exec(disposition);
  if (!match) throw new Error(`no filename in: ${disposition}`);
  return match[1];
}

describe('GET /api/report/snapshot', () => {
  it('returns a PDF with an auto-timestamped attachment filename', async () => {
    const { res, captured } = mockRes();
    await handler(req('GET', { format: 'pdf' }), res);

    expect(captured.statusCode).toBe(200);
    expect(captured.headers['content-type']).toBe('application/pdf');
    const filename = filenameOf(captured);
    expect(filename).toMatch(/^ratio-report-.*Z\.pdf$/);
    expect(filename).toMatch(REPORT_FILENAME_PATTERN);
    const body = captured.body as Buffer;
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('defaults to PDF when no format is supplied', async () => {
    const { res, captured } = mockRes();
    await handler(req('GET'), res);
    expect(captured.statusCode).toBe(200);
    expect(captured.headers['content-type']).toBe('application/pdf');
    expect(filenameOf(captured)).toMatch(/\.pdf$/);
  });

  it('returns an XLSX with an auto-timestamped attachment filename', async () => {
    const { res, captured } = mockRes();
    await handler(req('GET', { format: 'xlsx' }), res);

    expect(captured.statusCode).toBe(200);
    expect(captured.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const filename = filenameOf(captured);
    expect(filename).toMatch(/^ratio-report-.*Z\.xlsx$/);
    expect(filename).toMatch(REPORT_FILENAME_PATTERN);
    const body = captured.body as Buffer;
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('rejects a non-GET method with 405', async () => {
    const { res, captured } = mockRes();
    await handler(req('POST', { format: 'pdf' }), res);
    expect(captured.statusCode).toBe(405);
    expect(captured.headers['allow']).toBe('GET');
  });

  it('rejects an unknown format with 400', async () => {
    const { res, captured } = mockRes();
    await handler(req('GET', { format: 'csv' }), res);
    expect(captured.statusCode).toBe(400);
  });
});

