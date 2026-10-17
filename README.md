# Floris Dekker's pixel lake

An interactive personal homepage: a sunset lake, fishing from the dock, wildlife cameos and a small Toronto surprise. The scene uses pixel artwork at a fixed four CSS pixels per source pixel.

## Run

No installation or build step is needed for this public package. Serve the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. Opening the HTML directly as a file does not support the module and asset requests.

## Code

| Path | Purpose |
| --- | --- |
| `index.html` | Accessible identity, search metadata and startup |
| `cottage/src/arcade-rebuild/main.js` | Scene initialization and fallback |
| `cottage/src/arcade-rebuild/world.js` | Lake, fishing and wildlife behavior |
| `cottage/src/arcade-rebuild/config.js` | Selected artwork and scene settings |
| `cottage/src/arcade-rebuild/audio.js` | Gesture-activated sound |
| `cottage/src/contact.js`, `cottage/src/credits.js` | Accessible dialogs |
| `cottage/styles/` | Responsive layout and static fallback |
| `cottage/assets/arcade-rebuild/current/` | Artwork, sound and runtime metadata |
| `cottage/vendor/` | PixiJS 8.6.6 and license notices |
| `robots.txt`, `sitemap.xml` | Search crawler discovery |

This is a static site with no application server, account system, analytics or tracking scripts. Sound loads after interaction; unsupported graphics retain a static lake and accessible identity. Email reveal/copy works in the browser; its obfuscation deters basic scraping but does not make the address secret. Only sound preference is saved locally.

The public package contains the runtime source and selected assets. Development tools, reference material, prompts and review history are kept outside it. The only minified JavaScript is the pinned third-party PixiJS distribution; application modules and configuration remain readable.

## Attribution

The on-page Credits dialog links the tools, sound recordings and their licenses, including edits made for this scene. PixiJS's MIT notice is in `cottage/vendor/LICENSE.pixi.txt`; bundled library notices are in `cottage/vendor/LICENSE.third-party.txt`. Third-party materials retain their stated licenses.

## Security notes

The page limits scripts and network requests to its own origin, hashes its inline startup script and checks the vendor script's integrity. PixiJS 8.6.6 generates shader/uniform functions at runtime, so the content security policy retains `unsafe-eval`; inline styles are used for responsive positioning. No arbitrary visitor HTML, SVG or color values are accepted.

The bundled @pixi/colord fork retains the parsing pattern affected by the [upstream low-severity color-parser advisory](https://github.com/omgovich/colord/security/advisories/GHSA-2wm5-q62r-hmrv). The scene uses fixed authored colors and does not expose the affected parser to visitor input. A dependency upgrade needs graphics, audio, fallback and Safari checks rather than relying on version numbers alone.
