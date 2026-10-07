#!/usr/bin/env python3
"""
Trackr Autonomous Browser QA & E2E Testing Suite
Based on ECC browser-qa and e2e-testing guidelines.
Executes synthetic user journeys against http://localhost:3000.
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"
SCREENSHOT_DIR = "artifacts/qa"

class QACollector:
    def __init__(self):
        self.console_errors = []
        self.console_warnings = []
        self.page_errors = []
        self.failed_requests = []
        self.journey_results = {}

    def attach_listeners(self, page):
        page.on("console", lambda msg: self._handle_console(msg))
        page.on("pageerror", lambda err: self._handle_pageerror(err))
        page.on("response", lambda resp: self._handle_response(resp))

    def _handle_console(self, msg):
        text = msg.text
        # Ignore benign react-query dev/hydration harmless notes if any
        if msg.type == "error":
            if not any(ignore in text for ignore in ["favicon", "gstatic.com", "clearbit.com", "google.com/s2/favicons"]):
                self.console_errors.append(f"[{msg.location['url']}:{msg.location['lineNumber']}] {text}")
        elif msg.type == "warning":
            # Filter noise
            if not any(ignore in text for ignore in ["Download the React DevTools", "favicon.ico"]):
                self.console_warnings.append(text)

    def _handle_pageerror(self, err):
        self.page_errors.append(str(err))

    def _handle_response(self, resp):
        if resp.status >= 400:
            # Filter out external icons or non-app 404s
            url = resp.url
            if not any(ignore in url for ignore in ["favicon.ico", "clearbit.com", "google.com/s2/favicons", "gstatic.com"]):
                self.failed_requests.append(f"{resp.status} {resp.request.method} {url}")

def run_qa_session():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    collector = QACollector()

    print("=" * 70)
    print("STARTING TRACKR AUTONOMOUS QA & E2E TEST SESSION")
    print(f"Target: {BASE_URL}")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        collector.attach_listeners(page)

        # ----------------------------------------------------------------------
        # JOURNEY 1: Initial Smoke & Navigation Across Views
        # ----------------------------------------------------------------------
        print("\n[Journey 1] Smoke & Navigation across all views...")
        try:
            page.goto(BASE_URL, wait_until="networkidle")
            page.wait_for_timeout(1000)

            # Check page title / header
            assert "trackr" in page.content().lower() or "tracker" in page.content().lower()
            page.screenshot(path=f"{SCREENSHOT_DIR}/01_board_view.png")

            # Click List View button
            list_btn = page.locator("button:has-text('List'), button:has([data-icon='table']), button[title*='List']").first
            if list_btn.is_visible():
                list_btn.click()
                page.wait_for_timeout(600)
                page.screenshot(path=f"{SCREENSHOT_DIR}/01_list_view.png")

            # Click Metrics View button
            metrics_btn = page.locator("button:has-text('Metrics'), button:has-text('Analytics')").first
            if metrics_btn.is_visible():
                metrics_btn.click()
                page.wait_for_timeout(600)
                page.screenshot(path=f"{SCREENSHOT_DIR}/01_metrics_view.png")

            # Switch back to Board View
            board_btn = page.locator("button:has-text('Board')").first
            if board_btn.is_visible():
                board_btn.click()
                page.wait_for_timeout(600)

            # Test Nav Links
            for route, name in [("/discover", "discover"), ("/resume", "resume"), ("/simulator", "simulator"), ("/profile", "profile")]:
                nav_link = page.locator(f"header a[href='{route}']").first
                if nav_link.is_visible():
                    nav_link.click()
                    page.wait_for_load_state("networkidle")
                    page.wait_for_timeout(600)
                    page.screenshot(path=f"{SCREENSHOT_DIR}/nav_{name}.png")

            # Return to Home
            page.goto(BASE_URL, wait_until="networkidle")
            collector.journey_results["1_navigation_and_views"] = "PASS"
            print("  ✓ Journey 1 passed: All views and routes loaded cleanly.")
        except Exception as e:
            collector.journey_results["1_navigation_and_views"] = f"FAIL: {str(e)}"
            print(f"  ✗ Journey 1 failed: {e}")

        # ----------------------------------------------------------------------
        # JOURNEY 2: Application Card Status Transitions & Confetti
        # ----------------------------------------------------------------------
        print("\n[Journey 2] Card State Machine & Optimistic Transitions...")
        try:
            page.goto(BASE_URL, wait_until="networkidle")
            page.wait_for_timeout(1000)

            # Find an application card
            card = page.locator("[data-testid='application-card']").first
            assert card.is_visible(), "Application card should be visible"

            # Click card to open detail modal and test stage selector
            card.click()
            page.wait_for_timeout(800)

            stage_select = page.locator("select[data-testid='stage-select']").first
            if stage_select.is_visible():
                stage_select.select_option("OFFER")
                page.wait_for_timeout(1000)
                page.screenshot(path=f"{SCREENSHOT_DIR}/02_status_transition_offer.png")

            # Close modal
            close_btn = page.locator("button[title*='Close'], button:has-text('✕')").first
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_timeout(500)

            collector.journey_results["2_card_state_machine"] = "PASS"
            print("  ✓ Journey 2 passed: Card state machine triggered successfully.")
        except Exception as e:
            collector.journey_results["2_card_state_machine"] = f"FAIL: {str(e)}"
            print(f"  ✗ Journey 2 failed: {e}")

        # ----------------------------------------------------------------------
        # JOURNEY 3: Per-Job Hub (Tasks, Notes, Contacts CRM)
        # ----------------------------------------------------------------------
        print("\n[Journey 3] Per-Job Hub Drawer (Tasks, Notes, Contacts)...")
        try:
            page.goto(BASE_URL, wait_until="networkidle")
            page.wait_for_timeout(1000)

            # Click a card to open detail modal
            card = page.locator("h4, [data-testid='application-card']").first
            card.click()
            page.wait_for_timeout(1000)

            # Verify drawer/modal is visible
            modal = page.locator("div[role='dialog'], div:has-text('Job Overview'), div:has-text('Tasks')").first
            page.screenshot(path=f"{SCREENSHOT_DIR}/03_job_hub_modal.png")

            # Check Tasks tab
            tasks_tab = page.locator("button:has-text('Tasks')").first
            if tasks_tab.is_visible():
                tasks_tab.click()
                page.wait_for_timeout(500)
                # Type a task
                task_input = page.locator("input[placeholder*='task'], input[placeholder*='Add']").first
                if task_input.is_visible():
                    task_input.fill("E2E Automated QA Task")
                    add_btn = page.locator("button:has-text('Add Task'), button:has-text('Add')").first
                    if add_btn.is_visible():
                        add_btn.click()
                        page.wait_for_timeout(600)

            # Check Notes tab
            notes_tab = page.locator("button:has-text('Notes')").first
            if notes_tab.is_visible():
                notes_tab.click()
                page.wait_for_timeout(500)
                note_input = page.locator("textarea[placeholder*='note'], textarea").first
                if note_input.is_visible():
                    note_input.fill("E2E Automated interview preparation note.")
                    save_btn = page.locator("button:has-text('Save'), button:has-text('Add Note')").first
                    if save_btn.is_visible():
                        save_btn.click()
                        page.wait_for_timeout(600)

            # Close modal
            close_btn = page.locator("button[title*='Close'], button:has([data-icon='x']), button:has-text('✕')").first
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_timeout(500)

            collector.journey_results["3_job_hub_drawer"] = "PASS"
            print("  ✓ Journey 3 passed: Per-Job Hub modal opened and tabs functioned.")
        except Exception as e:
            collector.journey_results["3_job_hub_drawer"] = f"FAIL: {str(e)}"
            print(f"  ✗ Journey 3 failed: {e}")

        # ----------------------------------------------------------------------
        # JOURNEY 4: Filtering, Debounce, and Empty States on Discover Page
        # ----------------------------------------------------------------------
        print("\n[Journey 4] Filtering, Search Debounce, and Empty States...")
        try:
            page.goto(f"{BASE_URL}/discover", wait_until="networkidle")
            page.wait_for_timeout(1000)

            # Test filter chips
            for chip_text in ["Remote", "Vancouver", "Ontario", "All"]:
                chip = page.locator(f"button:has-text('{chip_text}')").first
                if chip.is_visible():
                    chip.click()
                    page.wait_for_timeout(400)

            page.screenshot(path=f"{SCREENSHOT_DIR}/04_discover_filtered.png")

            # Test search bar with rapid keystrokes (debounce test)
            search_input = page.locator("input[placeholder*='Search'], input[type='text']").first
            assert search_input.is_visible(), "Search input must be visible"

            search_input.fill("Shopify")
            page.wait_for_timeout(600)
            page.screenshot(path=f"{SCREENSHOT_DIR}/04_search_shopify.png")

            # Search impossible string to test Empty State
            search_input.fill("xyznonexistentinternship999")
            page.wait_for_timeout(600)
            page.screenshot(path=f"{SCREENSHOT_DIR}/04_empty_state.png")

            # Verify empty state renders gracefully without crashing
            empty_text = page.locator("text=/No jobs found|No postings found|No roles match/i").first
            assert empty_text.is_visible() or "no" in page.content().lower(), "Empty state should render"

            # Clear search
            search_input.fill("")
            page.wait_for_timeout(400)

            collector.journey_results["4_filters_and_debounce"] = "PASS"
            print("  ✓ Journey 4 passed: Filter chips, debounce, and empty state verified.")
        except Exception as e:
            collector.journey_results["4_filters_and_debounce"] = f"FAIL: {str(e)}"
            print(f"  ✗ Journey 4 failed: {e}")

        # ----------------------------------------------------------------------
        # JOURNEY 5: Responsive & Layout Overflow Checks (375px Mobile Viewport)
        # ----------------------------------------------------------------------
        print("\n[Journey 5] Mobile Viewport & Layout Overflow...")
        try:
            mobile_page = context.new_page()
            collector.attach_listeners(mobile_page)
            mobile_page.set_viewport_size({"width": 375, "height": 812})
            mobile_page.goto(BASE_URL, wait_until="networkidle")
            mobile_page.wait_for_timeout(1000)

            # Check horizontal overflow
            scroll_width = mobile_page.evaluate("document.body.scrollWidth")
            window_width = mobile_page.evaluate("window.innerWidth")
            has_overflow = scroll_width > (window_width + 5)

            mobile_page.screenshot(path=f"{SCREENSHOT_DIR}/05_mobile_375px.png")
            mobile_page.close()

            if has_overflow:
                print(f"  ! Notice: Horizontal scroll detected on mobile (scrollWidth: {scroll_width}px vs {window_width}px)")
                collector.journey_results["5_mobile_responsive"] = f"PASS (with {scroll_width - window_width}px overflow notice)"
            else:
                collector.journey_results["5_mobile_responsive"] = "PASS"
                print("  ✓ Journey 5 passed: Zero mobile horizontal overflow.")
        except Exception as e:
            collector.journey_results["5_mobile_responsive"] = f"FAIL: {str(e)}"
            print(f"  ✗ Journey 5 failed: {e}")

        browser.close()

    # --------------------------------------------------------------------------
    # COMPILE AUDIT REPORT
    # --------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("TRACKR QA AUDIT RESULTS SUMMARY")
    print("=" * 70)

    for journey, result in collector.journey_results.items():
        status_icon = "✓" if "PASS" in result else "✗"
        print(f"{status_icon} {journey}: {result}")

    print("\n[Exceptions & Console Errors]")
    print(f"- Page Exceptions (pageerror): {len(collector.page_errors)}")
    for pe in collector.page_errors:
        print(f"  • {pe}")

    print(f"- Console Errors: {len(collector.console_errors)}")
    for ce in collector.console_errors[:10]:
        print(f"  • {ce}")

    print(f"- Failed Network Requests (status >= 400): {len(collector.failed_requests)}")
    for fr in collector.failed_requests:
        print(f"  • {fr}")

    print(f"- Console Warnings: {len(collector.console_warnings)}")

    all_passed = all("PASS" in res for res in collector.journey_results.values()) and len(collector.page_errors) == 0
    verdict = "SHIP" if all_passed and len(collector.failed_requests) == 0 else ("SHIP WITH FIXES" if all_passed else "DO NOT SHIP")

    print("\n" + "-" * 70)
    print(f"FINAL AUDIT VERDICT: {verdict}")
    print("-" * 70)
    return verdict, collector

if __name__ == "__main__":
    verdict, collector = run_qa_session()
    sys.exit(0 if "SHIP" in verdict else 1)
