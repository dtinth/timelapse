module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture, css }) {
    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto('https://dev.to/dtinth', { waitUntil: 'networkidle0' })
    await css(`.js-profile-badge img { transform: rotate(0) !important; }`)
    await capture(page, 'profile')
  },
})
