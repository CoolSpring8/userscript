// ==UserScript==
// @name         浙江大学智云课堂小助手
// @description  对智云课堂页面的一些功能增强
// @namespace    https://github.com/CoolSpring8/userscript
// @supportURL   https://github.com/CoolSpring8/userscript/issues
// @version      0.1.1
// @author       CoolSpring
// @license      MIT
// @match        *://livingroom.cmc.zju.edu.cn/*
// @grant        none
// ==/UserScript==

const M3U_EXTGRP_NAME = "ZJU-CMC"

const showLoadedMessage = () => {
  console.log(
    // eslint-disable-next-line no-undef
    `${GM.info.script.name} v${GM.info.script.version} has been successfully loaded.`
  )
}

const addToolbar = () => {
  const rawToolbar = document.querySelector(".course-info__header—toolbar")
  const helperToolbar = document.createElement("div")

  const removeMaskButton = _createButton("去除学号水印", removeMask)

  const generateM3UButton = _createButton("生成播放列表", generateM3U)

  const exportMaterialButton = _createButton("导出此次课课件", exportMaterial)

  helperToolbar.append(
    removeMaskButton,
    generateM3UButton,
    exportMaterialButton
  )
  rawToolbar.prepend(helperToolbar)
}

const removeMask = () => {
  const mask = document.querySelector(".expand-mask")
  if (mask) {
    mask.remove()
  }
}

const generateM3U = () => {
  const courseVueInstance = document.querySelector(".course-info__wrapper")
    .__vue__

  const courseName = courseVueInstance.courseName
  const teacherName = courseVueInstance.teacherName
  const menuData = courseVueInstance.menuData
  const academicYear = JSON.parse(courseVueInstance.liveInfo.information).kkxn
  const semester = JSON.parse(courseVueInstance.liveInfo.information).kkxq

  let m3u = `#EXTM3U
  
#PLAYLIST:${courseName}
#EXTGRP:${M3U_EXTGRP_NAME}
#EXTALB:${courseName}
#EXTART:${teacherName}
  
${menuData
  .filter((menu) => "playback" in menu.content)
  // filter() has already created a new array, so we don't need to make a copy manually to avoid the side effects of sort().
  .sort((a, b) => a.course_begin - b.course_begin)
  .map(
    (menu) =>
      `#EXTINF:${menu.duration},${menu.title}\n${menu.content.playback.url[0]}\n`
  )
  .join("\n")}`

  _saveTextToFile(
    m3u,
    `${courseName}-${teacherName}-${academicYear}${semester}.m3u`
  )
}

const exportMaterial = () => {
  const sub_id = document.querySelector(".course-info__wrapper").__vue__.sub_id
  const url = `http://course.cmc.zju.edu.cn/v2/export/download-sub-ppt?&sub_id=${sub_id}`
  window.open(url)
}

const _saveTextToFile = (text, filename, blobOptions) => {
  const a = document.createElement("a")
  const file = new Blob([text], blobOptions)
  const url = URL.createObjectURL(file)
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(file)
}

const _createButton = (text, fn) => {
  const button = document.createElement("button")
  button.innerText = text
  button.onclick = fn
  return button
}

const initHelper = () => {
  addToolbar()
  showLoadedMessage()
}

setTimeout(initHelper, 10000)
