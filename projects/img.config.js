module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 914, height: 512, deviceScaleFactor: 2 })
    await page.goto('https://img.spacet.me')
    await capture(page, 'initial')
  },
})
