import type { Metadata } from "next"
import { Public_Sans } from "next/font/google"
import "./globals.css"

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
})

export const metadata: Metadata = {
  title: "Challan Ledger",
  description:
    "Upload a challan Excel sheet to see each day's total, credit, debit and balance, and download the day as Excel.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
