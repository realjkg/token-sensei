// Persona model (Ratio v2 Wave 2a). Ratio projects one set of engine numbers
// through different lenses per persona ("one source of truth, persona-projected"
// — see .obvious/obvious.md Positioning Tenets). This module owns the persona
// type, the React context, and the pure storage helpers that persist a chosen
// persona to localStorage. Management/Executive is the primary persona and the
// default surface — no selection is required to land on it.

import { createContext, useContext } from 'react';

export type Persona = 'executive' | 'technical' | 'procurement';

export const PERSONAS: readonly Persona[] = ['executive', 'technical', 'procurement'] as const;

// Executive-first: the default surface needs no persona selection (Wave 2 spec).
export const DEFAULT_PERSONA: Persona = 'executive';

// localStorage key the chosen persona is persisted under.
export const PERSONA_STORAGE_KEY = 'ratio_persona';

export function isPersona(value: unknown): value is Persona {
  return typeof value === 'string' && (PERSONAS as readonly string[]).includes(value);
}

// Minimal storage surface so these helpers are testable in Node without a DOM.
export interface PersonaStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Read the persisted persona, falling back to the executive default whenever the
// store is empty, holds an unknown value, or throws (e.g. storage disabled).
export function readStoredPersona(storage: PersonaStorage | null | undefined): Persona {
  if (!storage) return DEFAULT_PERSONA;
  try {
    const raw = storage.getItem(PERSONA_STORAGE_KEY);
    return isPersona(raw) ? raw : DEFAULT_PERSONA;
  } catch {
    return DEFAULT_PERSONA;
  }
}

// Persist a persona. Swallows storage errors (private mode, quota) because
// persistence is a convenience, never a correctness requirement.
export function writeStoredPersona(
  storage: PersonaStorage | null | undefined,
  persona: Persona,
): void {
  if (!storage) return;
  try {
    storage.setItem(PERSONA_STORAGE_KEY, persona);
  } catch {
    // Ignore — the in-memory persona state remains the source of truth.
  }
}

export interface PersonaContextValue {
  persona: Persona;
  setPersona: (persona: Persona) => void;
}

export const PersonaContext = createContext<PersonaContextValue | null>(null);

// Single hook for reading + setting the active persona. Throws if used outside
// the provider so the missing-wrapper bug surfaces loudly in development.
export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return ctx;
}

