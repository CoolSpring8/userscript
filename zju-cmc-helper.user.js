// ==UserScript==
// @name         浙江大学智云课堂小助手
// @description  对智云课堂页面的一些功能增强
// @namespace    https://github.com/CoolSpring8/userscript
// @supportURL   https://github.com/CoolSpring8/userscript/issues
// @version      0.2.1
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
      { name: "生成字幕", func: this.generateSRT.bind(this) },
      { name: "下载课件", func: this.downloadMaterial.bind(this) },
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
        !this._isVueReady(courseElem) ||
        !this._isVueReady(playerElem) ||
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
        this.removeMaskOnce()
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

    const m3u = `#EXTM3U

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

  generateSRT() {
    const url = this.playerVue.player.playervars.url
    const filename_without_ext = url.split("/").pop().split(".")[0]

    const data = this.courseVue.videoTransContent
    const subtitle = data
      .map(
        (item, index) => `${index}
${item.markTime},000 --> ${this._addTime(
          item.markTime,
          item.endPlayMs - item.playMs
        )},000
${item.zhtext}`
      )
      .join("\n\n")

    this._saveTextToFile(subtitle, `${filename_without_ext}.srt`)
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
        this.removeMaskOnce()
      }
    }, 500)
  }

  removeMaskOnce() {
    this.playerVue.player.setMask({})
  }

  // there may be some better solutions
  _addTime(anchor, duration) {
    let hour = Number(anchor.slice(0, 2))
    let minute = Number(anchor.slice(3, 5))
    let second = Number(anchor.slice(6, 8))

    second += duration

    if (second >= 60) {
      second -= 60
      minute += 1
    }
    if (minute >= 60) {
      minute -= 60
      hour += 1
    }

    if (!this._twoDigitFormat) {
      this._twoDigitFormat = new Intl.NumberFormat({ minimumIntegerDigits: 2 })
    }
    const f = this._twoDigitFormat

    return `${f.format(hour)}:${f.format(minute)}:${f.format(second)}`
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

  _isVueReady(elem) {
    return elem !== null && "__vue__" in elem
  }

  _saveTextToFile(text, filename, blobOptions) {
    const file = new Blob([text], blobOptions)
    const url = URL.createObjectURL(file)
    this._downloadFile(url, filename)
    URL.revokeObjectURL(file)
  }
}

const cmcHelper = new CmcHelper()
cmcHelper.init()
window.cmcHelper = cmcHelper
