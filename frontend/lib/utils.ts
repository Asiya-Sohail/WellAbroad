import { Idiqlat } from "next/font/google";

export { cn } from "cn"
export const idiqlat = Idiqlat({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ["inter"]
});