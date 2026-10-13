# Andmebaasi kirjeldus

**Andmebaasisüsteem:** SQLite. Andmebaas tekib failina `data/bookmarks.db`, kui Node.js server käivitatakse esimest korda. Kõik tabelid luuakse automaatselt failis `server/db.js`. Skeemi SQL koopia on `docs/schema.sql`.

## Tabelite ülesanded

| Tabel | Primaarvõti | Välisvõtmed | Kirjeldus |
|---|---|---|---|
| `users` | `id` | — | Kasutajanimi, unikaalne e-post, parooli räsi |
| `sessions` | `token_hash` | `user_id` → users | Sisselogimisseanss ja aegumisaeg |
| `collections` | `id` | `user_id` → users | Kollektsioonid (nimi, ikoon, värv) |
| `bookmarks` | `id` | `user_id` → users, `collection_id` → collections | URL, pealkiri, kirjeldus, kaas, lemmiku olek ja kustutusaeg |
| `tags` | `id` | `user_id` → users | Kasutajapõhised unikaalsed sildid |
| `bookmark_tags` | (`bookmark_id`, `tag_id`) | bookmarks, tags | Mitmele-mitmega seose ühendustabel |

## Seosed

- **Üks kasutaja → mitu kollektsiooni**, järjehoidjat, silti ja seanssi.
- **Üks kollektsioon → mitu järjehoidjat**; järjehoidja võib olla ka ilma kollektsioonita (`collection_id = NULL`, *Unsorted*).
- **Üks järjehoidja ↔ mitu silti** ja sama silt võib kuuluda paljudele järjehoidjatele; see realiseeritakse `bookmark_tags` kaudu.
- Kollektsiooni kustutamisel muutub linkide `collection_id` väärtuseks `NULL` (`ON DELETE SET NULL`).
- Kasutaja või järjehoidja kustutamisel eemaldatakse nendega seotud andmed (`ON DELETE CASCADE`).

## Näide andmetest

- `users`: (1, Alex Morgan, demo@raindrop.local, ...)
- `collections`: (1, 1, Design inspiration, palette, #a55eea)
- `bookmarks`: (1, 1, 1, https://www.awwwards.com/, Awwwards — Website Awards, ...)
- `tags`: (1, 1, design)
- `bookmark_tags`: (1, 1) ehk esimese lingi külge on seotud silt `design`.

## Andmete terviklus ja päringud

Andmebaasis on sisse lülitatud `PRAGMA foreign_keys = ON`. `email` on unikaalne, `(user_id, tag.name)` on unikaalne ja `(bookmark_id, tag_id)` on ühendustabelis ühine primaarvõti. Indeksid toetavad otsimist `user_id`, `collection_id` ning kustutamisoleku alusel.

Server kontrollib enne päringuid, et soovitud järjehoidja või kollektsioon kuuluks autentitud kasutajale. SQL-i teostatakse parameetritega, näiteks:

```sql
SELECT * FROM bookmarks WHERE id = ? AND user_id = ?;
```

**Prügikasti loogika:** tavapärasel kustutamisel täidetakse `bookmarks.deleted_at`. Kirje jääb andmebaasi ning seda saab taastada. Lõplikul kustutamisel kasutatakse SQL `DELETE` käsku.

**Tag'id:** tagide nimed normaliseeritakse väiketähtedeks, sama tag ei teki sama kasutaja jaoks kaks korda. Olemasolevaid seoseid muutes asendatakse järjehoidja siltide komplekt.
