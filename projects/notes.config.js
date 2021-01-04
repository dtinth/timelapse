module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1280, height: 720 })

    await page.goto('https://notes.dt.in.th/20201205T185137Z4313')
    await capture(page, 'about')

    await page.goto('https://notes.dt.in.th/')
    await capture(page, 'home')
  },
})
