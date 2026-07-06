import './globals.css';
import { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
const SITE_NAME = 'Brutto-Netto-Rechner 2026';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Brutto-Netto-Rechner 2026 — Gehalt, Dienstwagen, bAV genau berechnen',
    template: '%s · Brutto-Netto-Rechner 2026',
  },
  description:
    'Kostenloser Brutto-Netto-Rechner für 2026 mit allen Steuerklassen, Faktor IV, Kinderfreibetrag, Dienstwagen (Verbrenner / Hybrid / Elektro) und betrieblicher Altersvorsorge (bAV). Aktuelle BMF-Werte, keine Cookies, keine Tracking-Tools, datenschutzfreundlich.',
  keywords: [
    'Brutto Netto Rechner 2026',
    'Lohnsteuer Rechner 2026',
    'Gehaltsrechner 2026',
    'Dienstwagen Rechner',
    'Hybrid Dienstwagen 0,5%',
    'Elektroauto Dienstwagen 0,25%',
    'bAV Rechner',
    'Entgeltumwandlung berechnen',
    'Steuerklasse IV Faktor',
    'Kinderfreibetrag 2026',
    'Vorsorgepauschale 2026',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'de-DE': SITE_URL,
      'en-US': `${SITE_URL}/en`,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    alternateLocale: ['en_US'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Brutto-Netto-Rechner 2026 — präzise, transparent, datenschutzfreundlich',
    description:
      'Berechne dein Netto-Gehalt für 2026 inklusive Dienstwagen, bAV, Kinderfreibetrag und Steuerklasse IV mit Faktor. Mit Detail-Aufschlüsselung wie auf der Lohnabrechnung.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brutto-Netto-Rechner 2026',
    description:
      'Präzise Gehaltsberechnung für 2026 inklusive Dienstwagen, bAV und Faktorverfahren. Keine Cookies, kein Tracking.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Add Search Console verification tag here once you have it:
  // verification: { google: 'your-google-search-console-token' },
  category: 'finance',
};

// JSON-LD structured data — tells Google this is a calculator app
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Brutto-Netto-Rechner 2026',
  description:
    'Kostenloser Online-Rechner zur Berechnung des Netto-Gehalts in Deutschland für das Jahr 2026. Mit Unterstützung für Steuerklasse IV mit Faktor, Dienstwagen, betriebliche Altersvorsorge und Kinderfreibetrag.',
  url: SITE_URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any (Web Browser)',
  inLanguage: ['de-DE', 'en-US'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  featureList: [
    'Lohnsteuer 2026 nach § 32a EStG',
    'Alle 6 Steuerklassen',
    'Steuerklasse IV mit Faktor (§ 39f EStG)',
    'Kirchensteuer für alle 16 Bundesländer',
    'Solidaritätszuschlag mit Milderungszone',
    'Kranken-, Pflege-, Renten- und Arbeitslosenversicherung',
    'Dienstwagen: 1,0 % / 0,5 % / 0,25 %-Regelung',
    'Plug-in-Hybrid und Elektro-Fahrzeuge',
    'Betriebliche Altersvorsorge (Entgeltumwandlung)',
    'Kinderfreibetrag 2026',
    'GKV und PKV',
  ],
};

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Wie wird der geldwerte Vorteil bei einem Plug-in-Hybrid berechnet?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Für Plug-in-Hybride gilt seit 2025 die 0,5 %-Regelung — Voraussetzung: mindestens 80 km elektrische Reichweite oder CO₂-Ausstoß bis 50 g/km. Zusätzlich 0,015 % je Kilometer Arbeitsweg vom Bruttolistenpreis.',
      },
    },
    {
      '@type': 'Question',
      name: 'Was bedeutet Steuerklasse IV mit Faktor?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Bei Ehepaaren mit unterschiedlichem Einkommen kann das Finanzamt einen Faktor zwischen 0 und 1 eintragen. Dieser senkt die monatliche Lohnsteuer beider Partner so, dass der Splitting-Vorteil bereits im laufenden Lohnsteuerabzug berücksichtigt wird.',
      },
    },
    {
      '@type': 'Question',
      name: 'Bis zu welchem Betrag ist die bAV steuer- und sozialversicherungsfrei?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Eigenbeiträge zur betrieblichen Altersvorsorge sind 2026 steuerfrei bis 8 % der Beitragsbemessungsgrenze der Rentenversicherung (entspricht 676 €/Monat) und sozialversicherungsfrei bis 4 % (338 €/Monat).',
      },
    },
    {
      '@type': 'Question',
      name: 'Welche Daten werden bei der Berechnung gespeichert?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Keine. Alle Berechnungen laufen ausschließlich im Browser des Nutzers. Es werden keine personenbezogenen Daten an einen Server übertragen oder gespeichert. Die Seite verwendet keine Cookies und kein Tracking.',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
