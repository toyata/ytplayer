const YTPlayer = (() => {
  let _cid = 0
  const _instances = []

  class YTPlayer {
    constructor(element, options={}) {
      if (!element || !(element instanceof HTMLElement))
        throw new TypeError('An element must be specified')

      this.el = element
      this._id = options.id
      this._cue = options.cue || false
      this._cid = _cid++
      this._player = null
      this._container = null
      this._renderer = null
      this._vars = {
        showinfo: 0,
        rel: 0,
        autoplay: 1,
        ...options.vars,
      }

      this._onPlayerStateChange = this.onPlayerStateChange.bind(this)

      this._cue && !this._id && this._throwInvalidIdError()

      this._cue && YTPlayer.ready().then(() => {
        return this._renderer = this._render(this._container = this._createContainer(this.el, this._cid), this._id, this._vars)
      })
    }

    play (id=null) {
      let _id = id || this._id

      !this._id && this._throwInvalidIdError()

      if (!this._player || !(new RegExp('[\/=]' + this._id + '$')).test(this._player.getVideoUrl())) {
        this.clear()

        return this._renderer = YTPlayer.ready().then(() => {
          return this._render(this._container = this._createContainer(this.el, this._cid), this._id, this._vars)
        }).then(player => {
          this._player.playVideo()
          this._on('onStateChange', this._player, this._onPlayerStateChange)

          return this
        })
      } else {
        this._player.playVideo()
        return Promise.resolve(this)
      }
    }

    _createContainer(el, id) {
      let container = document.createElement('div')
      container.className = 'video-container'
      container.id = 'video-container-' + id

      el.appendChild(container)

      return container
    }

    pause() {
      this._player && this._player.pauseVideo()
    }

    _emit(type) {
      let event = document.createEvent('Event')
      event.initEvent(type, true, true)

      this.el.dispatchEvent(event)
    }

    _on(event, el, func) {
      el._e = el._e || {}
      el._e[event] = el._e[event] || []

      el.addEventListener(event, func)
      el._e[event].push(func)
    }

    _off(event, el) {
      if (!el || !el._e || !el._e[event]) return;

      el._e[event].forEach(f => {
        el.removeEventListener(event, f)
      })

      delete el._e[event]
    }

    onPlayerStateChange(event) {
      this._clearClasses()

      this.el.classList.remove('unstarted')

      switch (event.data) {
        case YT.PlayerState.ENDED:
          this.el.classList.add('ended')
          this._emit('ended')
          break;
        case YT.PlayerState.PAUSED:
          this.el.classList.add('paused')
          this._emit('paused')
          break;
        case YT.PlayerState.PLAYING:
          this.el.classList.add('playing')
          this._emit('playing')
          break;
      }
    }

    _render(el, id, vars) {
      this.el.classList.add('unstarted')
      this._emit('unstarted')

      return this.__render(el, id, vars).then(player => {
        this._player = player

        this._emit('ready')

        return player
      })
    }

    __render(el, id, vars) {
      return new Promise((resolve, reject) => {
        let player = new YT.Player(el.id, {
          videoId: id,
          events: {
            'onReady': event => resolve(player)
          },
          playerVars: vars,
        })
      })
    }

    clear() {
      let promises = []

      this._clearClasses()
      this._clearVideo()

      this._container && this._container.parentNode && this._container.parentNode.removeChild(this._container)
      this._container = null

      // Kill render chanin
      if (this._renderer) {
        promises.push(this._renderer.then(() => this.clear()))
        this._renderer = null
      }

      return Promise.all(promises)
    }

    _clearVideo() {
      if (this._player) {
        this._off('onStateChange', this._player)

        this._player.stopVideo()
        this._player.clearVideo()
        this._player.destroy()
        this._player = null
      }
    }

    _clearClasses() {
      this.el.classList.remove('unstarted')
      this.el.classList.remove('playing')
      this.el.classList.remove('paused')
      this.el.classList.remove('ended')
    }

    _throwInvalidIdError() {
      throw new TypeError('Video ID must be specified')
    }

    dispose() {
      let clear = this.clear()
      this._id = null

      return Promise.all([clear])
    }

    static instance(el) {
      return el._ytplayer
    }

    static get instances() {
      return _instances
    }

    static create(el, options) {
      let player = el._ytplayer || new YTPlayer(el, options)

      if (!el._ytplayer) {
        el._ytplayer = player
        _instances.push(player)
      }

      return player.play()
    }

    static dispose() {
      let promises = []

      // Kill all players
      _instances.forEach(player => {
        delete player.el._ytplayer
        promises.push(player.dispose())
      })

      _instances.splice(0, _instances.length)

      // Reset classes
      document.documentElement.classList.remove('yt-player-ready')

      return Promise.all(promises)
    }

    static ready() {
      if (!window.YT)
        return new Promise((resolve, reject) => {
          var tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          tag.async = true

          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

          window.onYouTubeIframeAPIReady = () => {
            document.documentElement.classList.add('yt-player-ready')
            resolve()
          }
        })
      else {
        document.documentElement.classList.add('yt-player-ready')
        return Promise.resolve()
      }
    }
  }

  // Click handler
  document.addEventListener('click', e => {
    // Each YTPlayer
    Array.from(document.querySelectorAll('.yt-player')).forEach(yt => {
      // Each trigger
      Array.from(yt.querySelectorAll('[href^="https://www.youtube.com/"], [href^="https://youtu.be/"]')).forEach(el => {
        if (e.target != el && !el.contains(e.target)) return;

        let options = {
          vars: {}
        }

        // Retreave options
        Array.from(yt.attributes).forEach(attr => {
          if (/^data-/.test(attr.name))
            options.vars[attr.name.replace('data-', '')] = attr.value
        })

        // Analyze URL
        let matches = el.getAttribute('href').match(/([\?&]v=|youtu\.be\/)([^&]*)/)

        if (!matches) return;

        options.id = matches[2]
        
        // Kill anchor default behavior
        if (el.tagName === 'A' || el.tagName === 'AREA') {
          e.preventDefault()
        }

        // Create player
        YTPlayer.create(yt, options)
      })
    })
  })


  return YTPlayer
})()

// Export it for webpack
if (typeof module === 'object' && module.exports) {
  module.exports = YTPlayer
}
