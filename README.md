# PromptVault ⚡

A vibrant, single-page library of reusable AI prompts. **Fuzzy search** from the center, expand any prompt in an **accordion**, and **copy it in one tap**.

No build step, no dependencies — pure HTML/CSS/JS. Works locally and on GitHub Pages.

**Live:** https://noncent.github.io/promptvault/

## Live / run locally

```bash
# just open the file
open index.html

# or serve it (recommended, enables clipboard API)
python3 -m http.server 8777
# then visit http://localhost:8777
```

## Add your own prompts

All prompts live in [`prompts.js`](prompts.js). Append objects to the `window.PROMPTS` array:

```js
{
  id: "unique-slug",
  title: "Short catchy name",
  category: "Coding",              // becomes a filter chip automatically
  tags: ["keyword", "boosts search"],
  prompt: `The full prompt text that gets copied.`
}
```

Categories and their filter chips are generated automatically from the data.

## Features

- 🔎 Fuzzy search across title, category, tags, and body (with match highlighting)
- 🏷️ Auto-generated category filter chips
- 📋 One-tap copy with toast feedback (Clipboard API + legacy fallback)
- 🌗 Light / dark themes with an animated aurora background (choice persists)
- ⌨️ Keyboard: `/` to focus search, `Esc` to clear, `T` to toggle theme
- 📱 Responsive, energetic UI — zero dependencies

## Project structure

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Energetic theme + layout |
| `app.js` | Fuzzy search, accordion, copy logic |
| `prompts.js` | **Your prompt data** (edit this) |

## License

Not yet specified.
