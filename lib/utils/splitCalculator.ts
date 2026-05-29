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

export function calculateSimplifiedSplits(expenses: Expense[], members: Member[]): Settlement[] {
  // 1. Calculate the net balance of each user
  const netBalances: Record<string, number> = {};
  for (const m of members) {
    netBalances[m.user_id] = 0;
  }

  for (const expense of expenses) {
    const payer = expense.paid_by;
    if (netBalances[payer] === undefined) continue;

    if (expense.split_type === 'equal') {
      const activeMembers = members.length;
      const splitAmount = expense.amount / activeMembers;

      netBalances[payer] += expense.amount;
      for (const member of members) {
        netBalances[member.user_id] -= splitAmount;
      }
    } else if (expense.split_type === 'custom' && expense.split_details) {
      netBalances[payer] += expense.amount;
      for (const [userId, amount] of Object.entries(expense.split_details)) {
        const numAmount = Number(amount);
        if (netBalances[userId] !== undefined && numAmount > 0) {
          netBalances[userId] -= numAmount;
        }
      }
    }
  }

  // 2. Separate into debtors (net balance < 0) and creditors (net balance > 0)
  const debtors: { user_id: string; balance: number }[] = [];
  const creditors: { user_id: string; balance: number }[] = [];

  for (const [userId, balance] of Object.entries(netBalances)) {
    const rounded = Number(balance.toFixed(4));
    if (rounded < -0.01) {
      debtors.push({ user_id: userId, balance: rounded });
    } else if (rounded > 0.01) {
      creditors.push({ user_id: userId, balance: rounded });
    }
  }

  // 3. Settle debts greedily by matching largest debtor with largest creditor
  const settlements: Settlement[] = [];

  // Sort debtors ascending (largest debt first, i.e., most negative)
  // Sort creditors descending (largest credit first, i.e., most positive)
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const debtAmount = Math.abs(debtor.balance);
    const creditAmount = creditor.balance;

    const settledAmount = Math.min(debtAmount, creditAmount);

    if (settledAmount > 0.01) {
      settlements.push({
        from: debtor.user_id,
        to: creditor.user_id,
        amount: Number(settledAmount.toFixed(2))
      });
    }

    // Update balances
    debtor.balance += settledAmount;
    creditor.balance -= settledAmount;

    // Advance index if settled
    if (Math.abs(debtor.balance) < 0.01) {
      dIdx++;
    }
    if (Math.abs(creditor.balance) < 0.01) {
      cIdx++;
    }
  }

  return settlements.sort((a, b) => b.amount - a.amount);
}
