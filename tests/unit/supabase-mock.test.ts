import { describe, it, expect, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '@/lib/testing/supabaseMock'

describe('Supabase In-Memory Mock Client', () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    supabase = createMockSupabaseClient({
      cities: [
        { id: '1', name: 'Tokyo', country: 'Japan', population: 14000000 },
        { id: '2', name: 'Kyoto', country: 'Japan', population: 1460000 },
        { id: '3', name: 'Paris', country: 'France', population: 2160000 },
      ],
    })
  })

  it('selects all rows without filters', async () => {
    const { data, error } = await supabase.from('cities').select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(3)
  })

  it('filters rows with eq and single()', async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('name', 'Tokyo')
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data.country).toBe('Japan')
    expect(data.population).toBe(14000000)
  })

  it('filters rows with in, lt, and gt operators', async () => {
    const { data } = await supabase
      .from('cities')
      .select('*')
      .in('country', ['Japan', 'France'])
      .gt('population', 2000000)

    expect(data).toHaveLength(2)
    const names = data.map((c: any) => c.name)
    expect(names).toContain('Tokyo')
    expect(names).toContain('Paris')
  })

  it('inserts new rows with auto-generated IDs', async () => {
    const { data, error } = await supabase
      .from('cities')
      .insert({ name: 'Osaka', country: 'Japan', population: 2700000 })
      .single()

    expect(error).toBeNull()
    expect(data.id).toBeDefined()
    expect(data.name).toBe('Osaka')

    const allCities = supabase.getTableData('cities')
    expect(allCities).toHaveLength(4)
  })

  it('updates matching rows', async () => {
    const { data } = await supabase
      .from('cities')
      .update({ population: 15000000 })
      .eq('name', 'Tokyo')
      .single()

    expect(data.population).toBe(15000000)

    const { data: verified } = await supabase
      .from('cities')
      .select('*')
      .eq('name', 'Tokyo')
      .single()

    expect(verified.population).toBe(15000000)
  })

  it('deletes matching rows', async () => {
    await supabase.from('cities').delete().eq('name', 'Paris')

    const { data } = await supabase.from('cities').select('*')
    expect(data).toHaveLength(2)
    expect(data.some((c: any) => c.name === 'Paris')).toBe(false)
  })

  it('provides mock auth session and user', async () => {
    const { data: userData } = await supabase.auth.getUser()
    expect(userData.user).not.toBeNull()
    expect(userData.user?.id).toBe('mock-user-1')

    const { data: sessionData } = await supabase.auth.getSession()
    expect(sessionData.session?.access_token).toBe('mock-token')
  })
})
