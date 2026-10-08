"use client";

import React, { useState } from "react";
import { Copy, Check, Printer, FileCode, ExternalLink, Sparkles } from "lucide-react";
import { TailoredResumeData } from "@/lib/api";

interface JakesResumePreviewProps {
  resume: TailoredResumeData;
  companyName: string;
  roleTitle: string;
}

export default function JakesResumePreview({
  resume,
  companyName,
  roleTitle,
}: JakesResumePreviewProps) {
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLatex = async () => {
    if (!resume.latex_source) return;
    await navigator.clipboard.writeText(resume.latex_source);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  const handleCopyPlainText = async () => {
    const lines: string[] = [];
    lines.push(resume.header.name);
    lines.push(`${resume.header.phone} | ${resume.header.email} | ${resume.header.linkedin} | ${resume.header.github}`);
    lines.push("");
    lines.push("EDUCATION");
    resume.education.forEach((e) => {
      lines.push(`${e.school} - ${e.location} | ${e.dates}`);
      lines.push(`${e.degree}${e.gpa ? ` (GPA: ${e.gpa})` : ""}`);
    });
    lines.push("");
    lines.push("EXPERIENCE");
    resume.experience.forEach((exp) => {
      lines.push(`${exp.role} - ${exp.company} | ${exp.dates}`);
      exp.bullets.forEach((b) => lines.push(`• ${b}`));
    });
    lines.push("");
    lines.push("PROJECTS");
    resume.projects.forEach((p) => {
      lines.push(`${p.title} | ${p.technologies} | ${p.date}`);
      p.bullets.forEach((b) => lines.push(`• ${b}`));
    });
    lines.push("");
    lines.push("TECHNICAL SKILLS");
    lines.push(`Languages: ${resume.technical_skills.languages}`);
    lines.push(`Frameworks: ${resume.technical_skills.frameworks}`);
    lines.push(`Developer Tools: ${resume.technical_skills.developer_tools}`);
    lines.push(`Libraries: ${resume.technical_skills.libraries}`);

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5" />
            Jake&apos;s Resume (ATS Standard)
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Single-Page Serif Layout • LaTeX Verified
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPlainText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {copiedPlain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPlain ? "Copied Text" : "Copy Plain"}
          </button>

          <button
            onClick={handleCopyLatex}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
          >
            {copiedLatex ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileCode className="w-3.5 h-3.5" />}
            {copiedLatex ? "LaTeX Copied!" : "Copy LaTeX"}
          </button>

          <a
            href="https://www.overleaf.com/project"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Overleaf
          </a>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Sheet Canvas (Authentic Jake's Resume Layout) */}
      <div className="bg-slate-100 p-2 sm:p-6 rounded-xl flex justify-center overflow-x-auto print:p-0 print:bg-white print:rounded-none">
        <div
          id="jakes-resume-sheet"
          className="bg-white text-black w-full max-w-[850px] min-h-[1100px] p-8 sm:p-12 shadow-md border border-slate-200/80 print:shadow-none print:border-none print:p-0 print:max-w-none print:min-h-0 print:w-full font-serif"
          style={{ fontFamily: "'Times New Roman', Times, 'Nimbus Roman No9 L', Georgia, serif" }}
        >
          {/* HEADER */}
          <div className="text-center pb-2">
            <h1 className="text-2xl sm:text-[26pt] font-bold tracking-tight text-black leading-tight uppercase">
              {resume.header.name}
            </h1>
            <div className="text-[9.5pt] text-neutral-800 mt-1 flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5 leading-snug">
              <span>{resume.header.phone}</span>
              <span className="text-neutral-400">|</span>
              <a href={`mailto:${resume.header.email}`} className="text-neutral-900 underline hover:text-blue-600">
                {resume.header.email}
              </a>
              <span className="text-neutral-400">|</span>
              <a href={resume.header.linkedin} target="_blank" rel="noopener noreferrer" className="text-neutral-900 underline hover:text-blue-600">
                {resume.header.linkedin.replace("https://", "")}
              </a>
              <span className="text-neutral-400">|</span>
              <a href={resume.header.github} target="_blank" rel="noopener noreferrer" className="text-neutral-900 underline hover:text-blue-600">
                {resume.header.github.replace("https://", "")}
              </a>
            </div>
          </div>

          {/* EDUCATION SECTION */}
          <div className="resume-section mt-4 print:mt-2">
            <div className="border-b-[1.25px] border-black pb-0.5 mb-2 print:mb-1">
              <h2 className="text-[11pt] font-bold tracking-wider uppercase text-black">Education</h2>
            </div>
            {resume.education.map((edu, idx) => (
              <div key={idx} className="mb-2 print:mb-1 text-[9.5pt] leading-tight">
                <div className="flex justify-between items-baseline font-bold text-black">
                  <span>{edu.school}</span>
                  <span className="text-neutral-800 font-normal">{edu.location}</span>
                </div>
                <div className="flex justify-between items-baseline italic text-neutral-800">
                  <span>
                    {edu.degree}
                    {edu.gpa && <span className="not-italic text-neutral-700"> (GPA: {edu.gpa})</span>}
                  </span>
                  <span className="not-italic text-neutral-800">{edu.dates}</span>
                </div>
              </div>
            ))}
          </div>

          {/* EXPERIENCE SECTION */}
          <div className="resume-section mt-4 print:mt-2">
            <div className="border-b-[1.25px] border-black pb-0.5 mb-2 print:mb-1">
              <h2 className="text-[11pt] font-bold tracking-wider uppercase text-black">Experience</h2>
            </div>
            {resume.experience.map((exp, idx) => (
              <div key={idx} className="mb-3 print:mb-1.5 text-[9.5pt]">
                <div className="flex justify-between items-baseline leading-tight">
                  <span className="font-bold text-black">{exp.role}</span>
                  <span className="text-neutral-800">{exp.dates}</span>
                </div>
                <div className="flex justify-between items-baseline italic text-neutral-800 leading-tight mb-1 print:mb-0.5">
                  <span>{exp.company}</span>
                  <span className="not-italic text-neutral-800">{exp.location}</span>
                </div>
                <ul className="list-disc ml-5 print:ml-4 space-y-0.5 print:space-y-0 text-neutral-900 text-[9pt] leading-relaxed print:leading-snug">
                  {exp.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="pl-1 text-justify">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* PROJECTS SECTION */}
          <div className="resume-section mt-4 print:mt-2">
            <div className="border-b-[1.25px] border-black pb-0.5 mb-2 print:mb-1">
              <h2 className="text-[11pt] font-bold tracking-wider uppercase text-black">Projects</h2>
            </div>
            {resume.projects.map((proj, idx) => (
              <div key={idx} className="mb-3 print:mb-1.5 text-[9.5pt]">
                <div className="flex justify-between items-baseline leading-tight mb-1 print:mb-0.5">
                  <div>
                    <span className="font-bold text-black">{proj.title}</span>
                    {proj.technologies && (
                      <span className="text-neutral-700 ml-1.5 italic text-[9pt]">
                        | {proj.technologies}
                      </span>
                    )}
                  </div>
                  <span className="text-neutral-800">{proj.date}</span>
                </div>
                <ul className="list-disc ml-5 print:ml-4 space-y-0.5 print:space-y-0 text-neutral-900 text-[9pt] leading-relaxed print:leading-snug">
                  {proj.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="pl-1 text-justify">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* TECHNICAL SKILLS SECTION */}
          <div className="resume-section mt-4 print:mt-2">
            <div className="border-b-[1.25px] border-black pb-0.5 mb-2 print:mb-1">
              <h2 className="text-[11pt] font-bold tracking-wider uppercase text-black">Technical Skills</h2>
            </div>
            <div className="text-[9pt] text-neutral-900 space-y-1 print:space-y-0.5 leading-snug">
              <div>
                <span className="font-bold text-black">Languages: </span>
                <span>{resume.technical_skills.languages}</span>
              </div>
              <div>
                <span className="font-bold text-black">Frameworks: </span>
                <span>{resume.technical_skills.frameworks}</span>
              </div>
              <div>
                <span className="font-bold text-black">Developer Tools: </span>
                <span>{resume.technical_skills.developer_tools}</span>
              </div>
              <div>
                <span className="font-bold text-black">Libraries: </span>
                <span>{resume.technical_skills.libraries}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
