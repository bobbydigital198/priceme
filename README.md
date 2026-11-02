# PrixIt

A personal phone app for logging supermarket prices. You scan a product's barcode, photograph its shelf price tag, and PrixIt records the price, the shop and the date, so you can see how prices change over time and spot when you're being overcharged.

**Live app:** https://bobbydigital198.github.io/priceme/

(The app was first called PriceMe. The web address and project folder keep that name, because changing the address would separate the installed app from its saved data.)

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

PrixIt is a web app that installs like a normal app. The home screen shows install steps for your phone when you open the link in a browser, and **About** in the menu has them too, with a button to send the link to someone.

**Android (Chrome):**

1. Open https://bobbydigital198.github.io/priceme/ in **Chrome**.
2. Tap **Install PrixIt** if it appears, or the **⋮** menu (top right), then **Add to home screen**, then **Install**.
3. Open **PrixIt** from your home screen.

**iPhone (Safari, or Chrome on iOS 16.4 or later):**

1. Open https://bobbydigital198.github.io/priceme/ in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down, tap **Add to Home Screen**, then **Add**.
4. Open **PrixIt** from your home screen, not from Safari. Its data is kept separately from Safari's.

The first time you open it, it downloads about 16 MB (mostly the price reader), so do this on wifi. After that it works offline, apart from looking up new products. Each person's data stays on their own phone.

### Getting updates

Updates download by themselves in the background. To pick up a new version straight away, close PrixIt completely (swipe it away from your recent apps) and open it again, twice. The version number at the bottom of the home screen tells you which version you have.

## Using the app

- **Scan a product:** tap the yellow button at the bottom right.
  1. Point the camera at the barcode. If it won't scan, tap **Type barcode instead**.
  2. Check the product and tap **Confirm**. Unknown products can be typed in, and PrixIt remembers them.
  3. Fill the white frame with the price tag and tap the shutter button. Or tap **Enter manually** to type the price.
  4. Check the price and the shop, then tap **Save**.
- **The shop** is remembered for 30 minutes, so the rest of a shopping trip needs no taps. Tap the shop to change it.
- **The menu** (☰, top left) moves between the sections:
  - **Scans:** your recent scans, each product once, with its latest price. Tap one for its stats, a price chart, a per-shop comparison and every scan; you can delete a wrong scan or change its category there.
  - **Shops:** your shops, with visits, products and last visit. Tap one to see everything you've bought there and whether it's cheaper or dearer than elsewhere, or to rename, merge or delete it.
  - **Products:** every category, greyed out until you've scanned something in it, with the number of different products in each. Tap a category to see its products.
  - **Settings:** backups, a price reader test using photos from your gallery, and deleting all data.

## Backing up your data

Your scans are stored **only on your phone**, inside Chrome. If you clear Chrome's data, uninstall Chrome or lose your phone, they're gone. Save a backup now and then:

1. Open **Settings** and tap **Save a backup**.
2. A file called something like `prixit-backup-2026-11-01.json` is saved to your phone's **Downloads** folder.
3. On an iPhone it goes to the **Files** app, under Downloads. **Share a backup** (on phones that support it) opens the share sheet instead, to save straight to iCloud Drive, Google Drive or an email.
4. Keep a copy somewhere other than your phone. For example, open the **Files** app, long-press the file, tap **Share** and choose **Drive**, or email it to yourself.

**To restore** (for example on a new phone): install PrixIt, open **Settings**, tap **Restore from a backup** and choose the file. PrixIt shows what the backup contains before doing anything. Restoring **replaces** everything currently in the app.

## What leaves your phone

The full privacy notice and data-licence credits are in the app under **☰ → About**. In short:


- **Barcode lookups** go to [Open Food Facts](https://world.openfoodfacts.org), a free, open product database, to get the product's name, brand, pack size, category and photo. If it doesn't know a barcode (usually non-food, like toilet paper or soap), the barcode is tried at its sister databases [Open Beauty Facts](https://world.openbeautyfacts.org) and [Open Products Facts](https://world.openproductsfacts.org), run by the same non-profit. Products are then remembered, so repeat scans don't go online.
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

**The camera doesn't open.** On Android, open Chrome, go to **Settings → Site settings → Camera**, and allow it for bobbydigital198.github.io. On iPhone, open the **Settings** app, tap **Apps → Safari → Camera**, choose **Ask** or **Allow**, then close and reopen PrixIt.

**A price tag isn't read correctly.** Fill the frame with the tag, hold steady and avoid glare. You can always correct the price or tap **Enter manually**. To help improve the reader, save the photo and test it with **Settings → Test with a photo**.

**An update or a new icon doesn't appear.** Close and reopen the app twice. The home-screen icon can take up to a day to refresh. Uninstalling and reinstalling the app updates it straight away, and keeps your data as long as you don't clear Chrome's data. Save a backup first to be safe.

**"Couldn't reach OpenStreetMap"** when using your location: its free service is sometimes busy. Pick or add the shop by hand instead.

## How the project is organised

```
src/
  screens/      One file per screen: Home (Scans), Shops, ShopDetail, Products, BarcodeScan,
                PriceScan, ConfirmPrice, ProductDetail, Settings, OcrTest (price reader test)
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
    stats.ts         Averages, lowest prices and other sums; shop numbers in shopStats.ts
    categories.ts    Product categories and the rules that sort products into them
    backup.ts        Backup file format
tests/          Tests that run the real price reader on sample tag images
public/         App icons (made from icon.svg; see pwa-assets.config.ts)
scripts/        Copies the price reader's files so it works offline
```

Files ending in `.test.ts` are the automatic checks run by `npm test`.
