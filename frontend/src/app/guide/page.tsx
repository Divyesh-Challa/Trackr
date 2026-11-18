import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CopyButton } from "./CopyButton";

export const metadata: Metadata = {
  title: "How to land a tech internship in Canada | Trackr",
  description:
    "A practical guide for Canadian students: when co-op and internship hiring happens, how to write resume bullets that get read, which projects help, and how to ask for a referral.",
  alternates: { canonical: "/guide" },
};

const REFERRAL = `Hi [Name], I'm a [year] [program] student at [school]. I saw the [role] posting at [company] and it lines up with what I've been building: [one sentence about a relevant project, with a number if you have one].

Would you be open to a 10-minute chat about the team, or to referring me if you think I'd be a fit? Here's the posting: [link]. Thanks either way!`;

export default function GuidePage() {
  return (
    <LegalPage title="Landing a tech internship in Canada" updated="November 2026">
      <p>
        A short, honest playbook for software, data and engineering students. Nothing here is a trick; it&apos;s the
        stuff that most often separates the students who get interviews from the ones who don&apos;t.
      </p>

      <h2>1. Know the calendar</h2>
      <p>
        Canadian student roles come in three terms: <strong>Winter</strong> (January to April), <strong>Summer</strong> (May
        to August) and <strong>Fall</strong> (September to December). Most postings go up three to six months before
        the term starts, and big companies often open their summer roles in the early fall.
      </p>
      <ul>
        <li><strong>In a co-op program:</strong> your school&apos;s portal runs on fixed rounds. Apply there, but don&apos;t stop there; many startups and mid-size companies only post on their own sites.</li>
        <li><strong>Not in co-op:</strong> you can still apply to most internships. Look for postings that say &quot;internship&quot; rather than &quot;co-op student&quot;, and check whether a school enrolment letter is required.</li>
        <li><strong>Graduating:</strong> new grad roles open around the same time as summer internships, so start in the fall of your final year.</li>
      </ul>

      <h2>2. Write bullets that get read</h2>
      <p>Recruiters skim. Each bullet should answer three things in one line: what you did, how, and what changed.</p>
      <ul>
        <li><strong>Weak:</strong> Worked on the backend for a club app.</li>
        <li><strong>Strong:</strong> Built a Node.js and PostgreSQL API for a 300-member club app, cutting page loads from 2s to 400ms.</li>
      </ul>
      <p>
        Lead with a strong verb, name the tools the posting asks for (only if you&apos;ve really used them), and add a
        number wherever you honestly can: users, time saved, size of data, grade on a project. Keep it to one page.
      </p>

      <h2>3. Pick projects that start conversations</h2>
      <ul>
        <li><strong>Something people use.</strong> A tool for your club, a bot for your Discord, a site for a local business. Real users beat a tenth to-do app.</li>
        <li><strong>Depth over breadth.</strong> One project you can talk about for 20 minutes is worth more than five you can&apos;t.</li>
        <li><strong>Match the roles you want.</strong> Applying to data roles? Show a cleaned dataset and a clear finding. Embedded? Show hardware working.</li>
        <li><strong>Make it easy to check.</strong> A live link or a short demo video, and a README that explains what it does in two sentences.</li>
      </ul>

      <h2>4. Apply early, apply wide, keep track</h2>
      <p>
        Postings get most of their applications in the first week, so check often and apply soon. It&apos;s normal to send
        30 to 80 applications in a busy season, which is exactly why a tracker helps: you&apos;ll know what&apos;s waiting,
        when to follow up, and which version of your resume you sent. <Link href="/board">Trackr&apos;s board</Link> does
        that for free.
      </p>

      <h2>5. Ask for referrals the right way</h2>
      <p>
        A referral won&apos;t get an unqualified person hired, but it often gets a qualified one read. Ask people you have
        something in common with (same school, club or city), keep it short, and always include the posting.
      </p>
      <div className="relative my-4 rounded-xl border border-slate-200 bg-slate-50 p-4 pr-24 text-[14px] whitespace-pre-line text-slate-800">
        {REFERRAL}
        <div className="absolute right-3 top-3">
          <CopyButton text={REFERRAL} />
        </div>
      </div>

      <h2>6. Prepare for the interview</h2>
      <ul>
        <li><strong>Technical:</strong> practise the classic patterns (arrays and hashing, two pointers, trees and graphs, simple dynamic programming), and talk through your thinking out loud.</li>
        <li><strong>Behavioural:</strong> have four or five short stories ready (a hard bug, a conflict, a time you led, a failure) using situation, action and result.</li>
        <li><strong>Your resume:</strong> be ready to go deep on anything you listed. If it&apos;s on the page, it&apos;s fair game.</li>
        <li><strong>Your questions:</strong> ask what an intern shipped last term. It tells you a lot about the team.</li>
      </ul>

      <h2>7. Myths worth dropping</h2>
      <ul>
        <li><strong>&quot;I need a 4.0.&quot;</strong> Most postings don&apos;t ask for a GPA. When one does, Trackr shows the minimum on the listing.</li>
        <li><strong>&quot;I&apos;m missing one requirement, so I shouldn&apos;t apply.&quot;</strong> Requirements are wish lists. If you meet most of them, apply.</li>
        <li><strong>&quot;Only big tech counts.&quot;</strong> Startups and mid-size companies often give interns more ownership, and they reply faster.</li>
        <li><strong>&quot;It&apos;s too late this term.&quot;</strong> Roles keep appearing right up to the start date, especially at smaller companies.</li>
      </ul>

      <h2>Start looking</h2>
      <p>
        Browse <Link href="/discover">every open role</Link>, or jump straight to{" "}
        <Link href="/internships/toronto">Toronto</Link>, <Link href="/internships/vancouver">Vancouver</Link>,{" "}
        <Link href="/internships/montreal">Montreal</Link>, <Link href="/internships/remote">remote</Link> or{" "}
        <Link href="/roles/new-grad">new grad</Link> roles.
      </p>
    </LegalPage>
  );
}
