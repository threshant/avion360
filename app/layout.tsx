import HydrationLoaderRemover from "@/components/HydrationLoaderRemover";
import AppSWRProvider from "@/components/providers/AppSWRProvider";
import { AuthProvider } from "@/lib/auth-context";
import { checkDatabaseConnection } from "@/lib/db-health";
import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avion360",
  description: "Production-ready Avion360 CRM starter",
};

// Check database connection on server startup (only in development)
if (process.env.NODE_ENV === "development") {
  checkDatabaseConnection().catch(console.error);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <style>{`
          @keyframes loaderProgress {
            0% { width: 0%; }
            50% { width: 60%; }
            100% { width: 100%; }
          }
          #initial-loader-bar {
            animation: loaderProgress 1800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }

          /* ensure loader card sits above background */
          #initial-loader > div { position: relative; z-index: 2; }
        `}</style>
        {/* Server-rendered initial loader (visible before hydration) */}
        <div
          id="initial-loader"
          data-start={Date.now()}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F6F6F4",
            zIndex: 9999,
            padding: 24,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "min(1100px,96%)", maxWidth: 1100 }}>
              <div
                style={{
                  borderRadius: 16,
                  padding: 28,
                  background: "rgba(255,255,255,0.9)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        margin: 0,
                        color: "#0f172a",
                      }}
                    >
                      Avion360
                    </h2>
                    <p
                      style={{
                        marginTop: 6,
                        color: "#64748b",
                        marginBottom: 0,
                      }}
                    >
                      Setting up your workspace — getting things ready for you
                    </p>
                  </div>

                  <div
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        background: "linear-gradient(135deg,#FF6B4A,#e55a39)",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderRadius: 12,
                          padding: 12,
                          background: "linear-gradient(180deg,#ffffff,#f7fbff)",
                        }}
                      >
                        <div
                          style={{
                            height: 12,
                            width: "70%",
                            borderRadius: 6,
                            background: "#eef2ff",
                          }}
                        />
                        <div
                          style={{
                            marginTop: 10,
                            height: 8,
                            width: "40%",
                            borderRadius: 6,
                            background: "#eef2ff",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 22,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 12,
                        borderRadius: 999,
                        background: "#e6eefc",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        id="initial-loader-bar"
                        style={{
                          height: "100%",
                          background: "linear-gradient(90deg,#FF6B4A,#e55a39)",
                          transformOrigin: "left",
                        }}
                      />
                    </div>
                    <div
                      style={{ minWidth: 110, color: "#475569", fontSize: 13 }}
                    >
                      Loading modules…
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AppSWRProvider>
          <AuthProvider>{children}</AuthProvider>
        </AppSWRProvider>
        <HydrationLoaderRemover />
      </body>
    </html>
  );
}
