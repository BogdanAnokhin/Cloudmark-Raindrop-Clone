# MVP kirjeldus — Cloudmark (Raindrop.io kloon)

## Mis on originaalne süsteem?

**Raindrop.io** on veebipõhine järjehoidjate haldur. Kasutaja salvestab linke eri veebilehtedele, jaotab need kollektsioonidesse ning leiab hiljem otsingu või siltide kaudu üles. Originaali aadress: https://raindrop.io/.

Valisin selle süsteemi, kuna see on vähem tavapärane klooniprojekti teema kui suured video-, muusika- ja suhtlusvõrgustikud. Ka selle lihtsustatud versioonil on mõtestatud andmemudel ning realistlikud frontend- ja backend-ülesanded.

## Sihtkasutaja ja probleem

- **Sihtkasutaja:** üliõpilane, arendaja, disainer või muu inimene, kes hoiab alles kasulikke veebiaadresse.
- **Probleem:** linkide hulk kasvab, neid ei ole mugav otsida, lemmikuid kaob brauseri vahel ära.
- **Lahendus:** üks isiklik veebipõhine kogu, kus järjehoidjad on kategoriseeritud, otsitavad ja muudetavad.

## Minimaalne töötav toode (MVP)

**MVP on valmis, kui kasutaja saab kogu järgmise töövoo lõpuni teha:**

1. Avada saidi ja luua kasutajakonto või siseneda demokontoga.
2. Luua näiteks kollektsiooni „Õppimine”.
3. Salvestada lingi `https://developer.mozilla.org/`, sisestada pealkirja, kirjelduse ja sildid `javascript`, `õppimine`.
4. Vaadata salvestatud linki oma kollektsioonis ning avada originaalne veebileht uues vahekaardis.
5. Otsida järjehoidjat märksõnaga, filtreerida siltide järgi ning lisada see lemmikutesse.
6. Muuta järjehoidja pealkirja või kollektsiooni ning vajadusel viia see prügikasti ja taastada.
7. Välja logida ja uuesti sisse logida — link on jätkuvalt andmebaasis alles.

## Funktsionaalsed nõuded

| ID | Nõue | MVP-s tehtud? |
|---|---|---|
| F-01 | Registreerimine ja sisselogimine | Jah |
| F-02 | Iga kasutaja näeb ainult enda andmeid | Jah |
| F-03 | Kollektsioonide lisamine, muutmine ja kustutamine | Jah |
| F-04 | Järjehoidja lisamine, vaatamine, muutmine ja kustutamine | Jah |
| F-05 | Siltide lisamine järjehoidjale | Jah |
| F-06 | Otsimine URL-i, pealkirja, kirjelduse ja siltide järgi | Jah |
| F-07 | Lemmikute märkimine ning eraldi kuvamine | Jah |
| F-08 | Prügikast ja taastamine | Jah |
| F-09 | Kaardi- ning loendivaade | Jah |
| F-10 | Kohanduv kujundus arvuti ja mobiili jaoks | Jah |

## Mittefunktsionaalsed nõuded

- **Kasutuslihtsus:** tähtsamad vaated on leitavad vasakult menüüst; uus link lisatakse ühe nupuga.
- **Püsivus:** andmed salvestatakse SQLite faili ning jäävad alles pärast serveri taaskäivitamist.
- **Turvalisuse baas:** paroolid on räsitud, seansid on serveris, juurdepääs on kasutajapõhine, HTML-väärtused väljastatakse kodeeritult.
- **Jõudlus:** andmebaasis on indeksid peamiste seoste jaoks; ühe kasutaja andmed laaditakse ühe koondpäringuga.
- **Käivitatavus:** piisab Node.js-ist ning käsust `npm start`; eraldi andmebaasiserverit ei pea paigaldama.

## Kasutajaliidese põhivaated

1. **Login / Register** — autentimisvorm ja demokonto nupp.
2. **All bookmarks** — kõigi salvestatud linkide kaardivaade.
3. **Unsorted** — kollektsioonita järjehoidjad.
4. **Favorites** — kasutaja lemmikud.
5. **Trash** — taastatavad või lõplikult kustutatavad järjehoidjad.
6. **Collection** — ühe valitud kollektsiooni lingid.
7. **Forms** — järjehoidja ja kollektsiooni loomine või muutmine.

## Mida ma originaalist jäljendasin?

Originaaliga samasugune üldine tööpõhimõte: vasak külgpaan kategooriatega, järjehoidjate arvud, ülemine otsing ja lisamise nupp, keskne kaartide/loendi vaade ning siltidega filtreerimine. Lähedase ilme saavutamiseks kasutasin heledat tausta, ümaraid kaarte, pisipilte ja väikseid tegevusikoone.

## Mida MVP ei tee?

Puudub automaatne veebilehe pildi või metaandmete allalaadimine, brauserilaiendus, veebilehe arhiveerimine, päris koostöö mitme kasutajaga samas kollektsioonis, täistekstiotsing lehe sisust, sotsiaalne jagamine ja mobiili natiivrakendus. Need ei ole minimaalse töötava süsteemi jaoks vajalikud.
