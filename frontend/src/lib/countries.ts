/*!
 * Country options for booking/profile forms. Arabic countries (the core
 * audience) lead the list, then the rest of the world alphabetically —
 * a premium form should never make an Egyptian scroll past "Afghanistan".
 */

/** Arab League markets first — where most clients book from. */
export const PRIORITY_COUNTRIES = [
  "Egypt",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Jordan",
  "Lebanon",
  "Iraq",
  "Palestine",
  "Syria",
  "Yemen",
  "Libya",
  "Sudan",
  "Tunisia",
  "Algeria",
  "Morocco",
  "Mauritania",
  "Somalia",
  "Djibouti",
  "Comoros",
];

/** Every UN member state not already in the priority list. */
const REST_OF_WORLD = [
  "Afghanistan", "Albania", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso",
  "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Congo (Republic)", "Congo (Democratic Republic)", "Costa Rica", "Côte d'Ivoire", "Croatia",
  "Cuba", "Cyprus", "Czechia", "Denmark", "Dominica",
  "Dominican Republic", "Ecuador", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Kazakhstan",
  "Kenya", "Kiribati", "North Korea", "South Korea", "Kyrgyzstan",
  "Laos", "Latvia", "Lesotho", "Liberia", "Liechtenstein",
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
  "Maldives", "Mali", "Malta", "Marshall Islands", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Macedonia", "Norway", "Pakistan", "Palau", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "São Tomé and Príncipe",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "South Africa", "South Sudan",
  "Spain", "Sri Lanka", "Suriname", "Sweden", "Switzerland",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Zambia", "Zimbabwe",
];

/** The ordered option list: Arabic countries first, then the world. */
export const COUNTRY_OPTIONS: string[] = [
  ...PRIORITY_COUNTRIES,
  ...REST_OF_WORLD.filter((c) => !PRIORITY_COUNTRIES.includes(c)),
];
