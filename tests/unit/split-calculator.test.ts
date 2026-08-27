import { describe, it, expect } from 'vitest'
import {
  calculateRawSplits,
  calculateSimplifiedSplits,
  Expense,
  Member,
} from '@/lib/utils/splitCalculator'

describe('Expense Split & Settlement Calculator', () => {
  const members: Member[] = [
    { user_id: 'user-a', full_name: 'Alice', avatar_url: '' },
    { user_id: 'user-b', full_name: 'Bob', avatar_url: '' },
    { user_id: 'user-c', full_name: 'Charlie', avatar_url: '' },
  ]

  it('calculates equal splits correctly among members', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        plan_id: 'plan-1',
        paid_by: 'user-a',
        title: 'Group Dinner',
        amount: 90,
        split_type: 'equal',
        split_details: {},
      },
    ]

    const settlements = calculateRawSplits(expenses, members)
    // 90 split 3 ways = 30 each. Bob owes Alice 30, Charlie owes Alice 30.
    expect(settlements).toHaveLength(2)

    const bobToAlice = settlements.find((s) => s.from === 'user-b' && s.to === 'user-a')
    const charlieToAlice = settlements.find((s) => s.from === 'user-c' && s.to === 'user-a')

    expect(bobToAlice?.amount).toBeCloseTo(30)
    expect(charlieToAlice?.amount).toBeCloseTo(30)
  })

  it('nets bilateral debts between members correctly', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        plan_id: 'plan-1',
        paid_by: 'user-a',
        title: 'Taxi',
        amount: 60, // B owes A 30
        split_type: 'equal',
        split_details: {},
      },
      {
        id: 'exp-2',
        plan_id: 'plan-1',
        paid_by: 'user-b',
        title: 'Museum tickets for 2',
        amount: 20, // A owes B 10
        split_type: 'custom',
        split_details: { 'user-a': 10, 'user-b': 10 },
      },
    ]

    const twoMembers: Member[] = [
      { user_id: 'user-a', full_name: 'Alice', avatar_url: '' },
      { user_id: 'user-b', full_name: 'Bob', avatar_url: '' },
    ]

    const raw = calculateRawSplits(expenses, twoMembers)
    // B owed A 30, A owed B 10 -> Net: B owes A 20
    expect(raw).toHaveLength(1)
    expect(raw[0].from).toBe('user-b')
    expect(raw[0].to).toBe('user-a')
    expect(raw[0].amount).toBeCloseTo(20)
  })

  it('calculates optimal multi-party debt minimization', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        plan_id: 'plan-1',
        paid_by: 'user-a',
        title: 'Hotel',
        amount: 300, // 100 each
        split_type: 'equal',
        split_details: {},
      },
    ]

    const settlements = calculateSimplifiedSplits(expenses, members)
    // Total owed: Bob owes 100, Charlie owes 100, Alice receives 200
    const totalAliceReceives = settlements
      .filter((s) => s.to === 'user-a')
      .reduce((sum, s) => sum + s.amount, 0)

    expect(totalAliceReceives).toBeCloseTo(200)
  })
})
