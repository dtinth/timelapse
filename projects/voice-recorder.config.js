module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('http://vox.spacet.me')
    await capture(page, 'initial')
  },
})
