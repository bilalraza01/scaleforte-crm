// ISO 3166-1 country list, alphabetized for dropdown UX. Trimmed to the
// 60-ish countries Amazon sellers most commonly come from — adding the long
// tail later is a one-line change. Each entry is `{ code, name, dial }`
// where `code` is ISO-3166-1 alpha-2, `name` is the English short name,
// and `dial` is the E.164 country calling code (digits only, no `+`).
//
// `dial` doubles as the phone-input country-code dropdown — keeps the FE
// from needing a separate dataset.

export interface Country {
  code: string
  name: string
  dial: string
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States",        dial: "1"   },
  { code: "CA", name: "Canada",               dial: "1"   },
  { code: "GB", name: "United Kingdom",       dial: "44"  },
  { code: "AU", name: "Australia",            dial: "61"  },
  { code: "DE", name: "Germany",              dial: "49"  },
  { code: "FR", name: "France",               dial: "33"  },
  { code: "IT", name: "Italy",                dial: "39"  },
  { code: "ES", name: "Spain",                dial: "34"  },
  { code: "NL", name: "Netherlands",          dial: "31"  },
  { code: "BE", name: "Belgium",              dial: "32"  },
  { code: "SE", name: "Sweden",               dial: "46"  },
  { code: "NO", name: "Norway",               dial: "47"  },
  { code: "DK", name: "Denmark",              dial: "45"  },
  { code: "FI", name: "Finland",              dial: "358" },
  { code: "IE", name: "Ireland",              dial: "353" },
  { code: "PT", name: "Portugal",             dial: "351" },
  { code: "AT", name: "Austria",              dial: "43"  },
  { code: "CH", name: "Switzerland",          dial: "41"  },
  { code: "PL", name: "Poland",               dial: "48"  },
  { code: "CZ", name: "Czechia",              dial: "420" },
  { code: "GR", name: "Greece",               dial: "30"  },
  { code: "JP", name: "Japan",                dial: "81"  },
  { code: "KR", name: "South Korea",          dial: "82"  },
  { code: "CN", name: "China",                dial: "86"  },
  { code: "IN", name: "India",                dial: "91"  },
  { code: "PK", name: "Pakistan",             dial: "92"  },
  { code: "BD", name: "Bangladesh",           dial: "880" },
  { code: "ID", name: "Indonesia",            dial: "62"  },
  { code: "PH", name: "Philippines",          dial: "63"  },
  { code: "VN", name: "Vietnam",              dial: "84"  },
  { code: "TH", name: "Thailand",             dial: "66"  },
  { code: "MY", name: "Malaysia",             dial: "60"  },
  { code: "SG", name: "Singapore",            dial: "65"  },
  { code: "HK", name: "Hong Kong",            dial: "852" },
  { code: "TW", name: "Taiwan",               dial: "886" },
  { code: "NZ", name: "New Zealand",          dial: "64"  },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "SA", name: "Saudi Arabia",         dial: "966" },
  { code: "IL", name: "Israel",               dial: "972" },
  { code: "TR", name: "Turkey",               dial: "90"  },
  { code: "EG", name: "Egypt",                dial: "20"  },
  { code: "ZA", name: "South Africa",         dial: "27"  },
  { code: "NG", name: "Nigeria",              dial: "234" },
  { code: "KE", name: "Kenya",                dial: "254" },
  { code: "BR", name: "Brazil",               dial: "55"  },
  { code: "AR", name: "Argentina",            dial: "54"  },
  { code: "CL", name: "Chile",                dial: "56"  },
  { code: "CO", name: "Colombia",             dial: "57"  },
  { code: "MX", name: "Mexico",               dial: "52"  },
  { code: "PE", name: "Peru",                 dial: "51"  },
  { code: "RU", name: "Russia",               dial: "7"   },
  { code: "UA", name: "Ukraine",              dial: "380" },
  { code: "RO", name: "Romania",              dial: "40"  },
  { code: "HU", name: "Hungary",              dial: "36"  },
  { code: "BG", name: "Bulgaria",             dial: "359" },
  { code: "HR", name: "Croatia",              dial: "385" },
  { code: "RS", name: "Serbia",               dial: "381" },
  { code: "SI", name: "Slovenia",             dial: "386" },
  { code: "SK", name: "Slovakia",             dial: "421" },
  { code: "EE", name: "Estonia",              dial: "372" },
  { code: "LV", name: "Latvia",               dial: "371" },
  { code: "LT", name: "Lithuania",            dial: "370" },
  { code: "IS", name: "Iceland",              dial: "354" },
].sort((a, b) => a.name.localeCompare(b.name))
