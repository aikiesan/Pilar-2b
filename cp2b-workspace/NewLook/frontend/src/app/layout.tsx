import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('pilar2b-theme')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.classList.add(r);}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://cp2b.unicamp.br/pilar2b/#organization',
                  name: 'NIPE-UNICAMP',
                  url: 'https://cp2b.unicamp.br/pilar2b',
                  description:
                    'Interdisciplinary Center for Energy Planning at the University of Campinas',
                },
                {
                  '@type': 'WebApplication',
                  '@id': 'https://cp2b.unicamp.br/pilar2b/#webapp',
                  name: 'PILAR-2b',
                  url: 'https://cp2b.unicamp.br/pilar2b',
                  applicationCategory: 'UtilitiesApplication',
                  operatingSystem: 'All',
                  provider: {
                    '@type': 'Organization',
                    '@id': 'https://cp2b.unicamp.br/pilar2b/#organization',
                  },
                  inLanguage: [
                    { '@type': 'Language', name: 'English', alternateName: 'en' },
                    { '@type': 'Language', name: 'Portuguese', alternateName: 'pt-BR' },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased flex flex-col min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
