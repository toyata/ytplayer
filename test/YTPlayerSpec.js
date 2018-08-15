describe('YTPlayer', function() {
  // Events
  let _click = document.createEvent('Event')
  _click.initEvent('click', true, true)

  const events = {
    click: _click
  }

  describe('YT', function() {
    it('Load YouTube iframe API', function(done) {
      YTPlayer.dispose()
      window.YT = undefined

      expect(document.documentElement.classList.contains('yt-player-ready')).toBeFalsy()

      YTPlayer.ready().then(() => {
        expect(window.YT).toBeDefined()
        expect(document.documentElement.classList.contains('yt-player-ready')).toBeTruthy()

        YTPlayer.ready().then(() => {
          expect(document.querySelectorAll('[src="https://www.youtube.com/iframe_api"]').length).toBeGreaterThan(0)
        }).then(() => {
          YTPlayer.dispose()
          window.YT = undefined
          return YTPlayer.ready()
        }).then(() => {
          expect(document.querySelectorAll('[src="https://www.youtube.com/iframe_api"]').length).toBeGreaterThan(1)
          done()
        })
      })
    })
  })

  describe('Initialize', function() {
    it('Empty Element', function(done) {
      try {
        let yp = new YTPlayer()
      } catch (e) {
        expect(e.message).toBe('An element must be specified')
        done()
      }
    })

    it('With an element', function() {
      let yp = new YTPlayer(document.getElementById('yt-player'))
      expect(yp.el).toBe(document.getElementById('yt-player'))

      yp.dispose()
    })

    it('CID', function() {
      let yp = new YTPlayer(document.getElementById('yt-player'))
      let yp2 = new YTPlayer(document.getElementById('yt-player'))

      expect(yp._cid == yp2._cid).toBeFalsy()

      yp.dispose()
      yp2.dispose()
    })
  })

  describe('Dispose', function() {
    it('Instance Method', function(done) {
      YTPlayer.ready().then(() => {
        let yp = new YTPlayer(document.getElementById('yt-player'), {id:'drYQmsu5wR4'})
        yp.play()

        yp.dispose().then(() => {
          expect(yp._player).toBeNull()
          expect(yp.el.childNodes.length).toBe(0)
          expect(yp._container).toBeNull()

          done()
        })
      })
    })
  })

  describe('Render', function() {
    it('Should pass', function(done) {
      YTPlayer.ready().then(() => {
        let yp = new YTPlayer(document.getElementById('yt-player'))

        yp._render(document.getElementById('render-test'), 'drYQmsu5wR4').then(player => {
          expect(player.playVideo).toBeDefined()

          player.destroy()

          done()
        })
      })
    })
  })

  describe('Play', function() {
    it('No ID', function(done) {
      let yp = new YTPlayer(document.getElementById('yt-player'))

      try {
        yp.play()
      } catch (e) {
        expect(e.message).toBe('Video ID must be specified')
        yp.dispose()
        done()
      }
    })

    it('Valid ID', function(done) {
      let yp = new YTPlayer(document.getElementById('yt-player'), {id: 'drYQmsu5wR4', vars:{mute:1}})
      let test = {
        test: function () {}
      }

      spyOn(test, 'test')

      yp.el.addEventListener('unstarted', () => {
        test.test()
        expect(yp.el.classList.contains('unstarted')).toBeTruthy()
      }, {once:true})

      yp.el.addEventListener('ready', () => {
        expect(yp.el.classList.contains('unstarted')).toBeFalsy()
        test.test()
      }, {once:true})

      yp.el.addEventListener('playing', () => {
        test.test()

        expect(test.test.calls.count()).toBe(3)

        yp.dispose().then(() => done())
      }, {once:true})

      yp.play()
    })

    it('Two times same ID', function(done) {
      let yp = new YTPlayer(document.getElementById('yt-player'), {id: 'drYQmsu5wR4', vars:{mute:1}})
      let player = null
      
      yp.el.addEventListener('playing', () => {
        player = yp._player
        expect(player).toBeDefined()


        yp.play('drYQmsu5wR4').then(() => {
          expect(player).toBe(yp._player)
          yp.dispose().then(() => done())
        })
      }, {once: true})

      yp.play()
    })
  })

  describe('Cue', function() {
    it('No ID', function(done) {
      try {
        let yp = new YTPlayer(document.getElementById('yt-player'), {cue:true})
      } catch (e) {
        expect(e.message).toBe('Video ID must be specified')
        done()
      }
    })

    it('Cued', function(done) {
      let yp = new YTPlayer(document.getElementById('yt-player'), {id:'drYQmsu5wR4', cue:true})

      yp.el.addEventListener('ready', () => {
        expect(/drYQmsu5wR4/.test(yp._player.getVideoUrl())).toBeTruthy()

        yp.dispose().then(() => done())
      }, {once:true})
    })
  })

  describe('DOM Handler', function() {
    it('youtube.com', function(done) {
      document.querySelector('#yt-player-2 a').dispatchEvent(events.click)

      let player = YTPlayer.instance(document.getElementById('yt-player-2'))

      expect(player instanceof YTPlayer).toBeTruthy()
      expect(YTPlayer.instances.length).toBe(1)

      player.el.addEventListener('playing', () => YTPlayer.dispose().then(() => {
        expect(YTPlayer.instance(document.getElementById('yt-player-2'))).not.toBeDefined()
        expect(YTPlayer.instances.length).toBe(0)
        done()
      }))
    })

    it('youtu.be', function(done) {
      document.querySelector('#yt-player-3 a').dispatchEvent(events.click)

      let player = YTPlayer.instance(document.getElementById('yt-player-3'))

      expect(player instanceof YTPlayer).toBeTruthy()
      expect(player._id).toBe('drYQmsu5wR4', player)

      YTPlayer.dispose().then(() => done())
    })
  })
})
 
