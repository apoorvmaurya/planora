import { describe, it, expect, beforeEach } from 'vitest'
import { getPlanAccess } from '@/lib/security/access'
import { createMockSupabaseClient } from '@/lib/testing/supabaseMock'

describe('Security Access Control (getPlanAccess)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      plans: [
        {
          id: 'plan-with-group',
          title: 'Kyoto Tour',
          created_by: 'creator-user',
          group_id: 'group-alpha',
        },
        {
          id: 'solo-plan',
          title: 'Solo Exploration',
          created_by: 'solo-traveler',
          group_id: null,
        },
      ],
      group_members: [
        {
          group_id: 'group-alpha',
          user_id: 'group-admin-user',
          role: 'admin',
        },
        {
          group_id: 'group-alpha',
          user_id: 'group-regular-member',
          role: 'member',
        },
      ],
    })
  })

  it('returns unauthorized when plan is not found', async () => {
    const access = await getPlanAccess(mockSupabase, 'non-existent-plan', 'any-user')
    expect(access.isAuthorized).toBe(false)
    expect(access.isAdmin).toBe(false)
    expect(access.plan).toBeNull()
  })

  it('authorizes plan creator with admin privileges', async () => {
    const access = await getPlanAccess(mockSupabase, 'plan-with-group', 'creator-user')
    expect(access.isAuthorized).toBe(true)
    expect(access.isAdmin).toBe(true)
    expect(access.plan).not.toBeNull()
    expect(access.plan.title).toBe('Kyoto Tour')
  })

  it('authorizes group admin with admin privileges', async () => {
    const access = await getPlanAccess(mockSupabase, 'plan-with-group', 'group-admin-user')
    expect(access.isAuthorized).toBe(true)
    expect(access.isAdmin).toBe(true)
  })

  it('authorizes group regular member with read/write but non-admin privileges', async () => {
    const access = await getPlanAccess(mockSupabase, 'plan-with-group', 'group-regular-member')
    expect(access.isAuthorized).toBe(true)
    expect(access.isAdmin).toBe(false)
  })

  it('denies access to unrelated users not in the group', async () => {
    const access = await getPlanAccess(mockSupabase, 'plan-with-group', 'stranger-user')
    expect(access.isAuthorized).toBe(false)
    expect(access.isAdmin).toBe(false)
  })

  it('denies access to non-creators on solo plans', async () => {
    const access = await getPlanAccess(mockSupabase, 'solo-plan', 'stranger-user')
    expect(access.isAuthorized).toBe(false)
    expect(access.isAdmin).toBe(false)
  })

  it('allows creator on solo plans', async () => {
    const access = await getPlanAccess(mockSupabase, 'solo-plan', 'solo-traveler')
    expect(access.isAuthorized).toBe(true)
    expect(access.isAdmin).toBe(true)
  })
})
