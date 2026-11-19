# Machine Intelligence — logo pack

An open magazine: a headline and text columns on the left page, a picture with a rising
chart on the right page, and a red ribbon bookmark. A sun-yellow star rises from the spine.
The full emblem puts it inside a round seal with the name and "NFC IET Multan · AI Department".

## Files

| File | Use it for |
|---|---|
| `emblem.svg`, `emblem-1024.png` | main logo: magazine cover, posters, certificates |
| `emblem-light.svg`, `emblem-light-1024.png` | emblem on white or light paper |
| `logo-horizontal.svg` / `.png` | website header, README, letterheads |
| `logo-horizontal-on-dark.svg` | on the dark green band |
| `icon.svg`, `icon-512.png`, `icon-192.png` | app icon, social profile picture |
| `apple-touch-icon.png` | iPhone home screen (180 px) |
| `favicon.svg`, `favicon.ico`, `favicon-32.png`, `favicon-16.png` | browser tab (simplified book) |

All text is turned into shapes, so files look the same on every computer.

## Colours

Band `#1a3a31` · Paper `#f9f7f1` · Ink `#18352e` · Leaf `#347763` · Sun `#f2c46e` · Ribbon `#b9443a`

## In the Next.js app

- `favicon.svg` → `app/icon.svg`
- `favicon.ico` → `app/favicon.ico`
- `apple-touch-icon.png` → `app/apple-icon.png`
- everything else → `public/brand/`

## Rules

- Smallest size: emblem 96 px wide (the ring text gets hard to read below that). Use the icon or favicon for anything smaller.
- Don't stretch, recolour, or add shadows or gradients.

Fonts: Lora and Poppins (both SIL Open Font License).
