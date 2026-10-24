import { useCallback, useMemo } from 'react'
import { newSyncable, touch } from '@/domain/merge'
import type { Syncable } from '@/domain/types'
import { today } from '@/lib/format'
import { useCollection } from '@/storage/useCollection'
import { monthlyCost, nextCharge, type Category, type Subscription, type SubscriptionsData } from './types'

const EMPTY: SubscriptionsData = { subscriptions: [] }

export type SubscriptionInput = Omit<Subscription, keyof Syncable | 'cancelledAt'>

export interface SubscriptionRow {
  subscription: Subscription
  monthly: number
  /** Empty for cancelled subscriptions */
  next: string
}

export interface CategoryTotal {
  category: Category
  monthly: number
  count: number
}

export function useSubscriptions() {
  const { data, loading, save } = useCollection('subscriptions', EMPTY)

  const derived = useMemo(() => {
    const all = (data?.subscriptions ?? []).filter((s) => !s.deleted)
    const toRow = (subscription: Subscription): SubscriptionRow => ({
      subscription,
      monthly: monthlyCost(subscription),
      next: subscription.cancelledAt ? '' : nextCharge(subscription),
    })
    const active = all
      .filter((s) => !s.cancelledAt)
      .map(toRow)
      .sort((a, b) => a.next.localeCompare(b.next) || a.subscription.name.localeCompare(b.subscription.name))
    const cancelled = all
      .filter((s) => s.cancelledAt)
      .map(toRow)
      .sort((a, b) => b.subscription.cancelledAt.localeCompare(a.subscription.cancelledAt))

    const byCategory = new Map<Category, CategoryTotal>()
    for (const row of active) {
      const category = row.subscription.category
      const total = byCategory.get(category) ?? { category, monthly: 0, count: 0 }
      total.monthly += row.monthly
      total.count += 1
      byCategory.set(category, total)
    }

    return {
      active,
      cancelled,
      monthlyTotal: active.reduce((sum, r) => sum + r.monthly, 0),
      categories: [...byCategory.values()].sort((a, b) => b.monthly - a.monthly),
      paymentMethods: [...new Set(all.map((s) => s.paymentMethod.trim()).filter(Boolean))].sort(),
    }
  }, [data])

  const saveSubscription = useCallback(
    (input: SubscriptionInput, existing?: Subscription) =>
      save({ subscriptions: [existing ? touch(existing, input) : { ...newSyncable(), ...input, cancelledAt: '' }] }),
    [save],
  )

  const cancelSubscription = useCallback(
    (subscription: Subscription) => save({ subscriptions: [touch(subscription, { cancelledAt: today() })] }),
    [save],
  )

  const reactivateSubscription = useCallback(
    (subscription: Subscription) => save({ subscriptions: [touch(subscription, { cancelledAt: '' })] }),
    [save],
  )

  const deleteSubscription = useCallback(
    (subscription: Subscription) => save({ subscriptions: [touch(subscription, { deleted: true })] }),
    [save],
  )

  return { loading, ...derived, saveSubscription, cancelSubscription, reactivateSubscription, deleteSubscription }
}

