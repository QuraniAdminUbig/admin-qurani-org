import { DashboardLayout } from "@/components/layouts/dashboard-layout"

export default function LanguagesPage() {
    return (
        <DashboardLayout>
            <div className="container mx-auto py-6 max-w-7xl animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Languages</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage languages supported by the system.
                        </p>
                    </div>
                </div>

                <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">🌐</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Languages Module</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
                        This module is under development. API integration will be added soon.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
