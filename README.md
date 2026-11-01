# PriceMe

A personal phone app for logging supermarket prices. You scan a product's barcode, photograph its shelf price tag, and PriceMe records the price, the shop and the date, so you can see how prices change over time and spot when you're being overcharged.

**Live app:** https://bobbydigital198.github.io/priceme/

Everything runs on your phone. There are no accounts and no server, and it's free to run.

## Contents

1. [Installing on your phone](#installing-on-your-phone)
2. [Using the app](#using-the-app)
3. [Backing up your data](#backing-up-your-data)
4. [What leaves your phone](#what-leaves-your-phone)
5. [Running it on your computer](#running-it-on-your-computer)
6. [Publishing changes](#publishing-changes)
7. [Version numbers](#version-numbers)
8. [Troubleshooting](#troubleshooting)
9. [How the project is organised](#how-the-project-is-organised)

## Installing on your phone

PriceMe is a web app that installs like a normal app. On your Samsung Galaxy S24:

1. Open **Chrome** and go to https://bobbydigital198.github.io/priceme/
2. Tap the **⋮** menu (top right), then **Add to home screen**, then **Install**.
3. Open **PriceMe** from your home screen. It opens full screen, without Chrome's address bar.

The first time you open it, it downloads about 16 MB (mostly the price reader), so do this on wifi. After that it works offline, apart from looking up new products.

### Getting updates

Updates download by themselves in the background. To pick up a new version straight away, close PriceMe completely (swipe it away from your recent apps) and open it again, twice. The version number at the bottom of the home screen tells you which version you have.

## Using the app

- **Scan a product:** tap the yellow button at the bottom right.
  1. Point the camera at the barcode. If it won't scan, tap **Type barcode instead**.
  2. Check the product and tap **Confirm**. Unknown products can be typed in, and PriceMe remembers them.
  3. Fill the white frame with the price tag and tap the shutter button. Or tap **Enter manually** to type the price.
  4. Check the price and the shop, then tap **Save**.
- **The shop** is remembered for 30 minutes, so the rest of a shopping trip needs no taps. Tap the shop to change it.
- **See a product's history:** tap it on the home screen for its stats, a price chart, a per-shop comparison and every scan. Delete a wrong scan from there.
- **Settings** (gear button, top right of the home screen): backups, your saved shops (rename, merge or delete), a price reader test using photos from your gallery, and deleting all data.

## Backing up your data

Your scans are stored **only on your phone**, inside Chrome. If you clear Chrome's data, uninstall Chrome or lose your phone, they're gone. Save a backup now and then:

1. Open **Settings** and tap **Save a backup**.
2. A file called something like `priceme-backup-2026-11-01.json` is saved to your phone's **Downloads** folder.
3. Keep a copy somewhere other than your phone. For example, open the **Files** app, long-press the file, tap **Share** and choose **Drive**, or email it to yourself.

**To restore** (for example on a new phone): install PriceMe, open **Settings**, tap **Restore from a backup** and choose the file. PriceMe shows what the backup contains before doing anything. Restoring **replaces** everything currently in the app.

## What leaves your phone

- **Barcode lookups** go to [Open Food Facts](https://world.openfoodfacts.org), a free, open product database, to get the product's name, brand, pack size and photo. Products are then remembered, so repeat scans don't go online.
- **Your location** is only used if you tap **Use my location** in the shop list. Your approximate position is then sent to OpenStreetMap's Overpass service to find shops within 150 m, and nowhere else. It isn't saved.
- **Price tag photos** never leave your phone. The price reader (Tesseract) runs on the phone itself.

## Running it on your computer

You only need this to change the app. You don't need it to use it.

**Once:** the project needs [Node.js](https://nodejs.org), which is already installed on your PC.

1. Open VS Code, choose **File → Open Folder** and pick `PriceMe_App`.
2. Open a terminal: **Terminal → New Terminal**.
3. The first time, or after the list of libraries changes, type:
   ```
   npm install
   ```
4. Start the app:
   ```
   npm run dev
   ```
5. Open http://localhost:5173/priceme/ in your computer's browser. Changes to the code show up as soon as you save a file.
6. To stop it, click in the terminal and press **Ctrl + C**.

Your computer's copy has its own empty data, separate from your phone's. The camera needs a secure (https) address, so test camera features on the live app on your phone, or use **Settings → Test with a photo** on your computer.

**Other useful commands:**

| Command | What it does |
|---|---|
| `npm test` | Runs the automatic checks, such as reading test price tags and parsing prices. All should pass. |
| `npm run lint` | Checks the code for common mistakes. |
| `npm run build` | Builds the final app into the `dist` folder, as the publishing step does. |

## Publishing changes

The app is hosted free on **GitHub Pages**. Publishing is automatic: every change saved to GitHub is built, checked and published within about two minutes.

1. Save your changes in Git with a short note describing them (a "commit"). In VS Code, open the **Source Control** panel (the branching icon on the left), type a message and click **Commit**.
2. Upload them: click **Sync Changes**, or type `git push` in the terminal.
3. Watch it publish at https://github.com/bobbydigital198/priceme/actions. A green tick means it's live; a red cross means a check failed, and nothing was changed on the live app.

The publishing steps are in `.github/workflows/deploy.yml`. The code itself is public on GitHub; your scans never are.

## Version numbers

The home screen shows **Version 1.x.y**:

- **x** is the build stage, set in `package.json` (e.g. `"version": "1.9.0"` means stage 9). Change it by hand when starting a new stage of work.
- **y** counts every update published so far. It goes up by itself with each commit.

If your phone shows a lower number than the latest update, it hasn't picked up the update yet: see [Getting updates](#getting-updates).

## Troubleshooting

**The camera doesn't open.** Chrome has blocked it. Open Chrome, go to **Settings → Site settings → Camera**, and allow it for bobbydigital198.github.io.

**A price tag isn't read correctly.** Fill the frame with the tag, hold steady and avoid glare. You can always correct the price or tap **Enter manually**. To help improve the reader, save the photo and test it with **Settings → Test with a photo**.

**An update or a new icon doesn't appear.** Close and reopen the app twice. The home-screen icon can take up to a day to refresh. Uninstalling and reinstalling the app updates it straight away, and keeps your data as long as you don't clear Chrome's data. Save a backup first to be safe.

**"Couldn't reach OpenStreetMap"** when using your location: its free service is sometimes busy. Pick or add the shop by hand instead.

## How the project is organised

```
src/
  screens/      One file per screen: Home, BarcodeScan, PriceScan, ConfirmPrice,
                ProductDetail, Settings, OcrTest (price reader test)
  components/   Pieces used by the screens: price chart, shop picker, comparison table…
  lib/
    db.ts            The on-phone database: products, scans, shops
    constants.ts     Settings you can change: the 10% price warning, the 30-minute shop memory
    barcode.ts       Barcode scanning and checking
    openFoodFacts.ts Product lookups
    ocr.ts           Reading price tags (Tesseract), image preparation in imageProcessing.ts
    priceParser.ts   Turning the text on a tag into a price; tested in priceParser.test.ts
    priceRegion.ts   Finding the big price digits on a tag
    shops.ts         Choosing the shop, chain names, the optional nearby-shop search
    stats.ts         Averages, lowest prices and other sums
    backup.ts        Backup file format
tests/          Tests that run the real price reader on sample tag images
public/         App icons (made from icon.svg; see pwa-assets.config.ts)
scripts/        Copies the price reader's files so it works offline
```

Files ending in `.test.ts` are the automatic checks run by `npm test`.
