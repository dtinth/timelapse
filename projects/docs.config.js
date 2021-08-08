module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1280, height: 720 })

    await page.goto('https://docs.dt.in.th')
    await capture(page, 'home')

    await page.goto('https://docs.dt.in.th/docs/index.html')
    await capture(page, 'docs')
  },
})
