const puppeteer = require('puppeteer')
const jimp = require('jimp')
const tmp = require('tmp')
const fs = require('fs')
const glob = require('glob')
const path = require('path')

async function main() {
  const browser = await puppeteer.launch({
    args: ['--single-process'],
  })
  try {
    for (const configFile of glob.sync('projects/*.config.js')) {
      try {
        const projectName = path.basename(configFile, '.config.js')
        console.log(`# ${projectName}`)
        const config = require(fs.realpathSync(configFile))
        await takeScreenshot(browser, projectName, config)
      } catch (error) {
        console.error(error)
        process.exitCode = 1
      }
    }
  } finally {
    await browser.close()
  }
}

function areImagesDifferent(a, b) {
  if (a.bitmap.width !== b.bitmap.width) return true
  if (a.bitmap.height !== b.bitmap.height) return true
  const diff = jimp.diff(a, b)
  const threshold = 0.001
  return diff.percent > threshold
}

/**
 * @param {import('puppeteer').Browser} browser
 * @param {string} projectName
 * @param {TimelapseProjectConfig} config
 * @return true if new images created
 */
async function takeScreenshot(browser, projectName, config) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 720 })
  try {
    const target = `projects/${projectName}.png`
    await config.run({ browser, page })
    const getScreenshot = () =>
      page.screenshot({ encoding: 'binary', type: 'png' })

    let screenshot = await getScreenshot()
    let previousScreenshotImage = await jimp.read(screenshot)
    let start = Date.now()
    for (;;) {
      await new Promise(r => setTimeout(r, 100))
      screenshot = await getScreenshot()
      const screenshotImage = await jimp.read(screenshot)
      if (areImagesDifferent(previousScreenshotImage, screenshotImage)) {
        previousScreenshotImage = screenshotImage
      } else {
        break
      }
      if (Date.now() >= start + 5e3) {
        console.warn('Give up waiting for animations to finish')
        break
      }
    }

    if (!fs.existsSync(target)) {
      console.log('Create: "%s"', target)
      fs.writeFileSync(target, screenshot)
      return true
    } else {
      const existingImage = await jimp.read(target)
      const latestImage = await jimp.read(screenshot)
      if (areImagesDifferent(existingImage, latestImage)) {
        fs.writeFileSync(target, screenshot)
        console.log('Update: "%s"', target)
        return false
      } else {
        console.log('Up-to-date: "%s"', target)
        return true
      }
    }
  } finally {
    await page.close()
  }
}

process.on('unhandledRejection', up => {
  throw up
})

main()
