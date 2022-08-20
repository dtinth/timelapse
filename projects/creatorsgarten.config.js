module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1280, height: 720 })

    await page.goto('https://creatorsgarten.org/')
    await capture(page, 'home')

    await page.goto('https://creatorsgarten.org/wiki/About/Wiki')
    await capture(page, 'wiki')
  },
})
