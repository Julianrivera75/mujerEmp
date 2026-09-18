interface Props {
  spotCount?: 2 | 3;
}

const SPOTS = [
  { cls: 'top-10 left-10 bg-fuchsia-400/30', delay: '0s' },
  { cls: 'top-20 right-10 bg-purple-400/30', delay: '2s' },
  { cls: '-bottom-10 left-1/3 bg-indigo-400/30', delay: '4s' },
];

/** Manchas difuminadas con la animación `blob`; solo transform + opacity. */
export function AuroraBackground({ spotCount = 2 }: Props) {
  return (
    <div data-fx aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {SPOTS.slice(0, spotCount).map((s, i) => (
        <div
          key={i}
          className={`absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob ${s.cls}`}
          style={{ animationDelay: s.delay }}
        />
      ))}
    </div>
  );
}
