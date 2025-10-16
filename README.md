# Visual IG Grid Widget (Notion-embeddable)

A tiny, customizable Instagram-style grid **widget** you can host and embed in Notion (or any site). No Instagram API required.

## How it works
- You deploy this as a static site (Vercel/Netlify).
- Pass image URLs via query params **or** a JSON file.
- Paste the resulting URL into Notion using `/embed`.

## Quick deploy (Vercel)
1. Create a new GitHub repo and add these files, or drag-drop the folder into Vercel.
2. Deploy on **https://vercel.com** (zero config).
3. Your widget will be live at `https://your-app.vercel.app`.

## Usage in Notion
1. In Notion, type `/embed`.
2. Paste a URL like this (one line):
```
https://your-app.vercel.app/?imgs=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1|https%3A%2F%2Fimages.unsplash.com%2Fphoto-2|https%3A%2F%2Fimages.unsplash.com%2Fphoto-3&cols=3&gap=6&radius=8&shadow=1
```
3. Resize the embed block as you like. Background is transparent by default.

> Tip: Host images where hotlinking is allowed (Notion file URLs, Imgur, Cloudinary, your CDN). Instagram direct links often fail due to CORS.

## URL Parameters
- `imgs` — pipe-separated image URLs. Example: `imgs=url1|url2|url3`
- `labels` — optional pipe-separated labels for overlays.
- `cols` — number of columns (default 3).
- `gap` — gap in pixels (default 6).
- `radius` — corner radius in pixels (default 8).
- `shadow=1` — enable drop shadow.
- `bg` — background CSS value (default `transparent`). Example: `bg=%23ffffff`.
- `reverse=1` — reverse order.
- `src` — URL to a JSON file with an array like:
```json
[
  {"url": "https://.../img1.jpg", "label": "Draft"},
  {"url": "https://.../img2.jpg"}
]
```
- `edit=1` — show an on-page control panel (for creators; not needed for end users).

## Sell it
- Point a domain to your Vercel app.
- Create **plans** on Gumroad/Lemon Squeezy/Stripe.
- After purchase, redirect users to a **setup page** that generates their unique embed URL.
- Optionally restrict usage with a `key` parameter checked on your server (upgrade to Next.js + simple key validation).

## License
Yours to customize and sell as your own product.
