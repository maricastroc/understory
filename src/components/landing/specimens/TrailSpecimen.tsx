import { useMessages } from "@/i18n/LocaleProvider";
import { ArtifactGlyph } from "../../line-investigation/bore/ArtifactGlyph";
import { DatumRule } from "../../line-investigation/bore/DatumRule";

const CORE_X = 20;
const LABEL_X = 48;

export function TrailSpecimen() {
  const trail = useMessages().landing.method.trail;
  const labels = [
    { y: 30, text: trail.commit },
    { y: 55, text: trail.pullRequest },
    { y: 84, text: trail.issue },
  ];
  return (
    <svg aria-hidden width={280} height={96} className="max-w-full overflow-visible">
      <DatumRule x1={0} x2={280} y={8} />
      <line x1={CORE_X} x2={CORE_X} y1={8} y2={88} strokeWidth={1.5} className="stroke-li-ink" />
      <ArtifactGlyph kind="commit" x={CORE_X} y={26} cited radius={6} />
      <ArtifactGlyph kind="pull_request" x={CORE_X} y={38} top={38} bottom={64} cited />
      <ArtifactGlyph kind="review" x={CORE_X + 6} y={50} cited={false} tick={10} />
      <ArtifactGlyph kind="issue" x={CORE_X} y={80} cited />
      {labels.map((l) => (
        <text
          key={l.text}
          x={LABEL_X}
          y={l.y}
          className="fill-li-neutral-700 font-li-mono text-[10.5px]"
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
