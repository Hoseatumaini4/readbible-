# Bible Hours (installable, works offline)

Hourly Bible reading, 6 AM to 9 PM. Hours cycle Love, Hope, Faith. GPS pins, a day map and roll-ups from quaday to year.

## Put it online (needed for GPS and install)
GPS and "Add to Home screen" only work over HTTPS. This is a static site, no build step.
- Vercel: new project from this folder (Framework: Other, no build command), or
- Netlify: drag this folder onto app.netlify.com/drop, or
- GitHub Pages: push the folder, enable Pages.
Open the HTTPS link on your phone, allow location, then Add to Home screen.

## Test on a computer
    python3 -m http.server 8000     # then open http://localhost:8000

## Notes
- All data stays on the device (IndexedDB). Use More > Export backup regularly.
- The hour rule uses the phone clock.
- Map pictures come from OpenStreetMap and are cached for areas you have viewed. The path itself always draws.
