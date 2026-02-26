# IDA Stuudio staatiline demo + kataloog

See repo teeb `https://idastuudio.ee` staatilise peegli lokaalselt, lisab uue lehe `/kataloog/` ning valmistab väljundi Netlify deploy jaoks.

## Eeldused

- Node.js 18+
- pnpm (soovituslik) või npm
- wget

### wgetti paigaldus

macOS (Homebrew):

```bash
brew install wget
```

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y wget
```

Fedora:

```bash
sudo dnf install -y wget
```

Arch:

```bash
sudo pacman -S wget
```

## Paigaldus

```bash
pnpm install
```

Kui kasutad npm-i:

```bash
npm install
```

## Build (tootmisvalmis väljund `public/`)

```bash
pnpm build
```

See käsk:

1. kloonib `idastuudio.ee` staatiliselt kausta `public/`
2. kopeerib `custom/` overlay kausta `public/`
3. lisab navigeerimisse lingi `Kataloog` (`/kataloog/`)
4. kasutab fallback-linki `public/index.html` failis, kui nav-i ei leita

## Kohalik demo localhostis

Esimene kord (täisbuild + serve):

```bash
pnpm build
npx serve public -l 5173
```

Kiire iteratsioon ilma uuesti kloonimata:

```bash
pnpm dev
```

Ava brauseris:

- http://localhost:5173/
- http://localhost:5173/kataloog/

## Skriptid

- `pnpm clone` - ainult kloonimine (`scripts/clone.sh`)
- `pnpm build` - kloon + overlay + nav patch
- `pnpm dev` - `build -- --skipClone` + lokaalserver

npm kasutajale:

```bash
npm run build
npm run dev:npm
```

## Netlify deploy

`netlify.toml` on juba seadistatud:

- build command: `pnpm build`
- publish directory: `public`

Sammud:

1. pushi repo Git providerisse (GitHub/GitLab/Bitbucket)
2. Netlify Dashboard -> **Add new site** -> **Import an existing project**
3. vali repo
4. kontrolli seadeid:
   - Build command: `pnpm build`
   - Publish directory: `public`
5. Deploy

## Kataloogi leht

`/custom/kataloog/` sisaldab:

- `index.html`
- `kataloog.css`
- `kataloog.js`
- `products.json` (100 toodet)
- `img/placeholder.svg`

Funktsioonid:

- otsing
- kategooriafilter
- hinna sorteerimine (asc/desc)
- responsive kaardivaade
- ligipääsetav markup (labelid, `aria-live`, klaviatuuriga navigeeritavad elemendid)

## Piirangud staatilise klooni puhul

Staatiline peegel ei dubleeri täielikult dünaamilist käitumist:

- vormid võivad mitte töötada (backend endpointid puuduvad)
- WordPressi dünaamilised pluginad/shortcode-id võivad olla osaliselt katkised
- API-päringud, autentimine, personaliseerimine ja otsing võivad puududa
- mõned scriptid võivad eeldada originaaldomeeni või serveripoolseid päiseid

## Tõrkeotsing

### 1) `wget: command not found`
Paigalda wget vastavalt ülaltoodud OS juhistele.

### 2) `public/index.html` puudub pärast kloonimist
Käivita:

```bash
pnpm clone
```

`clone.sh` proovib tüüpilisi wget path-quarke automaatselt normaliseerida.

### 3) Osa stiile/pilte ei lae

- tee täisbuild uuesti: `pnpm build`
- kontrolli, et `public/` kaust oleks värske (vana cache võib segada)
- mõni asset võib olla algses saidis dünaamiliselt genereeritud ega pruugi staatilisse peeglisse täielikult tulla

### 4) `pnpm dev` annab vea, et `public/` puudub

Käivita esmalt täisbuild:

```bash
pnpm build
```

Seejärel kasuta kiireks iteratsiooniks `pnpm dev`.
