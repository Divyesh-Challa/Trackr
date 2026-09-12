import logging
import asyncio
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

class HeadlessScraper:
    def __init__(self):
        self.playwright_available = True

    async def scrape_url(self, url: str, timeout_sec: float = 20.0) -> Dict[str, Any]:
        """
        Scrapes dynamic JavaScript-heavy job boards using Headless Chromium.
        Falls back to resilient HTTP requests if browser automation encounters issues.
        """
        url = url.strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url

        try:
            return await self._scrape_with_playwright(url, timeout_sec)
        except Exception as e:
            logger.warning(f"Headless browser scraping failed for {url}: {e}. Engaging HTTP fallback.")
            return await self._scrape_with_httpx(url)

    async def _scrape_with_playwright(self, url: str, timeout_sec: float) -> Dict[str, Any]:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                ]
            )

            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
            )

            page = await context.new_page()

            # Block heavy, unnecessary assets to accelerate execution
            await page.route(
                "**/*",
                lambda route: route.abort()
                if route.request.resource_type in ["image", "media", "font"]
                else route.continue_()
            )

            logger.info(f"Navigating to {url} with headless Chromium...")
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout_sec * 1000)

            # Allow 1.2s for client-side SPA hydration (Greenhouse, Lever, Workday)
            await asyncio.sleep(1.2)

            title = await page.title()

            # Clean and extract text from DOM
            content = await page.evaluate("""() => {
                const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header, noscript, svg, [role="banner"], [role="navigation"]');
                elementsToRemove.forEach(el => el.remove());

                // Find main job posting container if available
                const jobContainer = document.querySelector('[data-automation-id="jobPostingDescription"], .job-description, .posting-requirements, #content, main') || document.body;
                return jobContainer.innerText;
            }""")

            await browser.close()

            cleaned_content = self._clean_text(content)
            logger.info(f"Playwright successfully scraped {len(cleaned_content)} chars from {url}")

            return {
                "url": url,
                "title": title or "Job Posting",
                "content": cleaned_content,
                "method": "playwright_headless",
                "char_count": len(cleaned_content)
            }

    async def _scrape_with_httpx(self, url: str) -> Dict[str, Any]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "svg", "noscript"]):
                tag.extract()
            text = soup.get_text(separator="\n", strip=True)
            title = soup.title.string.strip() if soup.title and soup.title.string else "Job Posting"

            return {
                "url": url,
                "title": title,
                "content": self._clean_text(text),
                "method": "httpx_fallback",
                "char_count": len(text)
            }

    def _clean_text(self, text: str) -> str:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)

headless_scraper = HeadlessScraper()
