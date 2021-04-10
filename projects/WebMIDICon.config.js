module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('https://webmidicon.web.app/')
    await capture(page, 'initial')
    await page.goto('https://webmidicon.web.app/#/piano')
    await capture(page, 'piano')
    await page.goto('https://webmidicon.web.app/#/drums')
    await capture(page, 'drums')
    await page.goto('https://webmidicon.web.app/#/config')
    await capture(page, 'config')
  },
})
