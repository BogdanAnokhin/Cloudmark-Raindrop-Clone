# Testimine ja kontroll

## Automaatsed testid

Käivita projekti juurkaustas:

```bash
npm test
```

Test `tests/api.test.js` käivitab eraldi Node.js serveri ja ajutise SQLite faili, seejärel teeb HTTP päringuid päris API-le. Kontrollitakse:

1. Kaitstud endpoint nõuab sisselogimist.
2. Vale parool lükatakse tagasi, õige parool annab seansiküpsise.
3. Demokontol on oodatud 5 kollektsiooni ja 16 linki.
4. Uue kollektsiooni ja järjehoidja loomine õnnestub.
5. Siltide lisamine ja muutmine salvestub andmebaasi.
6. Pealkirja muutmine ja lemmiku märkimine töötavad.
7. Vigased lingid, näiteks `javascript:` skeem, lükatakse tagasi.
8. Prügikasti tõstmine, taastamine ja lõplik kustutamine toimivad.
9. Uus kasutaja alustab tühja andmekoguga ega saa teise kasutaja linke muuta.
10. Väljalogimise järel on kaitstud endpoint jälle suletud.

## Käsitsi kontroll brauseris

| Nr | Tegevus | Oodatud tulemus |
|---|---|---|
| 1 | Ava http://localhost:3000 | Sisselogimisleht avaneb |
| 2 | Vali “Use demo account” | Avaneb “All bookmarks” ja 16 näidislinki |
| 3 | Vali “Design inspiration” | Näidatakse ainult selle kollektsiooni linke |
| 4 | Lisa uus kollektsioon | Uus nimi ilmub vasakul menüüs |
| 5 | Lisa uus URL | Link ilmub vastava kollektsiooni vaatesse |
| 6 | Lisa silt `kool` | Silt ilmub järjehoidja kaardile ning filtritesse |
| 7 | Märgi süda | Link ilmub “Favorites” all |
| 8 | Muuda pealkirja | Muudatus salvestub ka pärast lehe uuendamist |
| 9 | Kustuta link | See kaob kogust ning ilmub “Trash” alla |
| 10 | Taasta link prügikastist | Link ilmub taas kogusse |
| 11 | Vali loendivaade | Kaardid muutuvad horisontaalseteks ridadeks |
| 12 | Sisesta otsingusse sõna | Järele jäävad ainult sobivad tulemused |
| 13 | Ava sait mobiililaiuses | Paigutus kohandub kitsale ekraanile |
| 14 | Logi välja ja tagasi sisse | Varem salvestatud andmed on alles |

## Tehtud kontrollid

- API integratsioonitest: **läbitud**.
- Brauseri kasutajavoog: **läbitud** — demokontole sisselogimine, kollektsiooni ja järjehoidja loomine, lemmik, muutmine, kustutamine, taastamine, otsing, loendivaade ja väljalogimine.
- Brauseri JavaScripti käitusvead testitud kasutajavoos: **0**.
- Kuvatõmmised: projekti juurkaustas `dashboard-preview.png` ja `mobile-preview.png`.

Brauseri test viidi läbi kohalikus testkeskkonnas, kasutades olemasolevat API serverit ja Playwrighti kaudu juhitud kasutajaliidest.
