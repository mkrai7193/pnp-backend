/** Minimal, dependency-free HTML page rendered when someone clicks a verification link. */
export function renderVerifyPage(params: {
  ok: boolean
  title: string
  message: string
  frontendUrl: string
}): string {
  const { ok, title, message, frontendUrl } = params
  const color = ok ? '#2a7d1a' : '#c0392b'
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fffdf0; color: #1a1400; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
    .card { max-width: 420px; text-align: center; background: #fff; border: 1px solid rgba(180,150,0,0.18); border-radius: 12px; padding: 32px 28px; }
    h1 { color: ${color}; font-size: 1.4rem; margin-bottom: 12px; }
    a.button { display: inline-block; margin-top: 20px; background: #1b3fab; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${ok ? '✓ ' : ''}${title}</h1>
    <p>${message}</p>
    <a class="button" href="${frontendUrl}">Back to PNP Sports</a>
  </div>
</body>
</html>`
}
