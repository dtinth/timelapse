module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto('https://www.youtube.com/channel/UClKPjyxFSkk_dPg6YzN0Miw', { waitUntil: 'networkidle0' })
    await page.evaluate(() => window.scrollBy(0, 256))
    await capture(page, 'channel')
  },
})
