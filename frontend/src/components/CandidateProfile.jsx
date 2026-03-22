import { User, Mail, Phone, Briefcase, GraduationCap, Code2 } from "lucide-react";

/**
 * Displays candidate profile parsed from uploaded resume.
 * Shows name, contact, experience, education, and skills.
 */
export default function CandidateProfile({ resume }) {
  if (!resume) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-600 bg-stone-50/50 dark:bg-stone-900/30 p-4 text-center">
        <User className="w-10 h-10 mx-auto text-stone-400 dark:text-stone-500 mb-2" />
        <p className="text-sm text-[var(--secondary)]">No profile yet</p>
        <p className="text-xs text-stone-500 mt-1">Upload your resume to see your profile</p>
      </div>
    );
  }

  const skills = resume.skills || [];
  const hasContact = resume.email || resume.phone;
  const hasExperience = resume.experience?.trim();
  const hasEducation = resume.education?.trim();

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30">
        <h3 className="text-sm font-semibold text-[var(--primary)] flex items-center gap-2">
          <User className="w-4 h-4 text-[var(--accent)]" />
          Candidate Profile
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Name */}
        {resume.name && (
          <div>
            <p className="font-semibold text-[var(--primary)] text-base">{resume.name}</p>
          </div>
        )}

        {/* Contact */}
        {hasContact && (
          <div className="space-y-2">
            {resume.email && (
              <a
                href={`mailto:${resume.email}`}
                className="flex items-center gap-2 text-sm text-[var(--secondary)] hover:text-[var(--accent)] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{resume.email}</span>
              </a>
            )}
            {resume.phone && (
              <a
                href={`tel:${resume.phone}`}
                className="flex items-center gap-2 text-sm text-[var(--secondary)] hover:text-[var(--accent)] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{resume.phone}</span>
              </a>
            )}
          </div>
        )}

        {/* Experience */}
        {hasExperience && (
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--secondary)] mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[var(--accent)]" />
              Experience
            </div>
            <p className="text-sm text-[var(--primary)] leading-relaxed">{resume.experience}</p>
          </div>
        )}

        {/* Education */}
        {hasEducation && (
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--secondary)] mb-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[var(--accent)]" />
              Education
            </div>
            <p className="text-sm text-[var(--primary)] leading-relaxed">{resume.education}</p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--secondary)] mb-2">
              <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              Skills ({skills.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-xs text-[var(--primary)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
