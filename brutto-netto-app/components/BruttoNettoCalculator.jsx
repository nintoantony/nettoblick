'use client';

import React, { useState, useMemo, useEffect } from 'react';

// =====================================================================
// German Brutto-Netto Calculator — 2026 (Lohnsteuer)
// =====================================================================
// Implements the official BMF tax formula (§32a EStG, Stand 2026)
// plus social insurance (KV, PV, RV, AV), Soli, Kirchensteuer,
// company car (1% / 0.5% / 0.25% rules) and bAV (Entgeltumwandlung).
// =====================================================================

// 2026 constants (verified from BMF / Bundesregierung / AOK Arbeitgeberservice)
const C = {
  // Income tax 2026 (§32a EStG)
  GRUNDFREIBETRAG: 12348,
  TARIF_2: 17799,     // end of progression zone 1
  TARIF_3: 69878,     // start of 42% zone
  TARIF_4: 277825,    // start of 45% (Reichensteuer)

  // Allowances
  ARBEITNEHMER_PAUSCHBETRAG: 1230, // Werbungskostenpauschale
  SONDERAUSGABEN_PAUSCHBETRAG: 36,

  // Vorsorgepauschale (simplified)
  RV_BEITRAG: 0.186,   // 18.6%
  RV_ABZUG_QUOTE: 1.0, // 100% deductible from 2023 onwards

  // Social insurance 2026
  KV_ALLGEMEIN: 0.146,           // 14.6%
  KV_ZUSATZ_DURCHSCHNITT: 0.029, // 2.9% (BMG, Stand Nov 2025)
  PV_BASIS: 0.036,               // 3.6%
  PV_KINDERLOS_ZUSCHLAG: 0.006,  // +0.6% if childless >23
  PV_KIND_ABSCHLAG: 0.0025,      // -0.25% per child (Kind 2-5)
  AV_BEITRAG: 0.026,             // 2.6%

  // Beitragsbemessungsgrenzen 2026 (monatlich)
  BBG_KV_PV_MONAT: 5812.50,
  BBG_RV_AV_MONAT: 8450.00,

  // Solidaritätszuschlag 2026
  SOLI_FREIGRENZE_LST_JAHR: 19950,   // Lohnsteuer-Freigrenze Soli (StKl I, näherungsweise)
  SOLI_FREIGRENZE_LST_JAHR_III: 39900, // verheiratet
  SOLI_SATZ: 0.055,
  SOLI_MILDERUNG_FAKTOR: 0.119,      // Milderungszone

  // Kirchensteuer
  KIST_BW_BY: 0.08, // Bayern, Baden-Württemberg
  KIST_ANDERE: 0.09,

  // bAV (§ 3 Nr. 63 EStG) — 2026
  BAV_STEUERFREI_PROZENT: 0.08, // 8% der BBG (West) RV
  BAV_SVFREI_PROZENT: 0.04,     // 4% der BBG RV svfrei

  // Kinderfreibetrag 2026 (§ 32 Abs. 6 EStG) — voller Betrag pro Kind
  // 6.828 € sächliches Existenzminimum + 2.928 € BEA = 9.756 €
  // Bei Zähler 0,5 (Standard pro Elternteil) → 4.878 € pro Kind
  KINDERFREIBETRAG_VOLL: 9756,
};

// Tax classes — basic logic (Lohnsteuer-Ermittlung)
const TAX_CLASSES = {
  I:   { de: 'I — Ledig / Geschieden',                en: 'I — Single / Divorced' },
  II:  { de: 'II — Alleinerziehend',                  en: 'II — Single parent' },
  III: { de: 'III — Verheiratet (höherverdienend)',   en: 'III — Married (higher earner)' },
  IV:  { de: 'IV — Verheiratet (gleichverdienend)',   en: 'IV — Married (equal earners)' },
  V:   { de: 'V — Verheiratet (geringerverdienend)',  en: 'V — Married (lower earner)' },
  VI:  { de: 'VI — Nebentätigkeit',                   en: 'VI — Secondary employment' },
};

const BUNDESLAENDER = [
  { code: 'BW', name: 'Baden-Württemberg', kist: 0.08 },
  { code: 'BY', name: 'Bayern', kist: 0.08 },
  { code: 'BE', name: 'Berlin', kist: 0.09 },
  { code: 'BB', name: 'Brandenburg', kist: 0.09 },
  { code: 'HB', name: 'Bremen', kist: 0.09 },
  { code: 'HH', name: 'Hamburg', kist: 0.09 },
  { code: 'HE', name: 'Hessen', kist: 0.09 },
  { code: 'MV', name: 'Mecklenburg-Vorpommern', kist: 0.09 },
  { code: 'NI', name: 'Niedersachsen', kist: 0.09 },
  { code: 'NW', name: 'Nordrhein-Westfalen', kist: 0.09 },
  { code: 'RP', name: 'Rheinland-Pfalz', kist: 0.09 },
  { code: 'SL', name: 'Saarland', kist: 0.09 },
  { code: 'SN', name: 'Sachsen', kist: 0.09 },
  { code: 'ST', name: 'Sachsen-Anhalt', kist: 0.09 },
  { code: 'SH', name: 'Schleswig-Holstein', kist: 0.09 },
  { code: 'TH', name: 'Thüringen', kist: 0.09 },
];

// =====================================================================
// Translations (DE / EN)
// =====================================================================
const I18N = {
  de: {
    // Header
    stamp: 'Stand 2026 · Bundesrepublik Deutschland',
    title: 'Brutto·Netto Rechner',
    subtitle: 'Lohnsteuer · Solidaritätszuschlag · Kirchensteuer · Sozialversicherung · Dienstwagen (Verbrenner / Hybrid / Elektro) · betriebliche Altersvorsorge',
    period: 'Veranlagungszeitraum',
    // Help
    howToUse: 'Bedienung',
    helpIntro: 'Trage deine Werte ein — alle Felder optional, leere Felder zählen als 0.',
    helpSteps: [
      'Grundgehalt: Brutto-Monatsgehalt (laut Vertrag).',
      'Bonus: laufende Sonderzahlungen wie Erfolgsprämie. Für Einmalzahlungen (Weihnachtsgeld) gilt die Fünftelregelung — die ist hier nicht abgebildet.',
      'Steuerklasse IV mit Faktor: nur eingeben, wenn auf deiner ELStAM ein Faktor steht. Sonst 1,000.',
      'Kinderfreibetrag-Zähler: aus deinem letzten Lohnzettel (ELStAM-Daten). 0,5 = halber Anspruch, 1,0 = ein ganzes Kind etc.',
      'Steuerfreibetrag: nur wenn du beim Finanzamt einen Antrag auf Lohnsteuerermäßigung gestellt hast (z.B. für hohe Pendlerpauschale).',
      'Dienstwagen BLP: Bruttolistenpreis bei Erstzulassung, inkl. Sonderausstattung, abgerundet auf volle 100 €.',
      'bAV: dein Eigenbeitrag zur Entgeltumwandlung (Lohn 891, 911 oder 914 auf der Abrechnung).',
    ],
    // Sections
    section1: 'Gehalt',
    section2: 'Persönliche Angaben',
    section3: 'Krankenversicherung',
    section4: 'Dienstwagen',
    section4Sub: '— Privatnutzung',
    section5: 'Betriebliche Altersvorsorge',
    section5Sub: '— Entgeltumwandlung',
    // Fields
    grundgehalt: 'Grundgehalt',
    period_label: 'Zeitraum',
    monthly: 'pro Monat',
    yearly: 'pro Jahr',
    bonus: 'Bonus / Sonderzahlung (€/Monat)',
    bonusHint: '— laufend, z.B. Erfolgsprämie, Schichtzulage',
    bonusHelp: 'Wird wie reguläres Gehalt versteuert (laufender Bezug). Einmalzahlungen wie Weihnachtsgeld nicht hier eintragen.',
    taxClass: 'Steuerklasse',
    faktorLabel: 'Faktor (StKl IV mit Faktor, § 39f EStG)',
    faktorHelp: 'Faktor < 1,000 = Splittingvorteil greift bereits im Lohnsteuerabzug. Steht auf deiner ELStAM bzw. Lohnabrechnung. 1,000 = ohne Faktor.',
    bundesland: 'Bundesland',
    age: 'Alter',
    kinder: 'Kinder (unter 25)',
    kinderHelp: 'Für PV-Beitragsabschlag ab Kind 2',
    kfbZaehler: 'Kinderfreibetrag-Zähler (ELStAM)',
    kfbHelp: 'Mindert Soli & Kirchensteuer (nicht die Lohnsteuer). Im monatlichen Lohnsteuerabzug wird die halbe Bemessung angesetzt — Vergleichsberechnung mit Kindergeld erfolgt erst bei der Veranlagung.',
    kfbOptNone: '0 — kein Eintrag',
    kfbOptHalf: '0,5 — ½ Kind',
    kfbOpt1: '1,0 — 1 Kind (voll)',
    kfbOpt15: '1,5 — 1½ Kinder',
    kfbOpt2: '2,0 — 2 Kinder (voll)',
    kfbOpt25: '2,5 — 2½ Kinder',
    kfbOpt3: '3,0 — 3 Kinder (voll)',
    kfbOpt4: '4,0 — 4 Kinder (voll)',
    freibetrag: 'Steuerfreibetrag (€/Jahr, ELStAM)',
    freibetragHelp: 'Eingetragener Jahresfreibetrag auf der ELStAM (z.B. für Werbungskosten über 1.230 €, Pendlerpauschale, doppelte Haushaltsführung). Steht oben auf deiner Lohnabrechnung.',
    kircheTitle: 'Kirchensteuerpflichtig',
    kircheOf: 'der Lohnsteuer',
    kvGkv: 'Gesetzlich (GKV)',
    kvPkv: 'Privat (PKV)',
    kvZusatz: 'Kassenindividueller Zusatzbeitrag (%)',
    kvZusatzHelp: 'Durchschnitt 2026: 2,9 %. Allgemeiner Beitragssatz 14,6 % paritätisch.',
    pkvBeitrag: 'PKV-Beitrag Arbeitnehmer (€/Monat)',
    pkvBeitragHelp: 'AG-Zuschuss max. 508,59 €/Monat (8,15 % der BBG). Hier Eigenanteil eintragen.',
    carType: 'Fahrzeugart',
    carCombustion: 'Verbrenner',
    carHybrid: 'Plug-in-Hybrid',
    carEvUnder: 'E-Auto ≤ 100k',
    carEvOver: 'E-Auto > 100k',
    carBlp: 'Bruttolistenpreis (€)',
    carKm: 'Entfernung zur Arbeit (km, einfach)',
    carRuleCombustion: 'Verbrenner / nicht förderfähiger Hybrid: 1,0 % + 0,03 % je km Arbeitsweg.',
    carRuleHybrid: 'Plug-in-Hybrid (Voraussetzung: ≥ 80 km el. Reichweite oder ≤ 50 g CO₂/km): 0,5 % + 0,015 % je km.',
    carRuleEvUnder: 'Reine Elektrofahrzeuge bis 100 000 € BLP: 0,25 % Fahrzeuganteil + 0,0075 % je km Arbeitsweg. Erstzulassung ab 01.07.2025.',
    carRuleEvOver: 'Reine Elektrofahrzeuge über 100 000 € BLP: 0,5 % Fahrzeuganteil + 0,015 % je km Arbeitsweg.',
    bavBetrag: 'Eigener Beitrag (€/Monat)',
    bavTaxFree: 'Steuerfrei bis',
    bavSvFree: 'SV-frei bis',
    bavTaxFreeNote: '8 % der BBG RV (§ 3 Nr. 63 EStG)',
    bavSvFreeNote: '4 % der BBG RV',
    bavPerMonth: '/Monat',
    // Output panel
    nettoPayout: 'Netto-Auszahlung',
    perMonth: '/ Monat',
    perYear: 'Jahr:',
    burdenRate: 'Abgabenquote:',
    breakdown: 'Aufschlüsselung',
    grossSalary: 'Grundgehalt',
    bonusLine: '+ Bonus / Sonderzahlung',
    gwvLine: '+ Geldwerter Vorteil (Dienstwagen)',
    gesamtBrutto: '= Gesamt-Brutto',
    bavLine: '− bAV-Eigenbeitrag (steuerfrei)',
    steuerBrutto: '= Steuer-/SV-Brutto',
    taxesHeader: 'Steuern',
    lohnsteuer: 'Lohnsteuer',
    soli: 'Solidaritätszuschlag',
    kist: 'Kirchensteuer',
    socialHeader: 'Sozialversicherung',
    kv: 'Krankenversicherung',
    pv: 'Pflegeversicherung',
    rv: 'Rentenversicherung',
    av: 'Arbeitslosenversicherung',
    otherDeductions: 'Weitere Abzüge',
    bavCashLine: 'bAV-Eigenbeitrag (vom Netto)',
    payout: 'Auszahlung',
    disclaimer: 'Hinweis',
    disclaimerText: 'Vereinfachte Berechnung nach dem Programmablaufplan der Lohnsteuer 2026 (§ 32a EStG). Ohne Gewähr — kein Ersatz für eine individuelle Beratung durch Steuerberater oder Lohnabrechnungssoftware. Einmalzahlungen, ELStAM-Faktorverfahren (StKl IV/IV mit Faktor) sowie Mehrjahresbetrachtung der Vorsorgepauschale werden vereinfacht abgebildet.',
    // About section
    aboutTitle: 'Über diese Berechnung',
    aboutText: 'Dieser Rechner setzt die offiziellen Werte und Formeln für 2026 um: Grundfreibetrag 12.348 €, Einkommensteuertarif nach § 32a EStG, Beitragsbemessungsgrenzen 5.812,50 € (KV/PV) bzw. 8.450 € (RV/AV) pro Monat, durchschnittlicher GKV-Zusatzbeitrag 2,9 %, AV 2,6 %, RV 18,6 %, KV 14,6 %, PV 3,6 %. Die Vorsorgepauschale folgt § 39b Abs. 2 EStG einschließlich des ab 2026 neuen AV-Teilbetrags. Kinderfreibetrag (9.756 € pro Kind) wirkt sich auf Solidaritätszuschlag und Kirchensteuer aus — beim monatlichen Lohnsteuerabzug wird hälftig angesetzt (Vergleichsberechnung mit Kindergeld erfolgt bei Veranlagung).',
    aboutPrivacy: 'Alle Berechnungen erfolgen ausschließlich im Browser. Es werden keine Daten übertragen, gespeichert oder ausgewertet. Keine Cookies, kein Tracking.',
    aboutOpenSource: 'Quellcode: ',
    // Footer / Impressum
    footerImpressum: 'Impressum',
    footerPrivacy: 'Datenschutz',
    footerClose: 'Schließen',
    impressumTitle: 'Impressum',
    impressumIntro: 'Angaben gemäß § 5 TMG',
    impressumOperatorLabel: 'Anbieter',
    impressumOperator: 'Ninto Antony\nWielandstraße 4\n73079 Süßen\nDeutschland',
    impressumContactLabel: 'Kontakt',
    impressumContact: 'E-Mail: ninto251987@gmail.com',
    impressumRespLabel: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
    impressumResp: 'Ninto Antony\nAnschrift wie oben',
    impressumDisputeLabel: 'Streitschlichtung',
    impressumDispute: 'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    impressumLiabilityLabel: 'Haftungsausschluss',
    impressumLiability: 'Die Inhalte dieser Seite wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Berechnungen wird jedoch keine Gewähr übernommen. Der Rechner ersetzt keine Beratung durch einen Steuerberater oder eine zertifizierte Lohnabrechnungssoftware.',
    privacyTitle: 'Datenschutzerklärung',
    privacyIntro: 'Diese Anwendung läuft vollständig in deinem Browser.',
    privacyData: 'Es werden keine personenbezogenen Daten an einen Server übertragen oder gespeichert. Alle Eingaben und Berechnungen bleiben lokal auf deinem Gerät. Beim Schließen des Browser-Tabs gehen die Eingaben verloren.',
    privacyCookies: 'Diese Seite verwendet keine Cookies, kein Tracking, keine Analyse-Tools und keine externen Schriftarten von Drittanbietern (Schriften werden lokal eingebunden).',
    privacyHosting: 'Hosting: Beim Aufrufen der Seite werden — wie bei jeder Webseite — technische Daten wie IP-Adresse, Datum/Uhrzeit, Browser und Betriebssystem vom Hosting-Provider in Server-Logs erfasst. Diese Daten werden ausschließlich zur technischen Bereitstellung der Seite verwendet und nach kurzer Frist gelöscht.',
    privacyContact: 'Verantwortlich im Sinne der DSGVO: siehe Impressum.',
  },
  en: {
    stamp: 'Tax year 2026 · Federal Republic of Germany',
    title: 'Gross·Net Calculator',
    subtitle: 'Income tax · Solidarity surcharge · Church tax · Social security · Company car (ICE / Hybrid / EV) · Occupational pension',
    period: 'Tax year',
    howToUse: 'How to use',
    helpIntro: 'Enter your values — all fields are optional, empty fields count as 0.',
    helpSteps: [
      'Gross salary: monthly gross from your contract.',
      'Bonus: recurring extras like performance bonuses. One-off payments (e.g. Christmas bonus) follow a different tax rule (Fünftelregelung) — not modelled here.',
      'Tax class IV with factor: only enter if your ELStAM shows a factor. Otherwise leave at 1.000.',
      'Child allowance counter: from your latest payslip (ELStAM data). 0.5 = half share, 1.0 = one full child, etc.',
      'Tax allowance: only if you applied for a Lohnsteuerermäßigung at the tax office (e.g. for high commute costs).',
      'Company car list price: gross list price at first registration, including factory options, rounded down to full €100.',
      'Occupational pension (bAV): your own salary-conversion contribution (line 891, 911 or 914 on the payslip).',
    ],
    section1: 'Salary',
    section2: 'Personal',
    section3: 'Health insurance',
    section4: 'Company car',
    section4Sub: '— private use',
    section5: 'Occupational pension',
    section5Sub: '— salary conversion',
    grundgehalt: 'Gross salary',
    period_label: 'Period',
    monthly: 'per month',
    yearly: 'per year',
    bonus: 'Bonus / extra (€/month)',
    bonusHint: '— recurring, e.g. performance bonus, shift premium',
    bonusHelp: 'Taxed like regular salary (recurring income). Do not enter one-off payments like Christmas bonus here.',
    taxClass: 'Tax class',
    faktorLabel: 'Factor (Class IV with factor, § 39f EStG)',
    faktorHelp: 'Factor < 1.000 = splitting advantage applied during monthly withholding. Shown on your ELStAM / payslip. 1.000 = no factor.',
    bundesland: 'Federal state',
    age: 'Age',
    kinder: 'Children (under 25)',
    kinderHelp: 'Used for the PV discount from child 2 onwards',
    kfbZaehler: 'Child allowance counter (ELStAM)',
    kfbHelp: 'Reduces Soli & church tax (not income tax). The monthly withholding only applies half the allowance — final reconciliation against Kindergeld happens at year-end.',
    kfbOptNone: '0 — none',
    kfbOptHalf: '0.5 — ½ child',
    kfbOpt1: '1.0 — 1 child (full)',
    kfbOpt15: '1.5 — 1½ children',
    kfbOpt2: '2.0 — 2 children (full)',
    kfbOpt25: '2.5 — 2½ children',
    kfbOpt3: '3.0 — 3 children (full)',
    kfbOpt4: '4.0 — 4 children (full)',
    freibetrag: 'Tax allowance (€/year, ELStAM)',
    freibetragHelp: 'Annual allowance entered on your ELStAM (e.g. for commuter expenses above €1,230, second household). Printed at the top of your payslip.',
    kircheTitle: 'Church tax member',
    kircheOf: 'of income tax',
    kvGkv: 'Statutory (GKV)',
    kvPkv: 'Private (PKV)',
    kvZusatz: 'Supplementary contribution rate (%)',
    kvZusatzHelp: 'Average for 2026: 2.9 %. General rate 14.6 % split 50/50.',
    pkvBeitrag: 'PKV employee contribution (€/month)',
    pkvBeitragHelp: 'Employer share capped at €508.59/month (8.15 % of contribution ceiling). Enter your share.',
    carType: 'Vehicle type',
    carCombustion: 'ICE (combustion)',
    carHybrid: 'Plug-in Hybrid',
    carEvUnder: 'EV ≤ 100k',
    carEvOver: 'EV > 100k',
    carBlp: 'Gross list price (€)',
    carKm: 'Commute distance (km, one way)',
    carRuleCombustion: 'ICE / non-eligible hybrid: 1.0 % + 0.03 % per commute km.',
    carRuleHybrid: 'Plug-in hybrid (requirement: ≥ 80 km electric range or ≤ 50 g CO₂/km): 0.5 % + 0.015 % per km.',
    carRuleEvUnder: 'Pure EV up to €100,000 list price: 0.25 % vehicle + 0.0075 % per commute km. First registration from 01.07.2025.',
    carRuleEvOver: 'Pure EV above €100,000 list price: 0.5 % vehicle + 0.015 % per commute km.',
    bavBetrag: 'Own contribution (€/month)',
    bavTaxFree: 'Tax-free up to',
    bavSvFree: 'SV-free up to',
    bavTaxFreeNote: '8 % of pension contribution ceiling (§ 3 Nr. 63 EStG)',
    bavSvFreeNote: '4 % of pension contribution ceiling',
    bavPerMonth: '/month',
    nettoPayout: 'Net payout',
    perMonth: '/ month',
    perYear: 'Year:',
    burdenRate: 'Tax + SS burden:',
    breakdown: 'Breakdown',
    grossSalary: 'Gross salary',
    bonusLine: '+ Bonus / extra',
    gwvLine: '+ Imputed benefit (company car)',
    gesamtBrutto: '= Total gross',
    bavLine: '− Occupational pension (tax-free)',
    steuerBrutto: '= Taxable / SV gross',
    taxesHeader: 'Taxes',
    lohnsteuer: 'Income tax',
    soli: 'Solidarity surcharge',
    kist: 'Church tax',
    socialHeader: 'Social security',
    kv: 'Health insurance',
    pv: 'Long-term care insurance',
    rv: 'Pension insurance',
    av: 'Unemployment insurance',
    otherDeductions: 'Other deductions',
    bavCashLine: 'Occupational pension (from net)',
    payout: 'Payout',
    disclaimer: 'Note',
    disclaimerText: 'Simplified calculation following the 2026 official payroll algorithm (PAP, § 32a EStG). Provided without warranty — not a substitute for advice from a tax advisor or certified payroll software. One-off payments, full ELStAM factor method (Class IV with factor) and multi-year aspects of the Vorsorgepauschale are simplified.',
    aboutTitle: 'About this calculation',
    aboutText: 'This calculator implements the official 2026 values and formulas: basic allowance €12,348, income tax curve per § 32a EStG, contribution ceilings €5,812.50 (health/care) and €8,450 (pension/unemployment) per month, average GKV supplementary contribution 2.9 %, UI 2.6 %, pension 18.6 %, health 14.6 %, care 3.6 %. The Vorsorgepauschale follows § 39b (2) EStG including the new 2026 unemployment-insurance component. The child allowance (€9,756 per child) reduces the solidarity surcharge and church tax — the monthly withholding only applies half (reconciliation against Kindergeld happens at year-end).',
    aboutPrivacy: 'All calculations run entirely in your browser. No data is sent, stored or analysed. No cookies, no tracking.',
    aboutOpenSource: 'Source code: ',
    // Footer / Impressum
    footerImpressum: 'Imprint',
    footerPrivacy: 'Privacy',
    footerClose: 'Close',
    impressumTitle: 'Imprint',
    impressumIntro: 'Information pursuant to § 5 TMG (German Telemedia Act)',
    impressumOperatorLabel: 'Operator',
    impressumOperator: 'Ninto Antony\nWielandstraße 4\n73079 Süßen\nGermany',
    impressumContactLabel: 'Contact',
    impressumContact: 'Email: ninto251987@gmail.com',
    impressumRespLabel: 'Responsible for content pursuant to § 18 (2) MStV',
    impressumResp: 'Ninto Antony\nAddress as above',
    impressumDisputeLabel: 'Dispute resolution',
    impressumDispute: 'The European Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr/. We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.',
    impressumLiabilityLabel: 'Disclaimer',
    impressumLiability: 'The content of this site has been prepared with the greatest care. However, no guarantee is given for the accuracy, completeness or timeliness of the calculations. This calculator does not replace advice from a tax advisor or certified payroll software.',
    privacyTitle: 'Privacy Policy',
    privacyIntro: 'This application runs entirely in your browser.',
    privacyData: 'No personal data is transmitted to or stored on a server. All inputs and calculations remain local to your device. When you close the browser tab, your inputs are lost.',
    privacyCookies: 'This site uses no cookies, no tracking, no analytics tools and no external fonts from third-party providers (fonts are bundled locally).',
    privacyHosting: 'Hosting: when you visit the site, your hosting provider — as with any website — records technical data such as IP address, date/time, browser and operating system in server logs. This data is used solely for the technical delivery of the site and is deleted after a short period.',
    privacyContact: 'Controller within the meaning of GDPR: see Imprint.',
  }
};

// =====================================================================
// Einkommensteuer 2026 nach § 32a EStG
// =====================================================================
function einkommensteuer2026(zvE) {
  const x = Math.floor(zvE);
  if (x <= C.GRUNDFREIBETRAG) return 0;
  if (x <= C.TARIF_2) {
    // Zone 2: progression
    const y = (x - C.GRUNDFREIBETRAG) / 10000;
    return (932.30 * y + 1400) * y;
  }
  if (x <= C.TARIF_3) {
    // Zone 3
    const z = (x - C.TARIF_2) / 10000;
    return (176.64 * z + 2397) * z + 1015.13;
  }
  if (x <= C.TARIF_4) {
    return 0.42 * x - 10911.92;
  }
  return 0.45 * x - 19246.67;
}

// Splittingtarif (StKl III oder IV mit Faktor — vereinfacht III)
function einkommensteuerSplitting(zvE) {
  return 2 * einkommensteuer2026(zvE / 2);
}

// =====================================================================
// Lohnsteuer — vereinfachte Jahres-Berechnung
// =====================================================================
function calcLohnsteuer(bruttoJahr, taxClass, kinderfreibetrag, kirche, vorsorgepauschale, faktor) {
  const useSplitting = taxClass === 'III';

  // Werbungskostenpauschbetrag + Sonderausgabenpauschbetrag
  let zvE = bruttoJahr
    - C.ARBEITNEHMER_PAUSCHBETRAG
    - C.SONDERAUSGABEN_PAUSCHBETRAG
    - vorsorgepauschale
    - (kinderfreibetrag || 0);

  if (zvE < 0) zvE = 0;

  let lst = useSplitting
    ? einkommensteuerSplitting(zvE)
    : einkommensteuer2026(zvE);

  // StKl V/VI — vereinfachte Erhöhung (näherungsweise)
  if (taxClass === 'V') {
    const zvEv = Math.max(0, bruttoJahr - C.ARBEITNEHMER_PAUSCHBETRAG - vorsorgepauschale);
    lst = Math.max(lst, einkommensteuer2026(zvEv) * 1.05);
  }
  if (taxClass === 'VI') {
    const zvE6 = Math.max(0, bruttoJahr - vorsorgepauschale);
    lst = einkommensteuer2026(zvE6);
  }
  if (taxClass === 'II') {
    // Entlastungsbetrag für Alleinerziehende: 4.260 € + ggf. weitere Kinder
    const zvE2 = Math.max(0, zvE - 4260);
    lst = einkommensteuer2026(zvE2);
  }

  // Faktor (StKl IV mit Faktor § 39f EStG) — Faktor < 1 mindert die individuelle LSt
  // Spiegelt den Splittingvorteil bereits im Lohnsteuerabzug wider
  if (taxClass === 'IV' && faktor && faktor > 0 && faktor < 1) {
    lst = lst * faktor;
  }

  return Math.max(0, Math.floor(lst));
}

// =====================================================================
// Solidaritätszuschlag 2026
// =====================================================================
function calcSoli(lohnsteuerJahr, taxClass) {
  const freigrenze = (taxClass === 'III') ? C.SOLI_FREIGRENZE_LST_JAHR_III : C.SOLI_FREIGRENZE_LST_JAHR;
  if (lohnsteuerJahr <= freigrenze) return 0;
  // Milderungszone
  const milderung = (lohnsteuerJahr - freigrenze) * C.SOLI_MILDERUNG_FAKTOR;
  const voll = lohnsteuerJahr * C.SOLI_SATZ;
  return Math.min(voll, milderung);
}

// =====================================================================
// Kirchensteuer
// =====================================================================
function calcKist(lohnsteuerJahr, kircheKist) {
  return lohnsteuerJahr * kircheKist;
}

// =====================================================================
// Geldwerter Vorteil — Dienstwagen
// =====================================================================
function calcGeldwerterVorteil(carInputs) {
  if (!carInputs.enabled) return 0;
  const { listenpreis, type, entfernungKm } = carInputs;
  if (!listenpreis || listenpreis <= 0) return 0;

  let satz = 0.01; // Verbrenner standard
  if (type === 'electric_under100k') satz = 0.0025;
  else if (type === 'electric_over100k') satz = 0.005;
  else if (type === 'hybrid') satz = 0.005;

  const fahrzeugAnteil = listenpreis * satz;

  let wegSatz = 0.0003;
  if (type === 'electric_under100k') wegSatz = 0.0000750;
  else if (type === 'electric_over100k' || type === 'hybrid') wegSatz = 0.000150;

  const wegAnteil = listenpreis * wegSatz * (entfernungKm || 0);

  return fahrzeugAnteil + wegAnteil;
}

// =====================================================================
// Sozialversicherung — Beiträge berechnen
// =====================================================================
function calcSocial(monatsBrutto, options) {
  const {
    kvType,           // 'GKV' | 'PKV'
    kvZusatz,         // Prozent
    pkvBeitrag,       // monatlich, fix
    pflegeKinder,     // Anzahl Kinder unter 25
    age,
    pkvPflegeBeitrag  // optional separat
  } = options;

  // BBG-cap
  const bemKvPv = Math.min(monatsBrutto, C.BBG_KV_PV_MONAT);
  const bemRvAv = Math.min(monatsBrutto, C.BBG_RV_AV_MONAT);

  // KV
  let kvBeitrag = 0;
  if (kvType === 'GKV') {
    const satz = C.KV_ALLGEMEIN / 2 + (kvZusatz / 100) / 2;
    kvBeitrag = bemKvPv * satz;
  } else {
    kvBeitrag = Math.min(pkvBeitrag || 0, bemKvPv * (C.KV_ALLGEMEIN / 2 + C.KV_ZUSATZ_DURCHSCHNITT / 2));
    // AG-Zuschuss ist gedeckelt; AN zahlt Rest. Vereinfachte Darstellung: PKV-Beitrag des Arbeitnehmers.
    kvBeitrag = pkvBeitrag || 0;
  }

  // PV — Beitragssatz hängt von Kinderzahl und Alter ab
  let pvSatz = C.PV_BASIS;
  if (pflegeKinder === 0 && age >= 23) {
    pvSatz = C.PV_BASIS + C.PV_KINDERLOS_ZUSCHLAG;
  } else if (pflegeKinder >= 2) {
    // Abschlag ab dem 2. Kind, max. 4 weitere (Kind 2,3,4,5)
    const kinderAbschlag = Math.min(pflegeKinder - 1, 4) * C.PV_KIND_ABSCHLAG;
    pvSatz = C.PV_BASIS - kinderAbschlag;
  }
  // AN-Anteil PV: außerhalb Sachsens paritätische Hälfte; der Kinderlosenzuschlag
  // wird komplett vom AN getragen (1,8% + 0,6% = 2,4% AN-Anteil bei kinderlos).
  // In Sachsen zahlt AN immer 0,5% mehr als hälftig.
  let pvAnSatz;
  if (pflegeKinder === 0 && age >= 23) {
    // Kinderlose: hälftige Aufteilung des Basissatzes + voller Zuschlag
    pvAnSatz = (C.PV_BASIS / 2) + C.PV_KINDERLOS_ZUSCHLAG;
  } else {
    // Mit Kindern: paritätische Hälfte des (ggf. reduzierten) Satzes
    pvAnSatz = pvSatz / 2;
  }
  const pvBeitrag = bemKvPv * pvAnSatz;

  // RV: 18,6 %, AN trägt die Hälfte
  const rvBeitrag = bemRvAv * (C.RV_BEITRAG / 2);

  // AV: 2,6 %, AN trägt die Hälfte
  const avBeitrag = bemRvAv * (C.AV_BEITRAG / 2);

  return {
    kv: kvBeitrag,
    pv: pvBeitrag,
    rv: rvBeitrag,
    av: avBeitrag,
    total: kvBeitrag + pvBeitrag + rvBeitrag + avBeitrag,
    bemKvPv,
    bemRvAv,
  };
}

// =====================================================================
// Vorsorgepauschale 2026 (§ 39b Abs. 2 EStG)
// Teilbeträge:
//   a) RV-Anteil: 9,3% AN-Anteil (100% ab 2023)
//   b) KV-Anteil: 7,0% ermäßigter Satz + halber kassenindiv. Zusatzbeitrag
//      (entspricht der Pauschale ohne Krankengeldanspruch — Standard im PAP)
//   c) PV-Anteil: 1,8% Grundsatz; PV-Zuschlag (+0,6%) für Kinderlose ≥23,
//      Abschläge für Kinder 2-5 (je -0,25%)
//   d) AV-Anteil (neu 2026): 1,3% AN-Anteil, ABER nur soweit Summe b)+c)+d)
//      ≤ 1.900 € (Höchstbetrag bei StKl I-V).
//      In der Praxis ist b)+c) bereits über 1.900 €, daher entfällt d) faktisch.
// =====================================================================
function calcVorsorgepauschale(bruttoJahr, kvType, kvZusatz, pkvBeitrag, kinderAnzahl, age) {
  // a) RV-Anteil
  const rvBemJahr = Math.min(bruttoJahr, C.BBG_RV_AV_MONAT * 12);
  const rvAnteil = rvBemJahr * (C.RV_BEITRAG / 2);

  // b) + c) KV/PV-Anteil
  const kvBemJahr = Math.min(bruttoJahr, C.BBG_KV_PV_MONAT * 12);
  let kvPvAnteil;
  if (kvType === 'GKV') {
    // KV-AN-Anteil: 7,0% ermäßigter Satz + halber Zusatzbeitrag
    const kvSatz = 0.070 + (kvZusatz / 100) / 2;
    // PV-AN-Anteil: 1,8% Basis + Zuschläge/Abschläge nach Kinderzahl
    let pvSatz = 0.018;
    if ((kinderAnzahl || 0) === 0 && (age || 0) >= 23) {
      pvSatz += 0.006; // Zuschlag für Kinderlose (voll auf AN-Seite)
    } else if (kinderAnzahl >= 2) {
      const abschlag = Math.min(kinderAnzahl - 1, 4) * 0.0025;
      pvSatz -= abschlag;
    }
    kvPvAnteil = kvBemJahr * (kvSatz + pvSatz);
  } else {
    // PKV: tatsächlicher AN-Beitrag (gedeckelt)
    const maxGkv = kvBemJahr * (0.070 + C.KV_ZUSATZ_DURCHSCHNITT / 2 + 0.018);
    kvPvAnteil = Math.min((pkvBeitrag || 0) * 12, maxGkv);
  }

  // d) AV-Anteil — nur soweit Summe (b+c+d) ≤ 1.900 € (StKl I-V Höchstbetrag)
  // In der Regel ist (b+c) bereits > 1.900 €, dann entfällt d).
  let avAnteil = 0;
  if (kvPvAnteil < 1900) {
    const avRaw = rvBemJahr * (C.AV_BEITRAG / 2);
    avAnteil = Math.min(avRaw, 1900 - kvPvAnteil);
  }

  return rvAnteil + kvPvAnteil + avAnteil;
}

// =====================================================================
// Main calculation
// =====================================================================
function calculate(inputs) {
  const {
    grundgehalt,
    bonusMonat,
    period,
    taxClass,
    bundesland,
    kirche,
    age,
    kfbZaehler,
    kinderAnzahl,
    freibetragJahr,
    faktor,
    kvType,
    kvZusatz,
    pkvBeitrag,
    car,
    bav,
  } = inputs;

  // Monatsbrutto = Grundgehalt + laufender Bonus (z.B. Erfolgsprämie, Schichtzulage)
  const grundMonat = period === 'jahr' ? grundgehalt / 12 : grundgehalt;
  let monatsBrutto = grundMonat + (bonusMonat || 0);

  // Geldwerter Vorteil (Dienstwagen)
  const gwv = calcGeldwerterVorteil(car);

  // bAV — Entgeltumwandlung (steuerfrei bis 8 % BBG RV, svfrei bis 4 % BBG RV)
  const bbgRvJahr = C.BBG_RV_AV_MONAT * 12;
  const bavMonat = bav.enabled ? Math.max(0, bav.betrag || 0) : 0;
  const bavJahr = bavMonat * 12;
  const bavSteuerfreiMax = bbgRvJahr * C.BAV_STEUERFREI_PROZENT;
  const bavSvfreiMax = bbgRvJahr * C.BAV_SVFREI_PROZENT;
  const bavSteuerfreiJahr = Math.min(bavJahr, bavSteuerfreiMax);
  const bavSvfreiJahr = Math.min(bavJahr, bavSvfreiMax);
  const bavSteuerfreiMonat = bavSteuerfreiJahr / 12;
  const bavSvfreiMonat = bavSvfreiJahr / 12;

  // Steuerpflichtiges Brutto: Grundgehalt + voller GWV − bAV(steuerfrei)
  const steuerBruttoMonat = monatsBrutto + gwv - bavSteuerfreiMonat;
  const svBruttoMonat = monatsBrutto + gwv - bavSvfreiMonat;

  // Sozialversicherung (auf SV-Brutto)
  const social = calcSocial(svBruttoMonat, {
    kvType,
    kvZusatz,
    pkvBeitrag,
    pflegeKinder: kinderAnzahl,
    age,
  });

  // Vorsorgepauschale fürs Steuermodell
  const vorsorgepauschale = calcVorsorgepauschale(steuerBruttoMonat * 12, kvType, kvZusatz, pkvBeitrag, kinderAnzahl, age);

  // Lohnsteuer (Jahresbasis) — Kinderfreibetrag wirkt NICHT auf reguläre LSt
  const steuerBruttoJahr = steuerBruttoMonat * 12;
  // ELStAM-Freibetrag (z.B. für Werbungskosten über 1.230 €, Pendlerpauschale)
  const freibetrag = Math.max(0, freibetragJahr || 0);
  const lstJahr = calcLohnsteuer(steuerBruttoJahr - freibetrag, taxClass, 0, kirche, vorsorgepauschale, faktor);
  const lstMonat = lstJahr / 12;

  // Fiktive Lohnsteuer für Zuschlagsteuern (Soli + KiSt)
  // Kinderfreibetrag mindert hier die Bemessungsgrundlage
  // Kinderfreibetrag für laufende Lohnsteuer:
  // Im monatlichen Lohnsteuerabzug wird nur die HÄLFTE des Kinderfreibetrags angesetzt,
  // da Kindergeld die andere Hälfte abdeckt (Vergleichsberechnung erfolgt erst bei Veranlagung).
  // Zähler 1,0 (1 Kind voll) → 4.878 € | Zähler 0,5 → 2.439 €
  const kfbBetrag = (kfbZaehler || 0) * (C.KINDERFREIBETRAG_VOLL / 2);
  const lstFiktivJahr = calcLohnsteuer(steuerBruttoJahr - freibetrag, taxClass, kfbBetrag, kirche, vorsorgepauschale, faktor);
  const lstFiktivMonat = lstFiktivJahr / 12;

  // Soli — auf fiktive LSt
  const soliJahr = calcSoli(lstFiktivJahr, taxClass);
  const soliMonat = soliJahr / 12;

  // Kirchensteuer — auf fiktive LSt
  const bl = BUNDESLAENDER.find(b => b.code === bundesland) || BUNDESLAENDER[0];
  const kistSatz = kirche ? bl.kist : 0;
  const kistMonat = lstFiktivMonat * kistSatz;

  // Netto-Berechnung
  // monatsBrutto ist bereits Cash (ohne GWV). Steuern/SV werden auf das Gesamt-Brutto
  // (= monatsBrutto + GWV − bavSteuerfrei) berechnet, aber GWV ist KEIN Cashfluss.
  // Daher: Netto = Cash-Brutto − Steuern − SV − bAV (kein zusätzlicher GWV-Abzug)
  const auszahlung =
    monatsBrutto
    - bavMonat
    - lstMonat
    - soliMonat
    - kistMonat
    - social.total;

  return {
    monatsBrutto,
    steuerBruttoMonat,
    svBruttoMonat,
    gwv,
    bavMonat,
    bavSteuerfreiMonat,
    bavSvfreiMonat,
    lstMonat,
    soliMonat,
    kistMonat,
    social,
    netto: auszahlung,
    nettoJahr: auszahlung * 12,
    steuerlastQuote: (lstMonat + soliMonat + kistMonat) / monatsBrutto,
    abgabenQuote: (lstMonat + soliMonat + kistMonat + social.total) / monatsBrutto,
    bl,
    kistSatz,
  };
}

// =====================================================================
// Component
// =====================================================================
const makeFmt = (lang) => {
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  const fmt = (n) => new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(n * 100) / 100);
  const fmtEur = (n) => lang === 'de' ? (fmt(n) + ' €') : ('€ ' + fmt(n));
  const fmtPct = (n) => new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
    style: 'percent',
  }).format(n);
  return { fmt, fmtEur, fmtPct };
};

// Legacy formatters (German) — kept for any non-component callers
const fmt = (n) => new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Math.round(n * 100) / 100);

const fmtEur = (n) => fmt(n) + ' €';
const fmtPct = (n) => new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  style: 'percent',
}).format(n);

export default function BruttoNettoCalculator() {
  // Always start with 'de' to match server-rendered HTML (prevents hydration mismatch).
  // After mount, we detect the browser language and update if needed.
  const [lang, setLang] = useState('de');

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const detected = navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
      if (detected !== 'de') setLang(detected);
    }
  }, []);

  const [showHelp, setShowHelp] = useState(false);
  const [modal, setModal] = useState(null); // 'impressum' | 'privacy' | null
  const t = I18N[lang];
  const { fmt: f, fmtEur: fEur, fmtPct: fPct } = makeFmt(lang);

  const [inputs, setInputs] = useState({
    grundgehalt: 3540,
    bonusMonat: 0,
    period: 'monat',
    taxClass: 'I',
    bundesland: 'BW',
    kirche: false,
    age: 35,
    kfbZaehler: 0,
    kinderAnzahl: 0,
    freibetragJahr: 0,
    faktor: 1.0,
    faktorRaw: null,
    kvType: 'GKV',
    kvZusatz: 2.9,
    pkvBeitrag: 600,
    car: {
      enabled: false,
      type: 'hybrid',
      listenpreis: 50000,
      entfernungKm: 20,
    },
    bav: {
      enabled: false,
      betrag: 200,
    },
  });

  const set = (key, value) => setInputs(prev => ({ ...prev, [key]: value }));
  const setNested = (root, key, value) => setInputs(prev => ({
    ...prev,
    [root]: { ...prev[root], [key]: value }
  }));

  const result = useMemo(() => calculate(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900" style={{ fontFamily: 'Söhne, "Helvetica Neue", system-ui, sans-serif' }}>

      {/* Header */}
      <header className="border-b border-stone-300 bg-gradient-to-b from-stone-100 to-stone-50">
        <div className="max-w-7xl mx-auto px-6 pt-5 pb-10">
          {/* Toolbar */}
          <div className="flex justify-end items-center gap-3 mb-4">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs px-3 py-1.5 rounded-full border border-stone-300 bg-white hover:border-amber-700 hover:text-amber-700 transition-colors font-medium"
            >
              {showHelp ? '✕ ' : '? '}{t.howToUse}
            </button>
            <div className="flex border border-stone-300 rounded-full overflow-hidden bg-white">
              <button
                onClick={() => setLang('de')}
                className={`text-xs px-3 py-1.5 font-medium transition-colors ${lang === 'de' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}
              >DE</button>
              <button
                onClick={() => setLang('en')}
                className={`text-xs px-3 py-1.5 font-medium transition-colors ${lang === 'en' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}
              >EN</button>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="stamp mb-3">{t.stamp}</div>
              <h1 className="display text-5xl md:text-6xl font-medium leading-none">
                {lang === 'de' ? (
                  <>Brutto<span className="text-amber-700">·</span>Netto<span className="text-stone-400 font-normal italic"> Rechner</span></>
                ) : (
                  <>Gross<span className="text-amber-700">·</span>Net<span className="text-stone-400 font-normal italic"> Calculator</span></>
                )}
              </h1>
              <p className="mt-3 text-stone-600 max-w-2xl">
                {t.subtitle}
              </p>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-xs uppercase tracking-widest text-stone-500">{t.period}</div>
              <div className="display text-4xl font-medium">2026</div>
            </div>
          </div>

          {/* Help panel */}
          {showHelp && (
            <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-sm font-semibold text-amber-900 mb-2">{t.howToUse}</div>
              <p className="text-sm text-amber-900 mb-3">{t.helpIntro}</p>
              <ol className="text-sm text-amber-900 space-y-1.5 list-decimal pl-5">
                {t.helpSteps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Inputs */}
        <div className="lg:col-span-3 space-y-5">

          {/* Gehalt */}
          <div className="section-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold mono">1</div>
              <h2 className="display text-2xl font-medium">{t.section1}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="field-label">{t.grundgehalt}</label>
                <input
                  type="number"
                  className="field-input text-lg"
                  value={inputs.grundgehalt === 0 ? '' : inputs.grundgehalt}
                  onChange={e => set('grundgehalt', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="field-label">{t.period_label}</label>
                <select
                  className="field-select"
                  value={inputs.period}
                  onChange={e => set('period', e.target.value)}
                >
                  <option value="monat">{t.monthly}</option>
                  <option value="jahr">{t.yearly}</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="field-label">
                  {t.bonus}
                  <span className="ml-2 text-stone-400 font-normal normal-case tracking-normal">{t.bonusHint}</span>
                </label>
                <input
                  type="number"
                  className="field-input"
                  value={inputs.bonusMonat === 0 ? '' : inputs.bonusMonat}
                  onChange={e => set('bonusMonat', parseFloat(e.target.value) || 0)}
                />
                <div className="text-xs text-stone-500 mt-2">
                  {t.bonusHelp}
                </div>
              </div>
            </div>
          </div>

          {/* Persönliche Angaben */}
          <div className="section-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold mono">2</div>
              <h2 className="display text-2xl font-medium">{t.section2}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">{t.taxClass}</label>
                <select
                  className="field-select"
                  value={inputs.taxClass}
                  onChange={e => set('taxClass', e.target.value)}
                >
                  {Object.entries(TAX_CLASSES).map(([k, v]) => (
                    <option key={k} value={k}>{v[lang]}</option>
                  ))}
                </select>
                {inputs.taxClass === 'IV' && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <label className="field-label" style={{ color: '#92400e' }}>
                      {t.faktorLabel}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      className="field-input"
                      value={inputs.faktorRaw ?? String(inputs.faktor).replace('.', lang === 'de' ? ',' : '.')}
                      onChange={e => {
                        const raw = e.target.value;
                        // Store raw string so user can freely edit (including empty, "0,", "0.9", etc.)
                        const normalized = raw.replace(',', '.');
                        const parsed = parseFloat(normalized);
                        setInputs(prev => ({
                          ...prev,
                          faktorRaw: raw,
                          faktor: (isFinite(parsed) && parsed > 0 && parsed <= 1) ? parsed : prev.faktor,
                        }));
                      }}
                      onBlur={() => {
                        // On blur, snap to a valid value and clear the raw override
                        setInputs(prev => {
                          const parsed = parseFloat((prev.faktorRaw ?? '').replace(',', '.'));
                          const clean = (isFinite(parsed) && parsed > 0 && parsed <= 1) ? parsed : 1.0;
                          return { ...prev, faktor: clean, faktorRaw: null };
                        });
                      }}
                    />
                    <div className="text-xs text-amber-800 mt-2">
                      {t.faktorHelp}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="field-label">{t.bundesland}</label>
                <select
                  className="field-select"
                  value={inputs.bundesland}
                  onChange={e => set('bundesland', e.target.value)}
                >
                  {BUNDESLAENDER.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">{t.age}</label>
                <input
                  type="number"
                  className="field-input"
                  value={inputs.age === 0 ? '' : inputs.age}
                  onChange={e => set('age', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="field-label">{t.kinder}</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="field-input"
                  value={inputs.kinderAnzahl === 0 ? '' : inputs.kinderAnzahl}
                  onChange={e => set('kinderAnzahl', parseInt(e.target.value) || 0)}
                />
                <div className="text-xs text-stone-500 mt-2">
                  {t.kinderHelp}
                </div>
              </div>
              <div>
                <label className="field-label">{t.kfbZaehler}</label>
                <select
                  className="field-select"
                  value={inputs.kfbZaehler}
                  onChange={e => set('kfbZaehler', parseFloat(e.target.value))}
                >
                  <option value={0}>{t.kfbOptNone}</option>
                  <option value={0.5}>{t.kfbOptHalf}</option>
                  <option value={1.0}>{t.kfbOpt1}</option>
                  <option value={1.5}>{t.kfbOpt15}</option>
                  <option value={2.0}>{t.kfbOpt2}</option>
                  <option value={2.5}>{t.kfbOpt25}</option>
                  <option value={3.0}>{t.kfbOpt3}</option>
                  <option value={4.0}>{t.kfbOpt4}</option>
                </select>
                <div className="text-xs text-stone-500 mt-2">
                  {t.kfbHelp}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="field-label">{t.freibetrag}</label>
                <input
                  type="number"
                  className="field-input"
                  value={inputs.freibetragJahr === 0 ? '' : inputs.freibetragJahr}
                  onChange={e => set('freibetragJahr', parseFloat(e.target.value) || 0)}
                />
                <div className="text-xs text-stone-500 mt-2">
                  {t.freibetragHelp}
                </div>
              </div>
              <div className="md:col-span-2 flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">{t.kircheTitle}</div>
                  <div className="text-xs text-stone-500">
                    {inputs.bundesland === 'BW' || inputs.bundesland === 'BY' ? '8 %' : '9 %'} {t.kircheOf}
                  </div>
                </div>
                <div
                  className={`toggle ${inputs.kirche ? 'on' : ''}`}
                  onClick={() => set('kirche', !inputs.kirche)}
                />
              </div>
            </div>
          </div>

          {/* Krankenversicherung */}
          <div className="section-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold mono">3</div>
              <h2 className="display text-2xl font-medium">{t.section3}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => set('kvType', 'GKV')}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  inputs.kvType === 'GKV'
                    ? 'border-amber-700 bg-amber-50 text-amber-900'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                {t.kvGkv}
              </button>
              <button
                onClick={() => set('kvType', 'PKV')}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  inputs.kvType === 'PKV'
                    ? 'border-amber-700 bg-amber-50 text-amber-900'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                {t.kvPkv}
              </button>
            </div>

            {inputs.kvType === 'GKV' ? (
              <div>
                <label className="field-label">{t.kvZusatz}</label>
                <input
                  type="number"
                  step={0.1}
                  className="field-input"
                  value={inputs.kvZusatz === 0 ? '' : inputs.kvZusatz}
                  onChange={e => set('kvZusatz', parseFloat(e.target.value) || 0)}
                />
                <div className="text-xs text-stone-500 mt-2">
                  {t.kvZusatzHelp}
                </div>
              </div>
            ) : (
              <div>
                <label className="field-label">{t.pkvBeitrag}</label>
                <input
                  type="number"
                  className="field-input"
                  value={inputs.pkvBeitrag === 0 ? '' : inputs.pkvBeitrag}
                  onChange={e => set('pkvBeitrag', parseFloat(e.target.value) || 0)}
                />
                <div className="text-xs text-stone-500 mt-2">
                  {t.pkvBeitragHelp}
                </div>
              </div>
            )}
          </div>

          {/* Dienstwagen */}
          <div className="section-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold mono">4</div>
                <h2 className="display text-2xl font-medium">{t.section4}</h2>
                <span className="text-xs text-stone-500 italic">{t.section4Sub}</span>
              </div>
              <div
                className={`toggle ${inputs.car.enabled ? 'on' : ''}`}
                onClick={() => setNested('car', 'enabled', !inputs.car.enabled)}
              />
            </div>

            {inputs.car.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="field-label">{t.carType}</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { key: 'combustion', label: t.carCombustion, sub: '1,0 %' },
                      { key: 'hybrid', label: t.carHybrid, sub: '0,5 %' },
                      { key: 'electric_under100k', label: t.carEvUnder, sub: '0,25 %' },
                      { key: 'electric_over100k', label: t.carEvOver, sub: '0,5 %' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setNested('car', 'type', opt.key)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          inputs.car.type === opt.key
                            ? 'border-amber-700 bg-amber-50'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="mono text-sm font-bold text-amber-800 mt-1">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">{t.carBlp}</label>
                    <input
                      type="number"
                      className="field-input"
                      value={inputs.car.listenpreis === 0 ? '' : inputs.car.listenpreis}
                      onChange={e => setNested('car', 'listenpreis', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="field-label">{t.carKm}</label>
                    <input
                      type="number"
                      className="field-input"
                      value={inputs.car.entfernungKm === 0 ? '' : inputs.car.entfernungKm}
                      onChange={e => setNested('car', 'entfernungKm', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-600 leading-relaxed">
                  {inputs.car.type === 'electric_under100k' && t.carRuleEvUnder}
                  {inputs.car.type === 'electric_over100k' && t.carRuleEvOver}
                  {inputs.car.type === 'hybrid' && t.carRuleHybrid}
                  {inputs.car.type === 'combustion' && t.carRuleCombustion}
                </div>
              </div>
            )}
          </div>

          {/* bAV */}
          <div className="section-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold mono">5</div>
                <h2 className="display text-2xl font-medium">{t.section5}</h2>
                <span className="text-xs text-stone-500 italic">{t.section5Sub}</span>
              </div>
              <div
                className={`toggle ${inputs.bav.enabled ? 'on' : ''}`}
                onClick={() => setNested('bav', 'enabled', !inputs.bav.enabled)}
              />
            </div>

            {inputs.bav.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="field-label">{t.bavBetrag}</label>
                  <input
                    type="number"
                    className="field-input"
                    value={inputs.bav.betrag === 0 ? '' : inputs.bav.betrag}
                    onChange={e => setNested('bav', 'betrag', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="text-emerald-800 font-semibold uppercase tracking-wider text-[10px] mb-1">{t.bavTaxFree}</div>
                    <div className="mono text-emerald-900 font-bold">{fEur(C.BBG_RV_AV_MONAT * 12 * C.BAV_STEUERFREI_PROZENT / 12)}{t.bavPerMonth}</div>
                    <div className="text-emerald-700 mt-1">{t.bavTaxFreeNote}</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                    <div className="text-sky-800 font-semibold uppercase tracking-wider text-[10px] mb-1">{t.bavSvFree}</div>
                    <div className="mono text-sky-900 font-bold">{fEur(C.BBG_RV_AV_MONAT * 12 * C.BAV_SVFREI_PROZENT / 12)}{t.bavPerMonth}</div>
                    <div className="text-sky-700 mt-1">{t.bavSvFreeNote}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Output */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="section-card overflow-hidden">

              {/* Hero — Netto */}
              <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 text-white p-6">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-xs uppercase tracking-widest text-amber-200 font-semibold">{t.nettoPayout}</div>
                  <div className="text-xs text-amber-200 mono">{t.perMonth}</div>
                </div>
                <div className="display text-5xl font-medium mono tracking-tight">
                  {f(result.netto)}<span className="text-amber-200 text-3xl"> €</span>
                </div>
                <div className="mt-3 flex justify-between text-xs text-amber-100">
                  <span>{t.perYear} <span className="mono font-semibold">{fEur(result.nettoJahr)}</span></span>
                  <span>{t.burdenRate} <span className="mono font-semibold">{fPct(result.abgabenQuote)}</span></span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="p-6">
                <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-bold mb-3">{t.breakdown}</div>

                <div className="ledger-row">
                  <span className="text-stone-700">{t.grossSalary}</span>
                  <span className="mono font-semibold">{fEur(inputs.period === 'jahr' ? inputs.grundgehalt / 12 : inputs.grundgehalt)}</span>
                </div>

                {inputs.bonusMonat > 0 && (
                  <div className="ledger-row">
                    <span className="text-stone-700">{t.bonusLine}</span>
                    <span className="mono font-semibold">{fEur(inputs.bonusMonat)}</span>
                  </div>
                )}

                {result.gwv > 0 && (
                  <div className="ledger-row text-amber-700">
                    <span>{t.gwvLine}</span>
                    <span className="mono font-semibold">{fEur(result.gwv)}</span>
                  </div>
                )}

                {(inputs.bonusMonat > 0 || result.gwv > 0) && (
                  <div className="ledger-row font-semibold border-t border-stone-300 pt-2 mt-1">
                    <span>{t.gesamtBrutto}</span>
                    <span className="mono">{fEur(result.monatsBrutto + result.gwv)}</span>
                  </div>
                )}

                {result.bavMonat > 0 && (
                  <>
                    <div className="ledger-row text-emerald-700">
                      <span>{t.bavLine}</span>
                      <span className="mono font-semibold">−{fEur(result.bavSteuerfreiMonat)}</span>
                    </div>
                    <div className="ledger-row font-semibold border-t border-stone-300 pt-2 mt-1">
                      <span>{t.steuerBrutto}</span>
                      <span className="mono">{fEur(result.steuerBruttoMonat)}</span>
                    </div>
                  </>
                )}

                <div className="mt-4 mb-2 text-[10px] uppercase tracking-[0.15em] text-stone-500 font-bold">{t.taxesHeader}</div>

                <div className="ledger-row">
                  <span className="text-stone-600">{t.lohnsteuer}</span>
                  <span className="mono">−{fEur(result.lstMonat)}</span>
                </div>

                {result.soliMonat > 0 && (
                  <div className="ledger-row">
                    <span className="text-stone-600">{t.soli}</span>
                    <span className="mono">−{fEur(result.soliMonat)}</span>
                  </div>
                )}

                {result.kistMonat > 0 && (
                  <div className="ledger-row">
                    <span className="text-stone-600">{t.kist} ({fPct(result.kistSatz)})</span>
                    <span className="mono">−{fEur(result.kistMonat)}</span>
                  </div>
                )}

                <div className="mt-4 mb-2 text-[10px] uppercase tracking-[0.15em] text-stone-500 font-bold">{t.socialHeader}</div>

                <div className="ledger-row">
                  <span className="text-stone-600">
                    {t.kv}
                    {inputs.kvType === 'PKV' && <span className="text-xs text-stone-400"> (PKV)</span>}
                  </span>
                  <span className="mono">−{fEur(result.social.kv)}</span>
                </div>
                <div className="ledger-row">
                  <span className="text-stone-600">{t.pv}</span>
                  <span className="mono">−{fEur(result.social.pv)}</span>
                </div>
                <div className="ledger-row">
                  <span className="text-stone-600">{t.rv}</span>
                  <span className="mono">−{fEur(result.social.rv)}</span>
                </div>
                <div className="ledger-row">
                  <span className="text-stone-600">{t.av}</span>
                  <span className="mono">−{fEur(result.social.av)}</span>
                </div>

                {result.bavMonat > 0 && (
                  <>
                    <div className="mt-4 mb-2 text-[10px] uppercase tracking-[0.15em] text-stone-500 font-bold">{t.otherDeductions}</div>
                    <div className="ledger-row text-emerald-700">
                      <span>{t.bavCashLine}</span>
                      <span className="mono font-semibold">−{fEur(result.bavMonat)}</span>
                    </div>
                  </>
                )}

                <div className="mt-5 pt-4 border-t-2 border-stone-900 flex justify-between items-baseline">
                  <span className="font-semibold">{t.payout}</span>
                  <span className="mono font-bold text-lg">{fEur(result.netto)}</span>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 px-4 py-3 bg-stone-100 border border-stone-200 rounded-lg text-[11px] text-stone-600 leading-relaxed">
              <strong className="text-stone-800">{t.disclaimer}:</strong> {t.disclaimerText}
            </div>
          </div>
        </div>
      </main>

      {/* About section */}
      <section className="border-t border-stone-300 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h3 className="display text-2xl font-medium mb-4">{t.aboutTitle}</h3>
          <p className="text-sm text-stone-700 leading-relaxed mb-3 max-w-4xl">{t.aboutText}</p>
          <p className="text-sm text-stone-700 leading-relaxed mb-3 max-w-4xl">{t.aboutPrivacy}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-300 bg-stone-900 text-stone-400">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            © {new Date().getFullYear()} · {lang === 'de' ? 'Stand 2026' : 'As of 2026'}
          </div>
          <div className="flex items-center gap-5 text-xs">
            <button
              onClick={() => setModal('impressum')}
              className="hover:text-amber-200 transition-colors"
            >
              {t.footerImpressum}
            </button>
            <button
              onClick={() => setModal('privacy')}
              className="hover:text-amber-200 transition-colors"
            >
              {t.footerPrivacy}
            </button>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
              <h2 className="display text-2xl font-medium">
                {modal === 'impressum' ? t.impressumTitle : t.privacyTitle}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-stone-400 hover:text-stone-900 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
                aria-label={t.footerClose}
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 text-sm text-stone-700 leading-relaxed">
              {modal === 'impressum' && (
                <>
                  <p className="text-stone-500 italic text-xs uppercase tracking-wider">{t.impressumIntro}</p>

                  <div>
                    <div className="font-semibold text-stone-900 mb-1">{t.impressumOperatorLabel}</div>
                    <div className="whitespace-pre-line">{t.impressumOperator}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-stone-900 mb-1">{t.impressumContactLabel}</div>
                    <div className="whitespace-pre-line">{t.impressumContact}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-stone-900 mb-1">{t.impressumRespLabel}</div>
                    <div className="whitespace-pre-line">{t.impressumResp}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-stone-900 mb-1">{t.impressumDisputeLabel}</div>
                    <p>{t.impressumDispute}</p>
                  </div>

                  <div>
                    <div className="font-semibold text-stone-900 mb-1">{t.impressumLiabilityLabel}</div>
                    <p>{t.impressumLiability}</p>
                  </div>
                </>
              )}

              {modal === 'privacy' && (
                <>
                  <p className="font-medium text-stone-900">{t.privacyIntro}</p>
                  <p>{t.privacyData}</p>
                  <p>{t.privacyCookies}</p>
                  <p>{t.privacyHosting}</p>
                  <p className="text-stone-500 italic">{t.privacyContact}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
