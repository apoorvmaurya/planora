/**
 * Lightweight in-memory Supabase mock client for testing.
 * Supports chainable queries (.from().select().eq().order().single().insert().update().delete())
 * and mock auth states without hitting network services.
 */

export interface MockUser {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}

export class MockQueryBuilder {
  private tableName: string
  private store: Map<string, any[]>
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private selectFields: string = '*'
  private filters: Array<(row: any) => boolean> = []
  private sortField: string | null = null
  private sortAscending: boolean = true
  private limitCount: number | null = null
  private isSingle: boolean = false
  private countMode: 'exact' | null = null
  private payload: any = null

  constructor(tableName: string, store: Map<string, any[]>) {
    this.tableName = tableName
    this.store = store
    if (!this.store.has(tableName)) {
      this.store.set(tableName, [])
    }
  }

  select(fields = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.operation = 'select'
    this.selectFields = fields
    if (options?.count) {
      this.countMode = options.count
    }
    return this
  }

  insert(values: any | any[]) {
    this.operation = 'insert'
    this.payload = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: any) {
    this.operation = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value)
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  lt(column: string, value: any) {
    this.filters.push((row) => row[column] < value)
    return this
  }

  lte(column: string, value: any) {
    this.filters.push((row) => row[column] <= value)
    return this
  }

  gt(column: string, value: any) {
    this.filters.push((row) => row[column] > value)
    return this
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value)
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortField = column
    this.sortAscending = options?.ascending ?? true
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const table = this.store.get(this.tableName) || []
      let resultData: any = null
      let resultCount: number | null = null

      if (this.operation === 'insert') {
        const inserted = this.payload.map((item: any) => ({
          id: item.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }))
        table.push(...inserted)
        resultData = this.isSingle ? inserted[0] : inserted
      } else if (this.operation === 'update') {
        const matchingIndices: number[] = []
        table.forEach((row, index) => {
          if (this.filters.every((f) => f(row))) {
            matchingIndices.push(index)
          }
        })
        matchingIndices.forEach((i) => {
          table[i] = { ...table[i], ...this.payload }
        })
        resultData = matchingIndices.map((i) => table[i])
        if (this.isSingle) resultData = resultData[0] || null
      } else if (this.operation === 'delete') {
        const remaining: any[] = []
        const deleted: any[] = []
        table.forEach((row) => {
          if (this.filters.every((f) => f(row))) {
            deleted.push(row)
          } else {
            remaining.push(row)
          }
        })
        this.store.set(this.tableName, remaining)
        resultData = this.isSingle ? deleted[0] || null : deleted
      } else {
        // SELECT
        let matching = table.filter((row) => this.filters.every((f) => f(row)))

        if (this.sortField) {
          matching.sort((a, b) => {
            const valA = a[this.sortField!]
            const valB = b[this.sortField!]
            if (valA < valB) return this.sortAscending ? -1 : 1
            if (valA > valB) return this.sortAscending ? 1 : -1
            return 0
          })
        }

        if (this.limitCount !== null) {
          matching = matching.slice(0, this.limitCount)
        }

        if (this.countMode === 'exact') {
          resultCount = matching.length
        }

        resultData = this.isSingle ? (matching.length > 0 ? matching[0] : null) : matching
      }

      const res = {
        data: resultData,
        error: null,
        count: resultCount,
      }

      return onfulfilled ? (onfulfilled(res) as any) : (res as any)
    } catch (err: any) {
      if (onrejected) return onrejected(err)
      return { data: null, error: err, count: null } as any
    }
  }
}

export class MockSupabaseClient {
  private store: Map<string, any[]>
  public currentUser: MockUser | null = { id: 'mock-user-1', email: 'test@planora.app' }

  constructor(initialData: Record<string, any[]> = {}) {
    this.store = new Map()
    for (const [table, rows] of Object.entries(initialData)) {
      this.store.set(table, JSON.parse(JSON.stringify(rows)))
    }
  }

  from(table: string) {
    return new MockQueryBuilder(table, this.store)
  }

  get auth() {
    return {
      getUser: async () => ({
        data: { user: this.currentUser },
        error: this.currentUser ? null : { message: 'Not logged in' },
      }),
      getSession: async () => ({
        data: {
          session: this.currentUser
            ? {
                user: this.currentUser,
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token',
              }
            : null,
        },
        error: null,
      }),
      admin: {
        getUserById: async (id: string) => ({
          data: {
            user: { id, email: `${id}@example.com` },
          },
          error: null,
        }),
      },
    }
  }

  setTableData(table: string, rows: any[]) {
    this.store.set(table, JSON.parse(JSON.stringify(rows)))
  }

  getTableData(table: string): any[] {
    return this.store.get(table) || []
  }

  clearAllData() {
    this.store.clear()
  }
}

export function createMockSupabaseClient(initialData: Record<string, any[]> = {}) {
  return new MockSupabaseClient(initialData)
}

export const defaultMockSupabase = createMockSupabaseClient({
  plans: [
    {
      id: 'test-plan-1',
      title: 'Trip to Tokyo',
      destination_name: 'Tokyo, Japan',
      created_by: 'mock-user-1',
      group_id: 'group-1',
      start_date: '2026-09-01',
      end_date: '2026-09-07',
      currency: 'JPY',
      status: 'confirmed',
    },
  ],
  group_members: [
    {
      group_id: 'group-1',
      user_id: 'mock-user-1',
      role: 'admin',
    },
    {
      group_id: 'group-1',
      user_id: 'mock-user-2',
      role: 'member',
    },
  ],
  itinerary_items: [],
  member_votes: [],
})
