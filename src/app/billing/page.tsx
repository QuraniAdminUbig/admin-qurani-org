"use client"

import { useState } from "react"
import { CheckCircle2, CreditCard } from "lucide-react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider, useI18n } from "@/components/providers/i18n-provider"

type BillingPeriod = "monthly" | "half-yearly" | "yearly"

type Plan = {
  id: string
  name: string
  price: string
  oldPrice?: string
  badge?: string
  periodLabel: string
  features: string[]
}

type TransactionStatus = "paid" | "pending"

type Transaction = {
  id: string
  orderId: string
  date: string
  packageName: string
  price: string
  discount: string
  quantity: string
  total: string
  status: TransactionStatus
}

function BillingContent() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<BillingPeriod>("monthly")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const plansByPeriod: Record<BillingPeriod, Plan[]> = {
    monthly: [
      {
        id: "basic",
        name: t("billing.plans.basic.name", "Basic"),
        price: "Rp 99.000",
        oldPrice: "Rp 199.000",
        badge: t("billing.plans.badges.save_50", "Save 50%"),
        periodLabel: t("billing.period_label.month", "per month"),
        features: [
          t("billing.plans.basic.features.0", "10,000 AI Responses"),
          t("billing.plans.basic.features.1", "2,000 Monthly Active Users"),
          t("billing.plans.basic.features.2", "3 Human Agents"),
          t("billing.plans.basic.features.3", "1 WhatsApp & 1 Telegram"),
          t("billing.plans.basic.features.4", "Unlimited Qurani Groups"),
          t("billing.plans.basic.features.5", "Basic Dashboard & Reports")
        ]
      },
      {
        id: "pro",
        name: t("billing.plans.pro.name", "Pro"),
        price: "Rp 299.000",
        oldPrice: "Rp 599.000",
        badge: t("billing.plans.badges.save_50", "Save 50%"),
        periodLabel: t("billing.period_label.month", "per month"),
        features: [
          t("billing.plans.pro.features.0", "50,000 AI Responses"),
          t("billing.plans.pro.features.1", "10,000 Monthly Active Users"),
          t("billing.plans.pro.features.2", "7 Human Agents"),
          t("billing.plans.pro.features.3", "3 WhatsApp & 2 Telegram"),
          t("billing.plans.pro.features.4", "Priority Support"),
          t("billing.plans.pro.features.5", "Basic API Integrations")
        ]
      },
      {
        id: "expert",
        name: t("billing.plans.expert.name", "Expert"),
        price: "Rp 499.000",
        oldPrice: "Rp 899.000",
        badge: t("billing.plans.badges.best_value", "Best value"),
        periodLabel: t("billing.period_label.month", "per month"),
        features: [
          t("billing.plans.expert.features.0", "150,000 AI Responses"),
          t("billing.plans.expert.features.1", "30,000 Monthly Active Users"),
          t("billing.plans.expert.features.2", "15 Human Agents"),
          t("billing.plans.expert.features.3", "4 WhatsApp & 4 Telegram"),
          t("billing.plans.expert.features.4", "SLA & Priority Support"),
          t("billing.plans.expert.features.5", "Advanced API Integrations")
        ]
      }
    ],
    "half-yearly": [],
    yearly: []
  }

  const recentTransactions: Transaction[] = [
    {
      id: "1",
      orderId: "3YqaWe7p3N_vQKL_v1kL_8XAmRwd5g",
      date: "18 Nov 2025, 13:58:01",
      packageName: t("billing.transactions.expert_year", "Expert 1 Year"),
      price: "Rp 17.999.000",
      discount: "Rp 0",
      quantity: "1x",
      total: "Rp 17.999.000",
      status: "paid"
    },
    {
      id: "2",
      orderId: "3YqaWe7p3N_pending_123",
      date: "18 Nov 2025, 13:40:12",
      packageName: t("billing.transactions.pro_monthly", "Pro Monthly"),
      price: "Rp 999.000",
      discount: "Rp 0",
      quantity: "1x",
      total: "Rp 999.000",
      status: "pending"
    }
  ]

  const plans = plansByPeriod[period]
  const periodLabel = t(`billing.periods.${period}`, period)
  const statusLabel = (status: TransactionStatus) =>
    status === "paid"
      ? t("billing.status.paid", "Paid")
      : t("billing.status.pending", "Pending")

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 px-4 pt-4 pb-10 md:px-6 lg:px-8 bg-slate-50 min-h-screen">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {t("billing.title", "Billing")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("billing.subtitle", "Manage your Qurani plan, usage, and transaction history.")}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <span>{t("billing.credit_label", "Qurani Credit Balance")}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
              Rp 300.000
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("billing.summary.active_plan", "Active Plan")}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                {t("billing.summary.active_plan_value", "Expert 1 Year")}
              </span>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {t("billing.summary.active_plan_ends", "Ends {{date}}", { date: "09 September 2026" })}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("billing.summary.mau", "Monthly Active Users")}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold text-slate-900">129</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("billing.summary.of_quota", "of {{quota}} quota", { quota: "30,000" })}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("billing.summary.human_agents", "Human Agents")}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold text-slate-900">6</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("billing.summary.of_quota", "of {{quota}} quota", { quota: "15" })}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("billing.summary.ai_responses", "AI Responses")}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold text-slate-900">0</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("billing.summary.of_quota", "of {{quota}} quota", { quota: "150,000" })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full bg-white border shadow-sm p-1">
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                period === "monthly"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t("billing.periods.monthly", "Monthly")}
            </button>
            <button
              onClick={() => setPeriod("half-yearly")}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                period === "half-yearly"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t("billing.periods.half_yearly", "Half-Yearly")}
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                period === "yearly"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t("billing.periods.yearly", "Yearly")}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border bg-white shadow-sm p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    {plan.price}
                    <span className="ml-1 text-sm font-medium text-slate-500">
                      {plan.periodLabel}
                    </span>
                  </p>
                  {plan.oldPrice && (
                    <p className="text-xs text-slate-400 line-through mt-1">
                      {plan.oldPrice}
                    </p>
                  )}
                </div>
                {plan.badge && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {t("billing.plan_features", "Plan Features")}
                </p>
                <ul className="space-y-1.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-[2px] h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-sm font-medium py-2.5 px-4 hover:bg-slate-800 transition">
                {t("billing.buy_package", "Buy Package")}
              </button>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                {t("billing.no_plans_title", "No plans set for this period.")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t("billing.no_plans_desc", "Please contact admin to enable {{period}} plans.", { period: periodLabel })}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t("billing.recent.title", "Recent Transactions")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("billing.recent.subtitle", "Your Qurani plan payment history.")}
              </p>
            </div>
            <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
              {t("billing.recent.view_all", "View all")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">{t("billing.table.order_date", "Order Date")}</th>
                  <th className="px-4 py-2.5">{t("billing.table.order_id", "Order ID")}</th>
                  <th className="px-4 py-2.5">{t("billing.table.package_name", "Package Name")}</th>
                  <th className="px-4 py-2.5">{t("billing.table.price", "Price")}</th>
                  <th className="px-4 py-2.5">{t("billing.table.discount", "Discount")}</th>
                  <th className="px-4 py-2.5">{t("billing.table.quantity", "Qty")}</th>
                  <th className="px-4 py-2.5">{t("billing.table.total_price", "Total Price")}</th>
                  <th className="px-4 py-2.5">{t("billing.table.status", "Status")}</th>
                  <th className="px-4 py-2.5 text-right">{t("billing.table.action", "Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {tx.date}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {tx.orderId}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">
                      {tx.packageName}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {tx.price}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {tx.discount}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {tx.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">
                      {tx.total}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          tx.status === "paid"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {statusLabel(tx.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      <button
                        onClick={() => setSelectedTransaction(tx)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {t("billing.action.detail", "Detail")}
                      </button>
                    </td>
                  </tr>
                ))}

                {recentTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      {t("billing.empty_transactions", "No transactions yet.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  {t("billing.modal.title", "Transaction")}
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label={t("billing.modal.close", "Close")}
                >
                  X
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    {t("billing.modal.order_id", "Order ID")}
                  </span>
                  <span className="text-xs font-mono text-slate-700">
                    {selectedTransaction.orderId}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div>
                    <p className="font-medium text-slate-500">{t("billing.modal.order_date", "Order Date")}</p>
                    <p className="mt-0.5">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">{t("billing.modal.payment_date", "Payment Date")}</p>
                    <p className="mt-0.5">{selectedTransaction.date}</p>
                  </div>
                </div>

                <div className="mt-2 rounded-xl border bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">{t("billing.modal.product", "Product")}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedTransaction.packageName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("billing.modal.quantity", "Quantity: {{quantity}}", { quantity: selectedTransaction.quantity })}
                  </p>
                </div>

                <div className="space-y-1 pt-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{t("billing.modal.price", "Price")}</span>
                    <span>{selectedTransaction.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("billing.modal.discount", "Discount")}</span>
                    <span>{selectedTransaction.discount}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t pt-2 text-sm font-semibold text-slate-900">
                    <span>{t("billing.modal.total", "Total Price")}</span>
                    <span className="text-emerald-600">
                      {selectedTransaction.total}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t("billing.modal.close", "Close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function BillingPage() {
  return (
    <I18nProvider namespaces={["common", "billing"]}>
      <BillingContent />
    </I18nProvider>
  )
}
