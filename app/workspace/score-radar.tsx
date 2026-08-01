import type { ReferenceScoreProfile } from "../../lib/reference-score-profile";

type ScoreRadarProps = {
  incompleteLabel: string;
  profile: ReferenceScoreProfile;
  title: string;
};

const CENTER_X = 100;
const CENTER_Y = 84;
const RADIUS = 54;
const LABEL_RADIUS = 75;

function point(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
  };
}

function pointsForRadius(radius: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const position = point(index, radius);
    return `${position.x.toFixed(2)},${position.y.toFixed(2)}`;
  }).join(" ");
}

export function ScoreRadar({ incompleteLabel, profile, title }: ScoreRadarProps) {
  const complete =
    profile.complete &&
    profile.axes.length === 5 &&
    profile.axes.every((axis) => axis.value !== null);

  if (!complete) {
    return <p className="score-radar__incomplete">{incompleteLabel}</p>;
  }

  const ariaLabel = [
    title,
    ...profile.axes.map((axis) => `${axis.label} ${axis.value}`),
  ].join(", ");
  const scorePoints = profile.axes
    .map((axis, index) => {
      const position = point(index, (RADIUS * (axis.value ?? 0)) / 5);
      return `${position.x.toFixed(2)},${position.y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      aria-label={ariaLabel}
      className="score-radar"
      role="img"
      viewBox="0 0 200 180"
    >
      <g className="score-radar__grid" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <polygon
            data-score-grid
            key={index}
            points={pointsForRadius((RADIUS * (index + 1)) / 5)}
          />
        ))}
        {profile.axes.map((axis, index) => {
          const endpoint = point(index, RADIUS);
          return (
            <line
              data-score-axis
              key={axis.key}
              x1={CENTER_X}
              x2={endpoint.x}
              y1={CENTER_Y}
              y2={endpoint.y}
            />
          );
        })}
      </g>
      <polygon
        className="score-radar__data"
        data-score-polygon
        points={scorePoints}
      />
      <g className="score-radar__labels" aria-hidden="true">
        {profile.axes.map((axis, index) => {
          const position = point(index, LABEL_RADIUS);
          return (
            <text
              data-score-label
              key={axis.key}
              textAnchor={position.x < CENTER_X - 5 ? "start" : position.x > CENTER_X + 5 ? "end" : "middle"}
              x={position.x}
              y={position.y + (position.y < CENTER_Y ? 0 : 4)}
            >
              {axis.label} {axis.value}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
