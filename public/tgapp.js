// Running as a Telegram Mini App: Telegram opens the site with its signed launch data in the URL hash.
// We keep that data for the session and send it with every API call, so votes count for the Telegram account.
const KEY = 'ft-tg-init'

export const inTelegram = () => /tgWebAppData=/.test(location.hash) || Boolean(sessionStorage.getItem(KEY))
export const telegramInitData = () => sessionStorage.getItem(KEY) ?? ''

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.append(s)
  })
}

// Returns where to start: a family from the launch link (startapp=<family id>), else the dashboard.
export async function startTelegram() {
  await loadScript('https://telegram.org/js/telegram-web-app.js')
  const app = window.Telegram?.WebApp
  if (!app) return null
  if (app.initData) sessionStorage.setItem(KEY, app.initData)
  app.ready()
  app.expand()
  app.setHeaderColor?.('#0F1311')
  app.setBackgroundColor?.('#0F1311')
  document.body.classList.add('in-telegram')
  const start = app.initDataUnsafe?.start_param ?? ''
  return /^[a-z0-9-]{3,80}$/.test(start) ? `/f/${start}` : '/families'
}

// Telegram's own back button: shown everywhere except the dashboard.
export function syncBackButton(navigate) {
  const back = window.Telegram?.WebApp?.BackButton
  if (!back) return
  back.offClick?.(syncBackButton.handler)
  syncBackButton.handler = () => (history.length > 1 ? history.back() : navigate('/families'))
  if (location.pathname === '/families') back.hide()
  else {
    back.onClick(syncBackButton.handler)
    back.show()
  }
}

export function haptic(kind = 'success') {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(kind)
}
