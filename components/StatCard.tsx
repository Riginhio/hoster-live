import { Card } from "@/components/ui/Card";

type StatCardProps = {
  label: string;
  value: string;
  note: string;
};

export function StatCard({ label, value, note }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">{label}</p>
      <p className="mt-3 font-display text-4xl text-bone">{value}</p>
      <p className="mt-2 text-sm text-bone/55">{note}</p>
    </Card>
  );
}
