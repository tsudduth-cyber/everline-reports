const uid = () => Math.random().toString(36).slice(2, 9);
const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

// Everline: one project = one roof/site.
export function seedProjects() {
  return [
    {
      id: uid(), name: "2028 Irving Blvd", address: "2028 Irving Blvd, Dallas, TX 75207",
      date: today(), reportNo: "01", status: "In Progress", pct: 45,
      progress: "Mobilized crew and staged materials\nTear-off started on north section\nRemoved and stored rooftop units",
      next: "Complete tear-off north half\nInstall cover board + insulation\nBegin TPO membrane",
      satellite: null, photos: [],
    },
    {
      id: uid(), name: "Northgate Distribution Center", address: "4820 Sovereign Row, Dallas, TX",
      date: today(), reportNo: "01", status: "Scheduled", pct: 10,
      progress: "Pre-construction survey complete\nMaterials ordered",
      next: "Mobilize crew\nStage materials\nBegin tear-off Section A",
      satellite: null, photos: [],
    },
  ];
}
