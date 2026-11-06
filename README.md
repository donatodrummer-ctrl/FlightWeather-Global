# FlightWeather-Global

Mappa mondiale interattiva per visualizzare traffico aereo ADS-B e radar delle precipitazioni.

## Funzioni presenti

- Mappa Leaflet con base OpenStreetMap.
- Traffico aereo vicino al centro della mappa, con dettagli su nominativo, tipo, quota, velocità e rotta.
- Radar precipitazioni RainViewer attivabile come livello.
- Aggiornamento automatico degli aeromobili ogni 30 secondi.
- Interfaccia adattabile a smartphone e desktop.

## Distribuzione consigliata: Cloudflare Pages

Il progetto usa una Pages Function in `functions/api/aircraft.js` come proxy server-side per la fonte ADS-B. Per questo motivo **non basta GitHub Pages**: pubblicalo con Cloudflare Pages collegando questo repository.

1. Apri Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Seleziona `donatodrummer-ctrl/FlightWeather-Global`.
3. Framework preset: None.
4. Build command: lascia vuoto.
5. Build output directory: `/`.
6. Avvia il deploy. Cloudflare Pages rileverà automaticamente `functions/api/aircraft.js`.

## Fonti e limiti

- Traffico aereo: [adsb.lol](https://www.adsb.lol/) — servizio comunitario, disponibilità e limiti possono variare. L'endpoint restituisce aeromobili entro un raggio massimo di 250 NM dal centro della vista; non è un feed completo di ogni aereo del pianeta in un'unica richiesta.
- Radar: [RainViewer](https://www.rainviewer.com/) — API gratuita per uso personale/educativo, con dati radar passati; disponibilità e copertura variano. Attribuzione mostrata nella mappa.
- Cartografia: [OpenStreetMap](https://www.openstreetmap.org/copyright).

I dati ADS-B e radar possono avere ritardi, lacune o errori. Non usare questa applicazione per navigazione o decisioni operative.
