"use client"

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import QuraniSetting from '../_components/qurani-setting'
import { I18nProvider, useI18n } from '@/components/providers/i18n-provider'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function QuraniSettingProfilePage() {
  const { t } = useI18n()
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <DashboardLayout>
      <I18nProvider namespaces={["common", "profile", "verse_word_error"]}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">{t('common.loading', 'Loading...')}</p>
            </div>
          </div>
        }>
          <div className='space-y-4 w-full md:max-w-7xl mx-auto'>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBack}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-all duration-300"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t("profile.qurani.title", "Qurani Settings")}
              </h1>
            </div>
            <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
              <CardContent>
                  <QuraniSetting />
              </CardContent>
            </Card>
          </div>
        </Suspense>
      </I18nProvider>
    </DashboardLayout>
  )
}
