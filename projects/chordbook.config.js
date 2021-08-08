module.exports = /** @type {TimelapseProjectConfig} */ ({
  async run({ page, capture }) {
    await page.setViewport({ width: 1280, height: 720 })

    await page.goto(
      'https://dtinth-chordbook.netlify.app/chords/everydayevermore.html',
    )
    await capture(page, 'everydayevermore')

    await page.goto('https://dtinth-chordbook.netlify.app/chords/template.html')
    await capture(page, 'template')

    await page.goto(
      'https://dtinth.github.io/chordbook-drafts/tur2qhg-cR4.html',
    )
    await capture(page, 'etc')
  },
})
