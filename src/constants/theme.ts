/**
 * ============================================================
 * TEMUIN DESIGN TOKENS (Sistem Token Desain Alami)
 * ============================================================
 * Mengikuti aturan desain-ui-natural:
 * - Warna utama bersumber dari logo TemuIn UMM (#0266B3)
 * - Netral hangat (kertas alami #FAF7F2, bukan slate-biru dingin)
 * - Tinta hangat (#1F2A2E, teks sekunder #6B6F68)
 * - Semantik: Sukses (#2F6B4F), Peringatan/Bahaya (#B4532A)
 * - Radius konsisten: 2 nilai (small: 8, medium: 14)
 * - Skala tipografi terstruktur: 12, 14, 16, 20, 28
 */

import "@/global.css";
import { Platform } from "react-native";

export const Colors = {
  light: {
    // Kanvas & Permukaan
    background: "#FAF7F2",
    surface: "#FFFFFF",
    surfaceMuted: "#F3EFEA",
    backgroundElement: "#F3EFEA",
    backgroundSelected: "#EAE4DC",

    // Garis & Pembatas (Hairline border tipis)
    border: "#E6E0D6",
    borderMuted: "#EFEBE4",

    // Tipografi Tinta Alami
    text: "#1F2A2E",
    textSecondary: "#6B6F68",
    textMuted: "#9A9E96",

    // Identitas Logo TemuIn UMM
    primary: "#0266B3",
    primaryHover: "#005291",
    primaryLight: "#E8F2FA",

    // Warna Semantik Fungsional
    danger: "#B4532A",
    dangerLight: "#FBEEEA",
    warning: "#C27803",
    warningLight: "#FEF6E9",
    success: "#2F6B4F",
    successLight: "#EBF4EF",
  },
  dark: {
    background: "#181C1D",
    surface: "#222728",
    surfaceMuted: "#2C3132",
    backgroundElement: "#2C3132",
    backgroundSelected: "#383E3F",

    border: "#3A4041",
    borderMuted: "#2E3334",

    text: "#F5F3EF",
    textSecondary: "#B2B5AF",
    textMuted: "#7F837E",

    primary: "#3B8FD9",
    primaryHover: "#2A7BC4",
    primaryLight: "#1B2C3C",

    danger: "#E06D44",
    dangerLight: "#3D251C",
    warning: "#E5A030",
    warningLight: "#3D2F18",
    success: "#4E9B73",
    successLight: "#1C3326",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const AppRadius = {
  small: 8,
  medium: 14,
  full: 9999,
} as const;

export const Typography = {
  size: {
    caption: 12,
    body: 14,
    subtitle: 16,
    title: 20,
    hero: 28,
  },
  lineHeight: {
    caption: 16,
    body: 20,
    subtitle: 22,
    title: 26,
    hero: 34,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
