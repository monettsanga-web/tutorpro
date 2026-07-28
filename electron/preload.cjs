const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('TutorProClassroomApp', {
  getAppInfo: () => ipcRenderer.invoke('tutorpro:get-app-info'),
  isDesktopApp: true,
})
