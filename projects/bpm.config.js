module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page }) {
    await page.setViewport({ width: 1280, height: 720 })
    await page.goto('http://bpm.spacet.me')
  },
})
