module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('https://webmidicon.web.app/')
    await capture(page, 'initial')
  },
})
