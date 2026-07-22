# Mijn campingtijdlijn

Een complete, statische en responsieve website om chronologisch door campings, camperplaatsen en kampeerweekenden sinds 2024 te bladeren. De site gebruikt alleen HTML, CSS, vanilla JavaScript, JSON en lokale afbeeldingen en kan daardoor zonder buildstap op GitHub Pages worden gepubliceerd.

## Functies

- Verticale tijdlijn, per jaar gegroepeerd en nieuwste verblijf eerst
- Automatisch berekende statistieken en overnachtingen
- Gecombineerde filters voor jaar, land, type en tag
- Zoekfunctie voor onder andere campingnaam, plaats, land en reis
- Toegankelijke detailmodal met focusbeheer en Escape-ondersteuning
- Herhaalde bezoeken herkend via `campingId`
- Deelbare links zoals `#reraig-caravan-site-2024`
- Lokale afbeeldingsfallback bij ontbrekende foto's
- Responsief ontwerp, dark mode en ondersteuning voor minder beweging
- Scrollvoortgang en een terug-naar-bovenknop
- Foutmelding met opnieuw-proberenknop als de JSON niet kan laden

## Bestandsstructuur

```text
.
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   ├── campings.json
│   └── images.json
└── assets/
    └── images/
        └── placeholder.svg
```

## Lokaal starten

Open `index.html` niet rechtstreeks met `file://`: browsers blokkeren dan vaak het laden van het JSON-bestand. Start in de projectmap een eenvoudige lokale webserver:

```bash
python3 -m http.server 8000
```

Open daarna [http://localhost:8000](http://localhost:8000). Een alternatief is `npx serve .`; npm installeren is niet nodig voor de website zelf.

## Publiceren via GitHub Pages

1. Maak op GitHub een repository aan, bijvoorbeeld `campingtijdlijn`.
2. Plaats alle bestanden uit dit project in de hoofdmap van de repository.
3. Commit en push de bestanden naar GitHub.
4. Open de repository op GitHub.
5. Ga naar **Settings**.
6. Open **Pages**.
7. Kies bij Source voor **Deploy from a branch**.
8. Selecteer de standaardbranch, bijvoorbeeld `main`.
9. Selecteer de map `/ (root)`.
10. Sla de instelling op.
11. Open na publicatie de getoonde GitHub Pages-URL.

De website gebruikt uitsluitend relatieve paden en werkt dus ook onder een repositorypad zoals `https://gebruikersnaam.github.io/campingtijdlijn/`.

## Verblijven beheren

Alle campinginformatie staat in [`data/campings.json`](./data/campings.json). De kaarten, statistieken, filters en modal worden daar automatisch uit opgebouwd; voor een nieuw verblijf hoeft `index.html` niet te worden aangepast. De meegeleverde Creative Commons-locatiefoto’s, credits en licenties staan afzonderlijk in [`data/images.json`](./data/images.json).

### Een verblijf toevoegen

Voeg binnen de JSON-array een object toe. Let op de komma tussen twee objecten en gebruik geldige JSON met dubbele aanhalingstekens.

```json
{
  "id": "nieuwe-camping-2026",
  "campingId": "nieuwe-camping",
  "name": "Nieuwe camping",
  "location": "Plaatsnaam",
  "region": "Provincie of regio",
  "country": "Nederland",
  "countryCode": "NL",
  "arrivalDate": "2026-08-01",
  "departureDate": "2026-08-03",
  "type": "Camping",
  "trip": "Zomerreis",
  "description": "Korte beschrijving.",
  "longDescription": "Een uitgebreidere toelichting op het verblijf.",
  "highlights": ["Bijzonder moment"],
  "tags": ["zomer", "camper"],
  "image": "./assets/images/nieuwe-camping-2026.jpg",
  "imageAlt": "Camper op Nieuwe camping in Plaatsnaam",
  "googleMapsUrl": "",
  "polarstepsUrl": "",
  "coordinates": { "latitude": null, "longitude": null },
  "confirmed": true,
  "needsCompletion": false,
  "source": "Eigen reisoverzicht"
}
```

`id` identificeert één specifiek verblijf en moet uniek en geschikt voor een URL zijn: gebruik kleine letters, cijfers en koppeltekens. Dit veld wordt ook gebruikt voor de hashlink.

`campingId` identificeert de camping of camperplaats. Gebruik bij een volgend bezoek exact dezelfde `campingId`; de site toont dan automatisch het aantal bezoeken en links naar de andere verblijven. De drie bezoeken aan Groot Antink gebruiken bijvoorbeeld allemaal `groot-antink`.

### Een bestaand verblijf aanpassen

Zoek het verblijf in `data/campings.json` op via zijn unieke `id`, wijzig de gewenste velden en bewaar geldige JSON. De volgorde in het bestand maakt niet uit: JavaScript sorteert automatisch op jaar en aankomstdatum.

### Datums en overnachtingen

Gebruik voor `arrivalDate` en `departureDate` altijd het ISO-formaat `YYYY-MM-DD`. Als beide datums aanwezig zijn en `nights` ontbreekt of `null` is, berekent de site het aantal nachten automatisch als lokale kalenderdatums.

Als de exacte datum onbekend is:

- zet de datumvelden op `null`;
- vul `year` in zodat het verblijf onder het juiste jaar verschijnt;
- gebruik eventueel `dateLabel`, bijvoorbeeld `"Hemelvaart 2025"`;
- zet `needsCompletion` op `true`.

Onbekende nachten worden niet meegeteld in het statistiektotaal.

### Onvolledige en onbekende gegevens

Met `needsCompletion: true` verschijnt het label **Nog aanvullen**. `confirmed: true` betekent dat het verblijf zeker heeft plaatsgevonden, ook als nog informatie ontbreekt. Gebruik `confirmed: false` voor een routeovernachting waarvan bijvoorbeeld alleen de omgeving bekend is; die krijgt daarnaast het label **Exacte plek onbekend**.

In de meegeleverde dataset moeten nog worden aangevuld:

- vertrekdatum van Groot Antink in 2024;
- datum en plaats van Domaine de l’Eau Rouge;
- exacte plekken van de onbekende overnachtingen bij York en in Schotland;
- diverse foto's en coördinaten.

### Foto toevoegen

1. Plaats de foto in `assets/images/`, bij voorkeur met een korte bestandsnaam zonder spaties.
2. Zet `image` op een relatief pad, bijvoorbeeld `./assets/images/nieuwe-camping-2026.jpg`.
3. Geef via `imageAlt` kort aan wat er op de foto staat.

Wanneer een bestand ontbreekt of niet kan worden geladen, gebruikt de site automatisch `placeholder.svg`. Voeg bij foto’s van derden ook `imageCredit`, `imageSourceUrl`, `imageLicense` en `imageLicenseUrl` toe. Deze credits worden automatisch in de detailmodal getoond. Controleer altijd of de licentie herpublicatie toestaat.

### Google Maps en Polarsteps

Plak een volledige `https://`-link in `googleMapsUrl` of `polarstepsUrl`. Laat het veld leeg (`""`) als er geen link beschikbaar is; de bijbehorende knop wordt dan niet getoond. Externe links openen veilig in een nieuw tabblad.

## Deelbare hashlinks

Elk verblijf is direct te delen door zijn `id` achter de URL te zetten:

```text
https://gebruikersnaam.github.io/campingtijdlijn/#reraig-caravan-site-2024
```

Na het laden zoekt de website het verblijf op en scrolt naar de bijbehorende kaart. Als een detailmodal via de site wordt geopend, wordt de hash zonder pagina-herlaadactie bijgewerkt. Bij het sluiten wordt de hash weer verwijderd.

## Gegevens controleren

Controleer na elke datawijziging de JSON-syntax. Met Python kan dat zonder extra afhankelijkheden:

```bash
python3 -m json.tool data/campings.json > /dev/null
```

Test daarna de zoekfunctie, filters, detailmodal, hashlink en ontbrekende afbeeldingen via de lokale webserver. Gebruik ook het toetsenbord: Tab verplaatst de focus en Escape sluit de modal.
