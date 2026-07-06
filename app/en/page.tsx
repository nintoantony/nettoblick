import { Metadata } from 'next';
import BruttoNettoCalculator from '@/components/BruttoNettoCalculator';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export const metadata: Metadata = {
  title: 'German Gross-to-Net Calculator 2026 — Salary, Company Car, Pension',
  description:
    'Free German payroll calculator for 2026 with all tax classes, factor IV, child allowance, company car (ICE / Hybrid / EV) and occupational pension (bAV). Current BMF values, no cookies, no tracking.',
  alternates: {
    canonical: `${SITE_URL}/en`,
    languages: {
      'de-DE': SITE_URL,
      'en-US': `${SITE_URL}/en`,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['de_DE'],
    url: `${SITE_URL}/en`,
    title: 'German Gross-to-Net Calculator 2026',
    description:
      'Calculate your net salary in Germany for 2026 including company car, occupational pension, child allowance and Steuerklasse IV with factor.',
  },
};

export default function EnglishPage() {
  return <BruttoNettoCalculator />;
}
