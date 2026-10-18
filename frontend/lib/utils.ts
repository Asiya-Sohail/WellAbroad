import { Idiqlat } from "next/font/google";

export { cn } from "cn"
export const idiqlat = Idiqlat({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ["inter"]
});

export const TOAST_ID = "wellabroad-error";