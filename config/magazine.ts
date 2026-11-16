export const magazine = {
  name: "Machine Intelligence",
  copyrightYear: 2026,
  department: "Department of Artificial Intelligence",
  departmentShort: "AI Department",
  university: "NFC Institute of Engineering and Technology, Multan",
  universityShort: "NFC IET Multan",
  supervisor: {
    name: "Dr. Muhammad Siddique",
    title: "Head of Department, Artificial Intelligence",
  },
  editors: ["Muawiya Amir", "Faizan Ishfaq", "Shazada M. Umar"],
  sections: [
    { id: "pakistan", label: "Pakistan", slots: 3 },
    { id: "global", label: "Global", slots: 4 },
    { id: "research", label: "Research", slots: 3 },
    { id: "industry", label: "Industry", slots: 4 },
  ],
} as const;

export type MagazineSectionId = (typeof magazine.sections)[number]["id"];
