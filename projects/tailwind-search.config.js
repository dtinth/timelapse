module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 914, height: 512, deviceScaleFactor: 2 })
    await page.goto('https://tailwind.spacet.me')
    await page.type('input[type="search"]', 'font-size')
    await page.waitForSelector('.vue-recycle-scroller__item-view')
    await capture(page, 'results')
  },
})
