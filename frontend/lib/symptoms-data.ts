export type Lang = "en" | "fr" | "de" | "es" | "ur";
export type CountryId = "PK" | "US" | "GB" | "DE" | "FR";

export const LANG_NAME: Record<Lang, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ur: "اردو",
};

export type Contact = {
  id: string; 
  number: string; 
  tel: string; 
  hasNote?: boolean;
};

export type Country = {
  id: CountryId;
  lang: Lang;
  primary: { number: string; tel: string };
  contacts: Contact[];
  source: { label: string; href: string };
};

export const COUNTRIES: Country[] = [
  {
    id: "PK",
    lang: "ur",
    primary: { number: "1122", tel: "1122" },
    contacts: [
      { id: "edhi", number: "115", tel: "115", hasNote: true },
      { id: "police", number: "15", tel: "15" },
      { id: "fire", number: "16", tel: "16" },
    ],
    source: { label: "rescue.gov.pk", href: "https://rescue.gov.pk/" },
  },
  {
    id: "US",
    lang: "en",
    primary: { number: "911", tel: "911" },
    contacts: [
      { id: "crisis", number: "988", tel: "988", hasNote: true },
      { id: "poison", number: "1-800-222-1222", tel: "18002221222", hasNote: true },
    ],
    source: { label: "usa.gov", href: "https://www.usa.gov/agency-index" },
  },
  {
    id: "GB",
    lang: "en",
    primary: { number: "999", tel: "999" },
    contacts: [
      { id: "e112", number: "112", tel: "112" },
      { id: "nhs111", number: "111", tel: "111", hasNote: true },
      { id: "samaritans", number: "116 123", tel: "116123", hasNote: true },
    ],
    source: {
      label: "nhs.uk",
      href: "https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/",
    },
  },
  {
    id: "DE",
    lang: "de",
    primary: { number: "112", tel: "112" },
    contacts: [
      { id: "onCall", number: "116 117", tel: "116117", hasNote: true },
      { id: "police", number: "110", tel: "110" },
      { id: "telefonseelsorge", number: "0800 111 0 111", tel: "08001110111", hasNote: true },
    ],
    source: { label: "116117.de", href: "https://www.116117.de/de/englisch.php" },
  },
  {
    id: "FR",
    lang: "fr",
    primary: { number: "112", tel: "112" },
    contacts: [
      { id: "samu", number: "15", tel: "15" },
      { id: "fire", number: "18", tel: "18" },
      { id: "police", number: "17", tel: "17" },
      { id: "suicide", number: "3114", tel: "3114", hasNote: true },
      { id: "sms", number: "114", tel: "114", hasNote: true },
    ],
    source: {
      label: "service-public.gouv.fr",
      href: "https://www.service-public.gouv.fr/particuliers/actualites/A17758?lang=fr",
    },
  },
];