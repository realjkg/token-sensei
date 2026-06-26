// MockAIClient unit tests (spec §9) — fully offline, no keys, no network.
// Verifies the mock is data-grounded: provider tag, role, at-risk reference by id.

import { describe, it, expect } from 'vitest';
import { MockAIClient } from './MockAIClient';
import type { AIContext } from './AIClient';

const mockCtx: AIContext = {
  initiatives: [
    {
      id: 'i1',
      name: 'GPT Summarizer',
      monthlyCost: 50000,
      annualRunRate: 600000,
      budgetConsumedPct: 85,
      status: 'At Risk',
      valueRatio: 2.1,
      savingsOpportunity: 8000,
    },
  ],
  summary: {
    totalMonthlySpend: 50000,
    projectedSavings: 8000,
    initiativesActive: 1,
    pendingApproval: 0,
  },
  asOf: '2026-06-26T00:00:00.000Z',
};

describe('MockAIClient', () => {
  const client = new MockAIClient();

  it('returns a response with provider=mock', async () => {
    const res = await client.chat([{ role: 'user', content: 'What is at risk?' }], mockCtx);
    expect(res.provider).toBe('mock');
    expect(res.message.role).toBe('assistant');
    expect(res.message.content.length).toBeGreaterThan(0);
  });

  it('references the at-risk initiative by id', async () => {
    const res = await client.chat(
      [{ role: 'user', content: 'Which initiatives are at risk?' }],
      mockCtx,
    );
    expect(res.initiativesReferenced).toContain('i1');
  });

  it('does not throw on empty message history', async () => {
    const res = await client.chat([], mockCtx);
    expect(res.provider).toBe('mock');
  });

  it('cites cost paired with value ratio (R4)', async () => {
    const res = await client.chat(
      [{ role: 'user', content: "What's driving cost?" }],
      mockCtx,
    );
    // R4: every cost must be paired with its value ratio.
    expect(res.message.content).toContain('×');
  });
});

