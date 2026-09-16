import { useState } from "react";
import { HELP_TOPICS } from "../../components/help/helpContent";
import { ChevronDownIcon } from "../../components/ui/icons";

export function HelpPage() {
  const [openKey, setOpenKey] = useState<string | null>(HELP_TOPICS[0]?.key ?? null);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Bantuan & Tutorial</h1>
      <div className="flex flex-col gap-2">
        {HELP_TOPICS.map((topic) => (
          <div key={topic.key} className="shape-card border border-[var(--border)] bg-[var(--surface)]">
            <button
              type="button"
              onClick={() => setOpenKey(openKey === topic.key ? null : topic.key)}
              className="flex w-full items-center justify-between p-3 text-left text-sm font-semibold text-[var(--text)]"
            >
              {topic.title}
              <ChevronDownIcon size={16} className={`transition ${openKey === topic.key ? "rotate-180" : ""}`} />
            </button>
            {openKey === topic.key && <p className="px-3 pb-3 text-sm text-[var(--text-secondary)]">{topic.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
