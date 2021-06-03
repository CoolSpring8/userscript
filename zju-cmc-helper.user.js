// ==UserScript==
// @name         浙江大学智云课堂小助手
// @description  对智云课堂页面的一些功能增强
// @namespace    https://github.com/CoolSpring8/userscript
// @supportURL   https://github.com/CoolSpring8/userscript/issues
// @version      0.3.1
// @author       CoolSpring
// @license      MIT
// @match        *://livingroom.cmc.zju.edu.cn/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

const IS_REMOVING_MASK = true
const ENABLE_ENHANCE_PPT = true
const M3U_EXTGRP_NAME = "ZJU-CMC"

const querySelector = (
  window.wrappedJSObject.document || document
).querySelector.bind(document)
const myWindow = window.wrappedJSObject || window

class CmcHelper {
  constructor() {
    this.loaded = false
    this.features = [
      {
        name: "重新加载播放器",
        func: this.reloadPlayer.bind(this),
        description: "播放卡住了点这个",
      },
      {
        name: "获取当前视频地址",
        func: this.getCurrentVideoURL.bind(this),
        description: "回放和直播中均可用",
      },
      {
        name: "生成字幕",
        func: this.generateSRT.bind(this),
        description: "可供本地播放器使用。不太靠谱的样子",
      },
      {
        name: "下载课件",
        func: this.downloadMaterial.bind(this),
        description: "包含截图和语音识别结果的文档",
      },
      {
        name: "生成播放列表",
        func: this.generateM3U.bind(this),
        description: "可以在本地播放器中使用的m3u文件。也许期末很实用",
      },
    ]
  }

  init() {
    const _init = () => {
      if (this.loaded) {
        return
      }

      const courseElem = querySelector(".course-info__wrapper")
      const playerElem = querySelector("#cmcPlayer_container")

      if (
        !this._isVueReady(courseElem) ||
        !this._isVueReady(playerElem) ||
        !("CmcMediaPlayer" in myWindow)
      ) {
        requestIdleCallback(_init)
        return
      }

      this.courseVue = courseElem.__vue__
      this.playerVue = playerElem.__vue__

      if (!("player" in this.playerVue && "setMask" in this.playerVue.player)) {
        requestIdleCallback(_init)
        return
      }

      const rawToolbar = querySelector(".course-info__header—toolbar")
      const helperToolbar = document.createElement("div")
      for (const { name, func, description } of this.features) {
        helperToolbar.append(this._createButton(name, func, description))
      }
      helperToolbar.style.display = "flex"
      helperToolbar.style.marginRight = "1.5px"
      rawToolbar.prepend(helperToolbar)

      if (IS_REMOVING_MASK) {
        this.removeMaskOnce()
      }

      if (ENABLE_ENHANCE_PPT) {
        this.enablePPTEnhance()
      }

      this.enableSpeechEnhance()

      this.loaded = true

      console.log(
        // eslint-disable-next-line no-undef
        `[CmcHelper] ${GM.info.script.name} v${GM.info.script.version} has been successfully loaded.`
      )
    }

    requestIdleCallback(_init)
  }

  downloadMaterial() {
    const sub_id = this.courseVue.sub_id
    const url = `http://course.cmc.zju.edu.cn/v2/export/download-sub-ppt?&sub_id=${sub_id}`
    window.open(url)
  }

  enablePPTEnhance() {
    const _init = () => {
      this.pptVue = this.pptVue || querySelector(".ppt-wrapper").__vue__

      // feat: 允许PPT直接跳转到特定页码
      const pageElem = querySelector(".ppt-pagination-item > span:first-child")
      pageElem.contentEditable = true

      // 防止输入框内出现换行
      pageElem.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          e.currentTarget.blur()
        }
      })

      pageElem.addEventListener("blur", (e) => {
        this.pptVue.setPPTpage(Number(e.currentTarget.textContent))
      })

      // feat: 避免白色背景PPT切换页码时出现闪烁
      querySelector("#ppt_canvas").getContext("2d").clearRect = () => {}

      // feat: 允许直播时不自动跳转到PPT最新一页
      const t = document.createElement("div")
      t.className = "ppt-thumbtack"
      t.title = "直播时不自动跳转到PPT最新一页"
      t.style.display = "flex"
      t.style.cursor = "pointer"
      t.style.marginRight = "20px"

      // icons from tabler-icons.io, licensed under MIT
      // https://github.com/tabler/tabler-icons/blob/master/LICENSE
      const iconPinned = `<svg xmlns="http://www.w3.org/2000/svg" id="ppt-pinned" class="icon icon-tabler icon-tabler-pinned" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" display="none">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
          <path d="M9 4v6l-2 4v2h10v-2l-2 -4v-6"></path>
          <line x1="12" y1="16" x2="12" y2="21"></line>
          <line x1="8" y1="4" x2="16" y2="4"></line>
       </svg>`

      const iconPinnedOff = `<svg xmlns="http://www.w3.org/2000/svg" id="ppt-pinned-off" class="icon icon-tabler icon-tabler-pinned-off" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
   <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
   <line x1="3" y1="3" x2="21" y2="21"></line>
   <path d="M15 4.5l-3.249 3.249m-2.57 1.433l-2.181 .818l-1.5 1.5l7 7l1.5 -1.5l.82 -2.186m1.43 -2.563l3.25 -3.251"></path>
   <line x1="9" y1="15" x2="4.5" y2="19.5"></line>
   <line x1="14.5" y1="4" x2="20" y2="9.5"></line>
</svg>`

      t.insertAdjacentHTML("afterbegin", iconPinned)
      t.insertAdjacentHTML("afterbegin", iconPinnedOff)

      t.addEventListener("click", (e) => {
        const q = e.currentTarget.querySelector.bind(e.currentTarget)

        if (!this.pptPinned) {
          this.__initCanvas = this.pptVue.initCanvas
          this.pptVue.initCanvas = (type) => {
            if (type !== "latest") {
              this.__initCanvas(type)
            }
          }
          this.pptPinned = true
          q("#ppt-pinned-off").setAttribute("display", "none")
          q("#ppt-pinned").removeAttribute("display")
          return
        }

        this.pptVue.initCanvas = this.__initCanvas
        this.pptPinned = false
        q("#ppt-pinned").setAttribute("display", "none")
        q("#ppt-pinned-off").removeAttribute("display")
      })

      querySelector(".ppt-switch-button").prepend(t)
    }

    // 因为每次大小窗口切换时部分页面元素都会被重新创建，所以需要再次修改
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (
          m.type === "childList" &&
          Array.from(m.addedNodes).filter((n) => n.className === "ppt-wrapper")
            .length !== 0
        ) {
          _init()
        }
      }
    })

    observer.observe(querySelector(".course-info__main"), { childList: true })
  }

  enableSpeechEnhance() {
    const scopeId = this.courseVue.$options._scopeId
    const preventedTag = "data-cmchelper-prevented"

    const d = document.createElement("div")
    d.setAttribute(scopeId, "") // for style
    d.setAttribute(preventedTag, "false")
    d.className = "choose-item-info"

    const s = document.createElement("span")
    s.setAttribute(scopeId, "")
    s.innerText = "阻止滚动"
    s.innerHTML += " " // align with other switches

    const i = document.createElement("i")
    i.setAttribute(scopeId, "")
    i.className = "el-icon-check"
    i.style.display = "none"

    d.append(s, i)

    d.addEventListener("click", (e) => {
      const wrap = this.courseVue.$refs.spokenLanguageScrollbar.wrap
      const st = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop")

      if (e.currentTarget.getAttribute(preventedTag) === "false") {
        Object.defineProperty(wrap, "scrollTop", {
          get: function () {
            return st.get.apply(this, arguments)
          },
          set: function () {},
          configurable: true,
        })
        e.currentTarget.setAttribute(preventedTag, "true")
        i.style.removeProperty("display")
        return
      }
      Object.defineProperty(wrap, "scrollTop", {
        get: function () {
          return st.get.apply(this, arguments)
        },
        set: function () {
          st.set.apply(this, arguments)
        },
        configurable: true,
      })
      e.currentTarget.setAttribute("data-cmchelper-prevented", "false")
      i.style.display = "none"
    })

    querySelector(".choose-item").prepend(d)
  }

  generateM3U() {
    const courseName = this.courseVue.courseName
    const teacherName = this.courseVue.teacherName
    // FIXME: a workaround for "Error: Permission denied to access object" in Firefox + Greasemonkey env
    const menuData = [...this.courseVue.menuData]
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

    // FIXME: a workaround for "Error: Permission denied to access object" in Firefox + Greasemonkey env
    const data = [...this.courseVue.videoTransContent]
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

  getCurrentVideoURL() {
    if (this.playerVue.liveType === "live") {
      // may be changed to `multi` someday
      const sources = JSON.parse(
        cmcHelper.playerVue.liveUrl.replace("mutli-rate: ", "")
      )
      prompt(
        "请复制到支持HLS的播放器（例如MPC-HC、PotPlayer、mpv）中使用",
        sources[0].url
      )
      return
    }
    const url = querySelector("#cmc_player_video").src
    prompt("已选中，请自行复制到剪贴板", url)
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

    this._twoDigitFormat =
      this._twoDigitFormat || new Intl.NumberFormat({ minimumIntegerDigits: 2 })
    const f = this._twoDigitFormat

    return `${f.format(hour)}:${f.format(minute)}:${f.format(second)}`
  }

  _createButton(text, fn, title) {
    const button = document.createElement("button")
    button.innerText = text
    button.title = title
    button.style.margin = "1.5px"
    button.addEventListener("click", fn)
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
// For debugging purposes
myWindow.cmcHelper = cmcHelper
