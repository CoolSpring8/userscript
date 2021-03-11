// ==UserScript==
// @name         浙江大学智云课堂小助手
// @description  对智云课堂页面的一些功能增强
// @namespace    https://github.com/CoolSpring8/userscript
// @supportURL   https://github.com/CoolSpring8/userscript/issues
// @version      0.2.0
// @author       CoolSpring
// @license      MIT
// @match        *://livingroom.cmc.zju.edu.cn/*
// @grant        none
// ==/UserScript==

const IS_REMOVING_MASK = true
const M3U_EXTGRP_NAME = "ZJU-CMC"

class CmcHelper {
  constructor() {
    this.loaded = false
    this.features = [
      { name: "重新加载播放器", func: this.reloadPlayer.bind(this) },
      { name: "新标签页打开当前视频", func: this.openCurrentVideo.bind(this) },
      { name: "下载本次课课件", func: this.downloadMaterial.bind(this) },
      { name: "生成播放列表", func: this.generateM3U.bind(this) },
    ]
  }

  init() {
    const _init = () => {
      if (this.loaded) {
        return
      }

      const courseElem = document.querySelector(".course-info__wrapper")
      const playerElem = document.querySelector("#cmcPlayer_container")

      if (
        courseElem === null ||
        !("__vue__" in courseElem) ||
        playerElem === null ||
        !("__vue__" in playerElem) ||
        !("CmcMediaPlayer" in window)
      ) {
        requestIdleCallback(_init)
        return
      }

      this.courseVue = courseElem.__vue__
      this.playerVue = playerElem.__vue__

      if (!("player" in this.playerVue)) {
        requestIdleCallback(_init)
        return
      }

      const rawToolbar = document.querySelector(".course-info__header—toolbar")
      const helperToolbar = document.createElement("div")
      for (const { name, func } of this.features) {
        helperToolbar.append(this._createButton(name, func))
      }
      rawToolbar.style.alignItems = "center"
      rawToolbar.prepend(helperToolbar)

      if (IS_REMOVING_MASK) {
        this.removeMask()
      }

      this.loaded = true

      console.log(
        // eslint-disable-next-line no-undef
        `${GM.info.script.name} v${GM.info.script.version} has been successfully loaded.`
      )
    }

    requestIdleCallback(_init)
  }

  downloadMaterial() {
    const sub_id = this.courseVue.sub_id
    const url = `http://course.cmc.zju.edu.cn/v2/export/download-sub-ppt?&sub_id=${sub_id}`
    window.open(url)
  }

  generateM3U() {
    const courseName = this.courseVue.courseName
    const teacherName = this.courseVue.teacherName
    const menuData = this.courseVue.menuData
    const academicYear = JSON.parse(this.courseVue.liveInfo.information).kkxn
    const semester = JSON.parse(this.courseVue.liveInfo.information).kkxq

    let m3u = `#EXTM3U

#PLAYLIST:${courseName}
#EXTGRP:${M3U_EXTGRP_NAME}
#EXTALB:${courseName}
#EXTART:${teacherName}

${menuData
  .filter((menu) => "playback" in menu.content)
  .map(
    (menu) =>
      `#EXTINF:${menu.duration},${menu.title}\n${menu.content.playback.url[0]}\n`
  )
  .join("\n")}`

    this._saveTextToFile(
      m3u,
      `${courseName}-${teacherName}-${academicYear}${semester}.m3u`
    )
  }

  openCurrentVideo() {
    const url = this.playerVue.player.playervars.url
    window.open(url)
  }

  reloadPlayer() {
    const time = this.playerVue.player.getPlayTime()
    this.playerVue.player.destroy()
    this.playerVue.initPlayer()
    setTimeout(() => {
      this.playerVue.player.seekPlay(time)
      if (IS_REMOVING_MASK) {
        this.removeMask()
      }
    }, 500)
  }

  removeMask() {
    this.playerVue.player.setMask({})
  }

  _createButton(text, fn) {
    const button = document.createElement("button")
    button.innerText = text
    button.onclick = fn
    button.style.margin = "1.5px"
    return button
  }

  _downloadFile(url, filename) {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  _saveTextToFile(text, filename, blobOptions) {
    const file = new Blob([text], blobOptions)
    const url = URL.createObjectURL(file)
    this._downloadFile(url, filename)
    URL.revokeObjectURL(file)
  }
}

let cmcHelper = new CmcHelper()
cmcHelper.init()
window.cmcHelper = cmcHelper
