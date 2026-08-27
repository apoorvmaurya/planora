import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import { defaultMockSupabase } from './lib/testing/supabaseMock'

// Mock Supabase browser and server clients to prevent any real network requests during tests
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => defaultMockSupabase,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => defaultMockSupabase,
}))
