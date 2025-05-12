import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aries Week",
  description: "Track, complete, and evolve your skills during Aries Week",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="description" content={metadata.description as string} />
        <style>
          {`
            @keyframes float {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
              100% { transform: translateY(0px); }
            }
            
            @keyframes bounce-slow {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-15px); }
            }
            
            .animate-float {
              animation: float 3s ease-in-out infinite;
            }
            
            .animate-bounce-slow {
              animation: bounce-slow 2s ease-in-out infinite;
            }
            
            .pixel-text {
              font-family: 'Courier New', monospace;
              letter-spacing: -0.5px;
              text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
            }
          `}
        </style>
        <link 
          rel="preload" 
          href="/fonts/PPEditorialNew-Italic.otf" 
          as="font" 
          type="font/otf" 
          crossOrigin="anonymous" 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-black text-white antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
