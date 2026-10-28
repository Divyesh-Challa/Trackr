import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of service | Trackr" };

const CONTACT = "divyeshchallavgr@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="October 29, 2026">
      <p>
        These terms govern your use of Trackr, run by Divyesh Challa (&quot;we&quot;). By creating an account you
        agree to them. If you don&apos;t agree, please don&apos;t use Trackr.
      </p>

      <h2>Your account</h2>
      <p>
        You need to be at least 13 to use Trackr. Keep your sign-in method secure; you&apos;re responsible for
        activity on your account. Your content stays yours. You give us permission to store and process it only
        to run the service for you.
      </p>

      <h2>Job listings</h2>
      <p>
        Listings are collected from public company job boards and community lists, and refreshed every few
        hours. We don&apos;t employ, recruit for, or represent any employer. Details such as pay, deadlines or
        whether a role is still open can change or be wrong, so always check the original posting before you
        apply. Employers&apos; names and trademarks belong to them.
      </p>

      <h2>AI tools</h2>
      <p>
        The AI tools rewrite, reorder and select from material you provide, and are designed not to invent
        experience. They can still make mistakes. Review everything before you send it to an employer;
        you&apos;re responsible for what you submit.
      </p>

      <h2>Pro subscription</h2>
      <ul>
        <li>Pro costs $15 CAD per month or $144 CAD per year, plus applicable taxes, billed in advance through Stripe.</li>
        <li>Subscriptions renew automatically until cancelled. You can cancel any time from your account. You keep Pro until the end of the period you&apos;ve paid for.</li>
        <li>Within 14 days of your first payment, email us for a full refund. After that, payments aren&apos;t refunded except where the law requires.</li>
        <li>Pro includes monthly AI usage limits, shown in the app. If prices change, we&apos;ll give you at least 30 days&apos; notice before your next renewal.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t misuse Trackr: no scraping it, overloading it, breaking its security, accessing other
        people&apos;s data, reselling it, or using it for anything unlawful. We may suspend accounts that do.
      </p>

      <h2>The service</h2>
      <p>
        Trackr is provided &quot;as is&quot;. We work to keep it available and accurate, but we don&apos;t guarantee
        it will be uninterrupted or error-free, or that it will help you get a job. To the extent the law allows,
        we aren&apos;t liable for indirect or consequential losses, and our total liability is limited to what you
        paid us in the 12 months before the claim. Nothing here limits rights you have under consumer
        protection law that can&apos;t be waived.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time from your Profile page. We may close accounts that break these
        terms, and will tell you why where we reasonably can.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If we change these terms in a meaningful way, we&apos;ll update the date above and notify account holders.
        These terms are governed by the laws of Canada and of the province where Trackr&apos;s operator resides.
        Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalPage>
  );
}
