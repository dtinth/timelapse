type Browser = import('puppeteer').Browser
type Page = import('puppeteer').Page

interface TimelapseProjectConfig {
  run: (context: { browser: Browser; page: Page }) => Promise<void>
}
