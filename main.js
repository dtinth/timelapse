const puppeteer = require('puppeteer')
const jimp = require('jimp')
const fs = require('fs')
const glob = require('glob')
const path = require('path')
const imagemin = require('imagemin')
const imageminPngquant = require('imagemin-pngquant')

async function main() {
  const browser = await puppeteer.launch({
    args: ['--single-process'],
  })
  try {
    if (process.argv[2]) {
      await runProject(browser, path.basename(process.argv[2], '.config.js'))
    } else {
      for (const configFile of glob.sync('projects/*.config.js')) {
        try {
          const projectName = path.basename(configFile, '.config.js')
          console.log(`# ${projectName}`)
          await runProject(browser, projectName)
        } catch (error) {
          console.error(error)
          process.exitCode = 1
        }
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
 * @param {Buffer} buffer
 */
async function optimize(buffer) {
  try {
    buffer = await imagemin.buffer(buffer, {
      plugins: [imageminPngquant.default({ quality: [0.6, 0.8] })],
    })
  } catch (error) {
    console.log('Cannot optimize image', error)
  }
  return buffer
}

/**
 * @param {import('puppeteer').Browser} browser
 * @param {string} projectName
 * @return true if new images created
 */
async function runProject(browser, projectName) {
  const configFile = `projects/${projectName}.config.js`
  /** @type {TimelapseProjectConfig} */
  const config = require(fs.realpathSync(configFile))
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1280, height: 720 })
    await config.run({
      browser,
      page,
      capture: async (page, screenshotName = '') => {
        const suffix = `${screenshotName ? '_' : ''}${screenshotName}`
        const target = `projects/${projectName}${suffix}.png`
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

        screenshot = await optimize(screenshot)

        if (!fs.existsSync(target)) {
          console.log('Create: "%s"', target)
          fs.writeFileSync(target, screenshot)
        } else {
          const existingImage = await jimp.read(target)
          const latestImage = await jimp.read(screenshot)
          if (areImagesDifferent(existingImage, latestImage)) {
            fs.writeFileSync(target, screenshot)
            console.log('Update: "%s"', target)
          } else {
            console.log('Up-to-date: "%s"', target)
          }
        }
      },
    })
  } finally {
    await page.close()
  }
}

process.on('unhandledRejection', up => {
  throw up
})

main()
