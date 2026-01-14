"use client"

import * as React from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useI18n } from "@/components/providers/i18n-provider"
import { LogOut } from "lucide-react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

interface BtnLogoutProps {
    showDialog: boolean
    setShowDialog: React.Dispatch<React.SetStateAction<boolean>>
    text?: string
    desc?: string
    handleEvent: (status: boolean, router?: AppRouterInstance) => Promise<void>
    router?: AppRouterInstance
}

export const BtnLogout = React.memo(function BtnLogout({ 
    showDialog, 
    setShowDialog, 
    text = "Sign Out", 
    desc = "", 
    handleEvent,
    router
}: BtnLogoutProps) {
    // Memoized handlers for better performance
    const handleCancel = React.useCallback(() => {
        handleEvent(false, router)
    }, [handleEvent, router])

    const handleContinue = React.useCallback(() => {
        localStorage.removeItem('autoNotificationDismissed')
        handleEvent(true, router)
    }, [handleEvent, router])

    const handleOpenChange = React.useCallback((open: boolean) => {
        setShowDialog(open)
    }, [setShowDialog])

  const { t } = useI18n()

    return (
        <AlertDialog open={showDialog} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="dark:bg-gray-800">
                <AlertDialogHeader>
                    <AlertDialogTitle>{text}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {desc}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-row">
                    <AlertDialogCancel className="cursor-pointer flex-1" onClick={handleCancel}>
                        {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleContinue} >
                        <LogOut />
                        {t('continue')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
})
