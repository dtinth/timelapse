const puppeteer = require('puppeteer')
const jimp = require('jimp')
const fs = require('fs')
const glob = require('glob')
const path = require('path')
const imagemin = require('imagemin')
const imageminPngquant = require('imagemin-pngquant')
const mkdirp = require('mkdirp')
const execa = require('execa')
const yargs = require('yargs')
const pMap = require('p-map')

function main() {
  yargs
    .demandCommand()
    .strict()
    .help()
    .command(
      'capture <project>',
      'Capture screenshot of a project',
      {
        project: {
          type: 'string',
          description: 'The project to run',
        },
        n: {
          type: 'number',
          default: 1,
          description: 'The output number',
        },
      },
      async (args) => {
        const browser = await puppeteer.launch({
          args: ['--single-process', '--font-render-hinting=none'],
        })
        try {
          const projectName = args.project
          const outputDir = `projects-local/${args.n}`
          await runProject(browser, projectName, outputDir)
        } catch (error) {
          console.error(
            `Unable to capture project ${args.project}[${args.n}] due to error:`,
            error,
          )
          process.exitCode = 1
        } finally {
          await browser.close()
        }
      },
    )
    .command(
      'capture-all',
      'Capture all screenshots',
      {
        concurrency: {
          type: 'number',
          default: 3,
          description: 'How many concurrent captures to use',
        },
      },
      async (args) => {
        const taskSets = [[], []]
        for (const projectName of getAllProjectNames()) {
          taskSets[0].push({ projectName, n: 1 })
          taskSets[1].push({ projectName, n: 2 })
        }
        const tasks = taskSets.flatMap((s) => s)
        let done = 0
        await pMap(
          tasks,
          async ({ projectName, n }) => {
            const capture = () =>
              execa('node', ['main', 'capture', projectName, '-n', n], {
                stdio: 'inherit',
                reject: false,
              })
            let result = await capture()
            if (result.exitCode !== 0) {
              result = await capture()
              if (result.exitCode !== 0) {
                result = await capture()
              }
            }
            done++
            console.log(`Finished ${projectName}[${n}] ${done}/${tasks.length}`)
          },
          { concurrency: args.concurrency },
        )
      },
    )
    .command(
      'update',
      'Updates the screenshot if changed',
      {
        dryRun: {
          type: 'boolean',
          default: false,
          alias: 'n',
        },
      },
      async (args) => {
        const actions = []
        for (const projectName of getAllProjectNames()) {
          const imageFilenames = Array.from(
            new Set(
              glob
                .sync(`projects-local/*/${projectName}_*.png`)
                .map((m) => path.basename(m)),
            ),
          )
          for (const imageFilename of imageFilenames) {
            const target = `projects/${imageFilename}`
            const oldImage = new ImageFile(target)
            const newImage1 = new ImageFile(`projects-local/1/${imageFilename}`)
            const newImage2 = new ImageFile(`projects-local/2/${imageFilename}`)
            if (!oldImage.exists()) {
              if (newImage2.exists()) {
                console.log(`* Create "${target}" from "${newImage2.path}"`)
                actions.push(() => newImage2.saveTo(target))
              } else if (newImage1.exists()) {
                console.log(`* Create "${target}" from "${newImage1.path}"`)
                actions.push(() => newImage1.saveTo(target))
              } else {
                console.log(`* Cannot find images for ${target}`)
              }
            } else {
              if (
                (await newImage1.isSimilarTo(oldImage)) ||
                (await newImage2.isSimilarTo(oldImage))
              ) {
                console.log(`* Up-to-date: "${target}"`)
              } else if (newImage2.exists()) {
                console.log(`* Update "${target}" from "${newImage2.path}"`)
                actions.push(() => newImage2.saveTo(target))
              } else if (newImage1.exists()) {
                console.log(`* Update "${target}" from "${newImage1.path}"`)
                actions.push(() => newImage1.saveTo(target))
              } else {
                console.log(`* Cannot find new image for ${target}`)
              }
            }
          }
        }
        if (!args.dryRun) {
          for (const action of actions) {
            await action()
          }
        }
      },
    )
    .command(
      'commit',
      'Commits the updated screenshots',
      {
        dryRun: {
          type: 'boolean',
          default: false,
          alias: 'n',
        },
      },
      async (args) => {
        const changedFiles = (
          await execa('git', ['status', '--porcelain'])
        ).stdout
          .split('\n')
          .map((line) => line.trim().replace(/^\S+\s+/, ''))
        const command = async (exe, ...argv) => {
          console.log(JSON.stringify([exe, ...argv]))
          if (!args.dryRun) {
            await execa(exe, argv, { stdio: 'inherit' })
          }
        }
        const prefix = `📸 ${new Date().toJSON()}`
        for (const projectName of getAllProjectNames()) {
          const filesToCommit = changedFiles.filter((file) =>
            file.startsWith(`projects/${projectName}_`),
          )
          if (filesToCommit.length === 0) {
            continue
          }
          await command('git', 'add', ...filesToCommit)
          await command('git', 'commit', '-m', `${prefix} [${projectName}]`)
        }
      },
    )
    .parse()
}

class ImageFile {
  constructor(path) {
    this.path = path
  }
  exists() {
    return fs.existsSync(this.path)
  }
  async saveTo(target) {
    let buffer = fs.readFileSync(this.path)
    buffer = await optimize(buffer)
    fs.writeFileSync(target, buffer)
    console.log(`* Saved "${target}"`)
  }
  async isSimilarTo(anotherImage) {
    if (!this.exists() || !anotherImage.exists()) {
      return false
    }
    let a = await jimp.read(this.path)
    let b = await jimp.read(anotherImage.path)
    return !areImagesDifferent(a, b)
  }
}

function getAllProjectNames() {
  return glob
    .sync('projects/*.config.js')
    .map((configFile) => path.basename(configFile, '.config.js'))
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
 * @param {string} outputDir
 */
async function runProject(browser, projectName, outputDir) {
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
        mkdirp.sync(outputDir)
        const target = `${outputDir}/${projectName}${suffix}.png`
        const getScreenshot = () =>
          page.screenshot({ encoding: 'binary', type: 'png' })

        let screenshot = await getScreenshot()
        let previousScreenshotImage = await jimp.read(screenshot)
        let start = Date.now()
        const MAX_HP = 5
        let hp = MAX_HP
        for (;;) {
          await new Promise((r) => setTimeout(r, 100))
          screenshot = await getScreenshot()
          const screenshotImage = await jimp.read(screenshot)
          if (areImagesDifferent(previousScreenshotImage, screenshotImage)) {
            previousScreenshotImage = screenshotImage
            hp = MAX_HP
          } else {
            hp--
            if (hp === 0) break
          }
          if (Date.now() >= start + 5e3) {
            console.warn('Give up waiting for animations to finish')
            break
          }
        }

        console.log('Save screenshot to "%s"', target)
        fs.writeFileSync(target, screenshot)
      },
      css: async (stylesheet) => {
        await page.evaluate(async (stylesheet) => {
          const style = document.createElement('style')
          style.textContent = stylesheet
          document.head.appendChild(style)
        }, stylesheet)
      },
    })
  } catch (error) {
    console.error(`Error while running ${projectName}:`, error)
  } finally {
    await page.close()
  }
}

process.on('unhandledRejection', (up) => {
  throw up
})

main()
