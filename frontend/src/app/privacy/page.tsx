import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy | Trackr" };

const CONTACT = "divyeshchallavgr@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 29, 2026">
      <p>
        Trackr is run by Divyesh Challa, an individual based in Canada. This policy explains what personal
        information Trackr collects, why, and the choices you have. It is written to meet Canada&apos;s
        Personal Information Protection and Electronic Documents Act (PIPEDA).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your email address, and your name and profile picture if you sign in with Google or GitHub.</li>
        <li><strong>What you put in Trackr:</strong> your profile (school, graduation term, target roles and provinces), the applications you track, and their tasks, contacts, notes and status history.</li>
        <li><strong>Payment status</strong> if you subscribe to Pro. Card details go directly to Stripe; Trackr never sees or stores them.</li>
        <li><strong>Text you send to the AI tools</strong> (Pro only), such as a job description and your resume bullets.</li>
        <li><strong>Technical data:</strong> anonymous page-view and performance statistics, and error reports when something breaks.</li>
      </ul>
      <p>
        Contacts you add to an application (a recruiter&apos;s name or email, for example) are personal information
        about someone else. Only add what they&apos;ve shared with you for your job search.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To run your account and show your applications back to you.</li>
        <li>To personalise the jobs feed with your profile.</li>
        <li>To process your Pro subscription.</li>
        <li>To generate the AI output you ask for.</li>
        <li>To fix bugs, keep the service secure, and prevent abuse.</li>
      </ul>
      <p>We don&apos;t sell your personal information, show you ads, or use your data to train AI models.</p>

      <h2>Who processes it for us</h2>
      <p>Trackr relies on these service providers, each bound by its own privacy and security commitments:</p>
      <ul>
        <li><strong>Supabase:</strong> database and sign-in. Data is stored in the United States (AWS us-east-1).</li>
        <li><strong>Vercel:</strong> hosting, plus cookieless, anonymous web analytics.</li>
        <li><strong>Sentry:</strong> error reports with technical details about what broke and the page you were on. They don&apos;t include your name, email, cookies or what you typed.</li>
        <li><strong>Stripe:</strong> payments, if you subscribe.</li>
        <li><strong>Anthropic:</strong> the AI tools, only for the text you send them. Anthropic does not train on this data.</li>
        <li><strong>Google and GitHub:</strong> only if you choose to sign in with them.</li>
      </ul>
      <p>
        Because some providers are outside Canada, your information may be processed in other countries
        and be accessible to their authorities under local law.
      </p>

      <h2>Job listings</h2>
      <p>
        Job postings come from public company job boards and community-maintained lists. They describe
        employers, not you, and each one links to the original posting.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information until you delete your account. Encrypted backups are kept for 14 days, so
        deleted data disappears from backups within 14 days. Error reports are kept for up to 90 days.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Access:</strong> download everything Trackr stores about you from your Profile page.</li>
        <li><strong>Correction:</strong> edit your profile and applications at any time.</li>
        <li><strong>Deletion:</strong> delete your account from your Profile page. This removes your data immediately (backups within 14 days).</li>
        <li><strong>Questions or complaints:</strong> email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. If you&apos;re not satisfied, you can contact the <a href="https://www.priv.gc.ca/" target="_blank" rel="noopener noreferrer">Office of the Privacy Commissioner of Canada</a>.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Trackr uses only the cookies needed to keep you signed in. Analytics are cookieless, so there&apos;s no
        cookie banner.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and at rest. Each account&apos;s data is isolated at the database level, so
        no other user can read it. No system is perfectly secure; if a breach affects you, we&apos;ll tell you and
        report it as PIPEDA requires.
      </p>

      <h2>Children</h2>
      <p>Trackr is meant for post-secondary students and isn&apos;t directed at children under 13.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a meaningful way, we&apos;ll update the date above and let account holders know.</p>
    </LegalPage>
  );
}
