export type Expense = {
  id: string;
  plan_id: string;
  paid_by: string;
  title: string;
  amount: number;
  split_type: 'equal' | 'custom';
  split_details: any;
};

export type Member = {
  user_id: string;
  full_name: string;
  avatar_url: string;
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export function calculateRawSplits(expenses: Expense[], members: Member[]): Settlement[] {
  // balances[A][B] means A owes B this amount
  const balances: Record<string, Record<string, number>> = {};

  // Initialize matrix
  for (const m1 of members) {
    balances[m1.user_id] = {};
    for (const m2 of members) {
      balances[m1.user_id][m2.user_id] = 0;
    }
  }

  for (const expense of expenses) {
    const payer = expense.paid_by;
    if (!balances[payer]) continue; // Payer might have left group, ignore or handle edge case

    if (expense.split_type === 'equal') {
      const activeMembers = members.length;
      const splitAmount = expense.amount / activeMembers;

      for (const member of members) {
        if (member.user_id !== payer) {
          balances[member.user_id][payer] += splitAmount;
        }
      }
    } else if (expense.split_type === 'custom' && expense.split_details) {
      for (const [userId, amount] of Object.entries(expense.split_details)) {
        const numAmount = Number(amount);
        if (userId !== payer && balances[userId] && numAmount > 0) {
          balances[userId][payer] += numAmount;
        }
      }
    }
  }

  // Net the balances between each pair
  const settlements: Settlement[] = [];
  const processed = new Set<string>();

  for (const m1 of members) {
    for (const m2 of members) {
      if (m1.user_id === m2.user_id) continue;
      
      const pairKey1 = `${m1.user_id}-${m2.user_id}`;
      const pairKey2 = `${m2.user_id}-${m1.user_id}`;

      if (processed.has(pairKey1) || processed.has(pairKey2)) continue;

      const m1OwesM2 = balances[m1.user_id][m2.user_id];
      const m2OwesM1 = balances[m2.user_id][m1.user_id];

      const net = m1OwesM2 - m2OwesM1;

      if (net > 0.01) {
        settlements.push({ from: m1.user_id, to: m2.user_id, amount: Number(net.toFixed(2)) });
      } else if (net < -0.01) {
        settlements.push({ from: m2.user_id, to: m1.user_id, amount: Number(Math.abs(net).toFixed(2)) });
      }

      processed.add(pairKey1);
      processed.add(pairKey2);
    }
  }

  // Filter out any tiny precision artifacts
  return settlements.filter(s => s.amount > 0.01).sort((a, b) => b.amount - a.amount);
}
