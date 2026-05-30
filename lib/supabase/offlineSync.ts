import Dexie, { type Table } from 'dexie';

export interface QueuedOp {
  id?: number;
  planId: string;
  action: 'VOTE' | 'CREATE_ITEM' | 'EDIT_ITEM' | 'DELETE_ITEM' | 'ADD_EXPENSE';
  payload: any;
  timestamp: number;
}

export interface PlanCache {
  id: string;
  data: any;
}

export interface ItemsCache {
  id: string;
  planId: string;
  data: any[];
}

export interface VotesCache {
  id: string;
  planId: string;
  data: any[];
}

export interface ExpensesCache {
  id: string;
  planId: string;
  data: any[];
}

class PlanoraOfflineDB extends Dexie {
  plans!: Table<PlanCache, string>;
  items!: Table<ItemsCache, string>;
  votes!: Table<VotesCache, string>;
  expenses!: Table<ExpensesCache, string>;
  syncQueue!: Table<QueuedOp, number>;

  constructor() {
    super('PlanoraOfflineDB');
    this.version(2).stores({
      plans: 'id',
      items: 'id, planId',
      votes: 'id, planId',
      expenses: 'id, planId',
      syncQueue: '++id, planId',
    });
  }
}

export const offlineDB = new PlanoraOfflineDB();

/**
 * Queue an operation while offline
 */
export async function queueOfflineOp(planId: string, action: QueuedOp['action'], payload: any) {
  await offlineDB.syncQueue.add({
    planId,
    action,
    payload,
    timestamp: Date.now()
  });
}

/**
 * Synchronize any queued offline operations to the server
 */
export async function syncOfflineOps(planId: string, onSyncComplete: () => Promise<void>) {
  if (!navigator.onLine) return;

  const ops = await offlineDB.syncQueue.where('planId').equals(planId).toArray();
  if (ops.length === 0) return;

  // Process sequentially to preserve execution order
  for (const op of ops) {
    try {
      if (op.action === 'VOTE') {
        const { item_id, vote } = op.payload;
        const res = await fetch(`/api/plans/${planId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id, vote })
        });
        if (!res.ok) throw new Error("Sync VOTE request failed");
      } else if (op.action === 'CREATE_ITEM') {
        const res = await fetch(`/api/plans/${planId}/transit/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.payload)
        });
        if (!res.ok) throw new Error("Sync CREATE_ITEM request failed");
      } else if (op.action === 'EDIT_ITEM') {
        const { item_id, editData } = op.payload;
        const res = await fetch(`/api/plans/${planId}/items/${item_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editData)
        });
        if (!res.ok) throw new Error("Sync EDIT_ITEM request failed");
      } else if (op.action === 'DELETE_ITEM') {
        const { item_id } = op.payload;
        const res = await fetch(`/api/plans/${planId}/items/${item_id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error("Sync DELETE_ITEM request failed");
      } else if (op.action === 'ADD_EXPENSE') {
        const res = await fetch(`/api/plans/${planId}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.payload)
        });
        if (!res.ok) throw new Error("Sync ADD_EXPENSE request failed");
      }
      
      // Delete from local queue after successful sync
      if (op.id) {
        await offlineDB.syncQueue.delete(op.id);
      }
    } catch (err) {
      console.error("Failed to sync queued operation:", op, err);
      // Halt execution of remainder to avoid syncing out-of-order in case of network drops
      break;
    }
  }

  // Refetch official server state
  await onSyncComplete();
}
