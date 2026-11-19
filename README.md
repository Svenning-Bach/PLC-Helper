# PLC Notation

Opslagsapp til ungarsk notation og navngivning af variabler i CODESYS, Siemens TIA Portal og Allen-Bradley Studio 5000.

## Hvorfor en PWA?
Appen er en *Progressive Web App*: én kodebase i HTML/CSS/JavaScript, der kan installeres på iPhone, Android og computer direkte fra browseren og virker offline. Der skal ikke bruges App Store, Google Play eller udviklerkonto, og den kan senere pakkes som "rigtig" app (fx med Capacitor), hvis I vil i butikkerne.

## Funktioner
- 6 kategorier: Datatyper, Funktionsblokke, Scope og parametre, I/O og adresser, Bloknavne og typer, Best practices
- Søgning på tværs af alt (også danske ord som "flanke", "tæller", "tidsrelæ")
- Leverandørfilter: vis kun CODESYS, Siemens eller Allen-Bradley
- Detaljevisning med præfiks, betydning, størrelse/område, kodeeksempel og forskelle pr. leverandør
- Mærkning af om noget er officiel anbefaling, udbredt praksis eller indbygget
- Favoritter (gemmes på enheden)
- Navnebygger: skriv "start button" og kombinér skrivemåde (camelCase, PascalCase, snake_case …) med ungarsk notation og scope-præfiks, fx `i_xStartButton`, `startButton` eller `Start_Button`
- Lyst/mørkt tema, offline og installérbar

## Kør den på din computer
```
cd plc-notation-app
python -m http.server 8000
```
Åbn http://localhost:8000. (Den kan ikke åbnes ved at dobbeltklikke på index.html, fordi browseren blokerer indlæsning af JSON-filen fra `file://`.)

## Få den på telefonen
Appen skal ligge på en HTTPS-adresse, fx GitHub Pages (gratis). Derefter:
- **iPhone (Safari):** Del-knappen → "Føj til hjemmeskærm"
- **Android (Chrome):** Menu → "Installer app"
- **Computer (Chrome/Edge):** Installer-ikonet i adresselinjen

## Tilføj eller ret indhold
Alt indhold ligger i `data/notation.json`. Et opslag ser sådan ud:
```json
{
  "id": "rtrig", "category": "fb", "prefix": "R_TRIG",
  "title": "Rising trigger", "meaning": "Q er TRUE i én scan ...",
  "status": "builtin",
  "vendors": {
    "codesys": { "type": "R_TRIG", "prefix": "rtrig", "note": "..." },
    "siemens": { "type": "R_TRIG / P_TRIG", "prefix": "–", "note": "..." },
    "ab":      { "type": "ONS / OSR", "prefix": "–", "note": "..." }
  },
  "example": "rtStart(CLK := xStartButton);",
  "tags": ["flanke", "edge"]
}
```
`status` er `official`, `common` eller `builtin`. Når du ændrer filer, så hæv `VERSION` i `sw.js`, så telefoner henter den nye udgave.

## Filer
| Fil | Indhold |
|---|---|
| `index.html` | Sidens skelet |
| `styles.css` | Design (lyst og mørkt tema) |
| `app.js` | Logik: kategorier, søgning, filter, favoritter, navnebygger |
| `data/notation.json` | Alt indhold |
| `sw.js` | Offline-cache |
| `manifest.webmanifest`, `icons/` | Installation og ikon |
