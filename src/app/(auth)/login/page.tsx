import { LoginForm } from "@/components/ui/auth-form/login-form"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { Suspense } from 'react';
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function LoginPage() {
    return (
        <div className="min-h-svh bg-gray-50 dark:bg-slate-950">
            <div className="flex flex-col p-6 md:p-10">
                <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-100px)]">
                    <div className="w-full">
                        <I18nProvider namespaces={["common"]}>
                            <Suspense fallback={<LoadingSpinner />}>
                                <LoginForm />
                            </Suspense>
                        </I18nProvider>
                    </div>
                </div>
            </div>
        </div>
    )
}
