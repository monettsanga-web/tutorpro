const { app, BrowserWindow, Menu, shell, session, desktopCapturer, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const APP_NAME = 'TutorPro English Classroom'
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL
const appOrigin = isDev ? DEV_SERVER_URL : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`

app.setName(APP_NAME)

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: APP_NAME,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#090510',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  window.once('ready-to-show', () => {
    window.show()
    if (isDev) window.webContents.openDevTools({ mode: 'detach' })
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://www.tutorpro.site') || url.startsWith('https://tutorpro.site') || url.startsWith(DEV_SERVER_URL)) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (isDev && url.startsWith(DEV_SERVER_URL)) return
    if (!isDev && url.startsWith('file://')) return
    if (url.startsWith('https://www.tutorpro.site') || url.startsWith('https://tutorpro.site')) return
    event.preventDefault()
    shell.openExternal(url)
  })

  if (isDev) window.loadURL(DEV_SERVER_URL)
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  return window
}

function configurePermissions() {
  const ses = session.defaultSession

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = new Set([
      'media',
      'microphone',
      'camera',
      'display-capture',
      'fullscreen',
      'notifications',
      'clipboard-read',
      'clipboard-sanitized-write',
    ])
    callback(allowed.has(permission))
  })

  if (ses.setDisplayMediaRequestHandler) {
    ses.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 320, height: 180 },
          fetchWindowIcons: true,
        })
        const preferred = sources.find((source) => /screen/i.test(source.name)) || sources[0]
        callback({ video: preferred, audio: 'loopback' })
      } catch {
        callback({})
      }
    }, { useSystemPicker: true })
  }
}

function createMenu() {
  const template = [
    {
      label: APP_NAME,
      submenu: [
        { label: 'About TutorPro English Classroom', role: 'about' },
        { type: 'separator' },
        { label: 'Quit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Classroom',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Toggle Full Screen', accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Open TutorPro Website', click: () => shell.openExternal('https://www.tutorpro.site') },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    { label: 'View', submenu: [{ role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }] },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

ipcMain.handle('tutorpro:get-app-info', () => ({ name: APP_NAME, version: app.getVersion(), platform: process.platform }))

app.whenReady().then(() => {
  configurePermissions()
  createMenu()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
