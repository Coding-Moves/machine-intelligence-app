import type { StoryStatus } from "@/lib/types";

const statusStyle: Record<StoryStatus, string> = {
  approved: "bg-[#e2eee7] text-[#245b45]",
  candidate: "bg-[#e8e9e4] text-[#4f5d55]",
  rejected: "bg-[#f4e5e2] text-[#8e443c]",
  published: "bg-[#e2eee7] text-[#245b45]",
};

const statusLabel: Record<StoryStatus, string> = {
  approved: "Approved",
  candidate: "Candidate",
  rejected: "Rejected",
  published: "Published",
};

export function StatusChip({ status }: { status: StoryStatus }) {
  return (
    <span
      className={
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium " +
        statusStyle[status]
      }
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}
