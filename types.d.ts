type Browser = import('puppeteer').Browser
type Page = import('puppeteer').Page

interface TimelapseProjectConfig {
  run: (context: {
    browser: Browser
    page: Page
    capture: (page: Page, name?: string) => Promise<void>
    css: (styles: string) => Promise<void>
  }) => Promise<void>
}
