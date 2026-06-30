import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/navbar/Navbar';
import { ChatBot } from '@/components/chatbot/ChatBot';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Community Hero | Pilot Deployment for Kolkata Municipal Corporation (KMC)',
  description: 'Report, verify, and track local community issues with AI-powered civic engagement. Pilot deployment for Kolkata Municipal Corporation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <ChatBot />
        </AuthProvider>
      </body>
    </html>
  );
}
