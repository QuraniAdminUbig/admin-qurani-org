"use client";

import { login } from "./login";
import signup from "./register";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { getDictionaries, getStoredLocale } from "@/lib/i18n";

// Helper function untuk mendapatkan translated message di luar React context
async function getTranslatedMessage(key: string, fallback: string): Promise<string> {
  try {
    const locale = getStoredLocale();
    const dictionary = await getDictionaries(['common'], locale);
    
    // Navigate through nested object (e.g., "auth.admin_access_required")
    const keys = key.split('.');
    let value: unknown = dictionary;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    return typeof value === 'string' ? value : fallback;
  } catch {
    return fallback;
  }
}

export async function loginWithToast(formData: FormData) {
  const res = await login(formData);
  if (res.success) {
    toast.success("Login successful! Redirecting to dashboard...");
  } else {
    // Map specific error messages untuk internationalization
    let errorMessage = res.error;
    
    // Khusus untuk error admin access, gunakan dictionary
    if (res.error?.includes("Admin privileges required")) {
      errorMessage = await getTranslatedMessage("auth.admin_access_required", "Access denied");
    }
    
    toast.error(errorMessage);
  }
  return res;
}

export async function registerWithToast(formData: FormData) {
  const res = await signup(formData);
  // If we reach here, redirect was successful or no error occurredd
  if (res?.success) {
    toast.success("Registration successful!");
    toast.info("Please check your email to verify your account.");
  } else {
    toast.error(res?.error);
  }
}

// Validasi email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validasi password
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters",
    };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { isValid: false, message: "Password must contain letters" };
  }
  return { isValid: true };
}

// Validasi username
export function validateUsername(username: string): {
  isValid: boolean;
  message?: string;
} {
  if (username.length < 3) {
    return {
      isValid: false,
      message: "Username must be at least 3 characters",
    };
  }
  // Check for spaces
  if (username.includes(" ")) {
    return {
      isValid: false,
      message: "Username cannot contain spaces. Use underscore (_) instead",
    };
  }

  // Check for hyphens
  if (username.includes("-")) {
    return {
      isValid: false,
      message:
        "Username cannot contain hyphens (-). Use underscore (_) instead",
    };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      message: "Username may only contain letters, numbers, and underscores",
    };
  }
  return { isValid: true };
}

// Fungsi untuk mengecek ketersediaan username
export async function checkUsernameAvailability(username: string): Promise<{
  isAvailable: boolean;
  message?: string;
}> {
  try {
    // Validasi format username terlebih dahulu
    const validation = validateUsername(username);
    if (!validation.isValid) {
      return {
        isAvailable: false,
        message: validation.message,
      };
    }

    const supabase = createClient();

    // Cek di tabel user_profiles untuk username yang sudah ada
    const { data, error } = await supabase
      .from("user_profiles")
      .select("username")
      .ilike("username", `@${username.toLowerCase()}`)
      .limit(1);

    if (error) {
      return {
        isAvailable: false,
        message: "Error checking username availability",
      };
    }

    // Jika ada data berarti username sudah digunakan
    if (data && data.length > 0) {
      return {
        isAvailable: false,
        message: "Username is already taken",
      };
    }

    // Username tersedia
    return {
      isAvailable: true,
      message: "Username is available",
    };
  } catch {
    return {
      isAvailable: false,
      message: "Error checking username availability",
    };
  }
}
