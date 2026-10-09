import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectConfidenceSignals, calculateConfidenceScore } from './confidence';

// Word-signal heuristic only; these checks do not validate psychological confidence.
// Mock transcript type
type MockTranscript = Array<{ role: 'user' | 'assistant'; content: string }>;

describe('detectConfidenceSignals', () => {
  it('should detect hedging words', () => {
    const transcript: MockTranscript = [
      { role: 'user', content: 'I think maybe I could have done better' },
      { role: 'assistant', content: 'That is a good answer' },
    ];
    const signals = detectConfidenceSignals(transcript);
    assert.ok(signals.hedgingCount > 0);
    assert.equal(signals.totalWords, 8); // "I think maybe I could have done better" = 8 words
  });

  it('should detect assertive statements', () => {
    const transcript: MockTranscript = [
      { role: 'user', content: 'I delivered the project on time and increased revenue by 30%' },
    ];
    const signals = detectConfidenceSignals(transcript);
    assert.ok(signals.assertiveCount > 0);
  });

  it('should count short answers (<5 words)', () => {
    const transcript: MockTranscript = [
      { role: 'user', content: 'Yes.' },
      { role: 'user', content: 'I don\'t know.' },
      { role: 'user', content: 'Maybe.' },
    ];
    const signals = detectConfidenceSignals(transcript);
    assert.equal(signals.shortAnswerCount, 3);
  });

  it('should count filler words', () => {
    const transcript: MockTranscript = [
      { role: 'user', content: 'Well, um, I think, like, you know, I did it.' },
    ];
    const signals = detectConfidenceSignals(transcript);
    assert.ok(signals.fillerCount >= 3); // well, um, like, you know
  });

  it('should handle empty transcript', () => {
    const transcript: MockTranscript = [];
    const signals = detectConfidenceSignals(transcript);
    assert.equal(signals.totalWords, 0);
    assert.equal(signals.hedgingCount, 0);
    assert.equal(signals.fillerCount, 0);
    assert.equal(signals.assertiveCount, 0);
    assert.equal(signals.shortAnswerCount, 0);
  });
});

describe('calculateConfidenceScore', () => {
  it('should return 50 for empty transcript', () => {
    const signals = {
      hedgingCount: 0,
      fillerCount: 0,
      assertiveCount: 0,
      shortAnswerCount: 0,
      totalWords: 0,
      hedgingDensity: 0, fillerDensity: 0, assertiveDensity: 0, shortAnswerDensity: 0,
    } satisfies import('./confidence').ConfidenceSignals;
    assert.equal(calculateConfidenceScore(signals), 50);
  });

  it('should return low score for heavy hedging', () => {
    const signals = {
      hedgingCount: 5,
      fillerCount: 3,
      assertiveCount: 0,
      shortAnswerCount: 2,
      totalWords: 50,
      hedgingDensity: 10, fillerDensity: 6, assertiveDensity: 0, shortAnswerDensity: 40,
    } satisfies import('./confidence').ConfidenceSignals;
    const score = calculateConfidenceScore(signals);
    assert.ok(score < 40);
  });

  it('should apply assertive word density rather than raw counts', () => {
    const signals = {
      hedgingCount: 0,
      fillerCount: 0,
      assertiveCount: 5,
      shortAnswerCount: 0,
      totalWords: 80,
      hedgingDensity: 0, fillerDensity: 0, assertiveDensity: 6.25, shortAnswerDensity: 0,
    } satisfies import('./confidence').ConfidenceSignals;
    const score = calculateConfidenceScore(signals);
    assert.equal(score, 55); // 5 / 80 words = 6.25%, not a psychological rating.
  });

  it('should return moderate score for balanced transcript', () => {
    const signals = {
      hedgingCount: 2,
      fillerCount: 2,
      assertiveCount: 3,
      shortAnswerCount: 1,
      totalWords: 60,
      hedgingDensity: 100 / 30, fillerDensity: 100 / 30, assertiveDensity: 5, shortAnswerDensity: 20,
    } satisfies import('./confidence').ConfidenceSignals;
    const score = calculateConfidenceScore(signals);
    assert.ok(score >= 40);
    assert.ok(score < 80);
  });

  it('should remain neutral when all measured densities are zero', () => {
    const signals = {
      hedgingCount: 0,
      fillerCount: 0,
      assertiveCount: 0,
      shortAnswerCount: 0,
      totalWords: 1000,
      hedgingDensity: 0, fillerDensity: 0, assertiveDensity: 0, shortAnswerDensity: 0,
    } satisfies import('./confidence').ConfidenceSignals;
    assert.equal(calculateConfidenceScore(signals), 50); // netral karena tidak ada signals
  });
});
