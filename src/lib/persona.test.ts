// Tests for the persona storage helpers (Ratio v2 Wave 2a). Pure logic only —
// no DOM — matching the repo's node-environment vitest style. Verifies the
// executive default, round-trip persistence, and resilience to unknown / broken
// storage values.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PERSONA,
  PERSONA_STORAGE_KEY,
  isPersona,
  readStoredPersona,
  writeStoredPersona,
  type Persona,
  type PersonaStorage,
} from './persona';

// Minimal in-memory localStorage stand-in.
function memoryStorage(initial: Record<string, string> = {}): PersonaStorage & {
  store: Record<string, string>;
} {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value;
    },
  };
}

describe('persona storage helpers', () => {
  it('defaults to executive (the primary, no-selection surface)', () => {
    expect(DEFAULT_PERSONA).toBe('executive');
  });

  it('returns the executive default when storage is empty', () => {
    expect(readStoredPersona(memoryStorage())).toBe('executive');
  });

  it('returns the executive default when no storage is available (SSR)', () => {
    expect(readStoredPersona(null)).toBe('executive');
    expect(readStoredPersona(undefined)).toBe('executive');
  });

  it('persists and reads back each persona', () => {
    const personas: Persona[] = ['executive', 'technical', 'procurement'];
    for (const persona of personas) {
      const storage = memoryStorage();
      writeStoredPersona(storage, persona);
      expect(storage.store[PERSONA_STORAGE_KEY]).toBe(persona);
      expect(readStoredPersona(storage)).toBe(persona);
    }
  });

  it('falls back to the default for an unknown stored value', () => {
    const storage = memoryStorage({ [PERSONA_STORAGE_KEY]: 'ceo' });
    expect(readStoredPersona(storage)).toBe('executive');
  });

  it('survives a throwing storage without crashing', () => {
    const broken: PersonaStorage = {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(readStoredPersona(broken)).toBe('executive');
    expect(() => writeStoredPersona(broken, 'technical')).not.toThrow();
  });

  it('isPersona guards unknown values', () => {
    expect(isPersona('executive')).toBe(true);
    expect(isPersona('technical')).toBe(true);
    expect(isPersona('procurement')).toBe(true);
    expect(isPersona('cfo')).toBe(false);
    expect(isPersona(null)).toBe(false);
    expect(isPersona(42)).toBe(false);
  });
});

