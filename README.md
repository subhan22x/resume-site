# Static resume website

No npm, build process, or development server is required.

## Open it

Double-click `index.html`, or right-click it and choose your browser.

## Personalize it

Edit `site-data.js` in any text editor. It contains your name, resume details, projects, articles, and links.

The site consists only of HTML, CSS, JavaScript, and three local font files. `index.html`, `projects.html`, `writing.html`, and `design.html` can be uploaded directly to most static website hosts.

## Edit text while viewing the site

Run the local editor from this folder:

```bash
python3 tools/edit-site.py
```

Open http://127.0.0.1:3090/grow-jewelry.html. Click highlighted text to edit it.
Use the page picker to edit other pages, and **Shared content** for profile text,
project cards, and other values from `site-data.js`. Shared fields containing
HTML keep their existing formatting tags; edit the words around those tags.

- **Save locally** (or Ctrl/Cmd+S) writes edits to the source files and reloads the preview.
- **Preview** hides editing outlines and enables normal links.
- **Reset edits** discards changes since the last save.
- Save before switching pages. Unsaved edits trigger a warning when leaving.

The server listens only on this computer. It injects the editor into local
responses; public pages do not load it. Saving never commits or publishes.
When finished, tell Codex to review and push the saved changes. Stop the editor
with Ctrl+C. Use `--port 3091` if the default port is busy.

Validate the editor with `python3 -m unittest discover -s tools -p 'test_*.py'`.
