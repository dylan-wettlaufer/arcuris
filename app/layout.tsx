import type { Metadata } from "next";
import { DM_Sans, Fira_Code, Lora } from "next/font/google";
import "./index.css";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif"
});

const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Arcuris",
  description:
    "Generate tailored resumes and automatically track job applications."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
