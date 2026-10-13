# Cloudmarki projekti tutvustus õpetajale (3–5 minutit)

## 1. Tutvustus

Tere! Minu projekt on **Cloudmark**, mis on Raindrop.io veebirakenduse kloon. Originaal on järjehoidjate haldur, kuhu saab salvestada kasulikke veebilehti ja neid organiseerida. Valisin selle, sest tegemist ei ole nii levinud klooniteemaga nagu YouTube või Spotify, kuid rakendusel on selgelt määratletud funktsionaalsus.

## 2. MVP eesmärk

Minu MVP eesmärk oli luua süsteem, kus kasutaja saab sisse logida, salvestada veebilingi, lisada sellele silte, panna selle kollektsiooni ning hiljem otsingu abil üles leida. Lisafunktsioonid on lemmikud, prügikast ja kaks kuvamisviisi.

## 3. Andmebaas ja tehnoloogiad

Projekt kasutab frontend'is HTML-i, CSS-i ja JavaScripti. Backend on kirjutatud Node.js-is. Andmed salvestatakse SQLite'i. Kokku on kuus tabelit: users, sessions, collections, bookmarks, tags ja bookmark_tags. Viimane tabel ühendab silte ja järjehoidjaid.

## 4. Reaalajas demo

1. Käivitan projekti käsuga `npm start`.
2. Login sisse demokontoga.
3. Näitan vasakul menüüs kollektsioone ja keskel järjehoidjate kaarte.
4. Loon uue kollektsiooni nimega „Kool”.
5. Lisan uue lingi, pealkirja ja sildid.
6. Otsin lisatud lingi üles ja muudan selle lemmikuks.
7. Kustutan lingi, näitan prügikasti ja taastan selle.
8. Näitan, et muudatus säilib lehe värskendamisel.
9. Demonstreerin `npm test` väljundit.

## 5. Originaaliga võrdlus

Jäljendasin Raindrop.io paigutust: vasakul kollektsioonid, üleval otsing ning keskel visuaalsed järjehoidjakaardid. Kasutasin enda brändi ja SVG illustratsioone. Eesmärk oli töötav ja äratuntav MVP, mitte iga originaali funktsiooni kopeerimine.

## 6. Kokkuvõte

Projekti käigus harjutasin frontend'i ja backend'i ühendamist, REST API loomist, SQLite seoseid, autentimist ning testimist. Edasi võiks lisada automaatsed eelvaatepildid ja importimise brauserist.
