function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Split intake text into lines; render obvious URLs as links. */
function LocationDescriptionBody({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) {
    return <span className="text-[var(--lv-ink-faint)]">—</span>;
  }
  const lines = text.split(/\r?\n/);
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return <br key={i} />;
        if (isHttpUrl(t)) {
          return (
            <div key={i}>
              <a
                href={t}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-[var(--lv-primary)] underline underline-offset-2 hover:opacity-90"
              >
                {t}
              </a>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-[var(--lv-ink)]">
            {line}
          </p>
        );
      })}
    </div>
  );
}

type Props = {
  landLocationDescription: string | null;
  googleMapsLink: string | null;
  coordinatesLat: number | string | null;
  coordinatesLng: number | string | null;
};

export function AgentTaskLocationBlock({ landLocationDescription, googleMapsLink, coordinatesLat, coordinatesLng }: Props) {
  const maps = googleMapsLink?.trim() ?? "";
  const lat = coordinatesLat != null && coordinatesLat !== "" ? String(coordinatesLat).trim() : "";
  const lng = coordinatesLng != null && coordinatesLng !== "" ? String(coordinatesLng).trim() : "";
  const coordsLine = lat && lng ? `${lat}, ${lng}` : null;
  const coordsOpenUrl = lat && lng ? `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}` : null;

  return (
    <>
      <div>
        <dt className="text-[var(--lv-ink-faint)]">Location details</dt>
        <dd className="mt-1">
          <LocationDescriptionBody text={String(landLocationDescription ?? "")} />
        </dd>
      </div>
      <div>
        <dt className="text-[var(--lv-ink-faint)]">Google maps</dt>
        <dd className="mt-1 break-all text-[var(--lv-ink)]">
          {maps ? (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--lv-primary)] underline underline-offset-2 hover:opacity-90"
            >
              Open in Google Maps
            </a>
          ) : (
            "—"
          )}
          {maps ? (
            <span className="mt-1 block text-xs text-[var(--lv-ink-muted)]" title={maps}>
              {maps}
            </span>
          ) : null}
        </dd>
      </div>
      <div>
        <dt className="text-[var(--lv-ink-faint)]">Coordinates</dt>
        <dd className="mt-1 text-[var(--lv-ink)]">
          {coordsLine && coordsOpenUrl ? (
            <a
              href={coordsOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--lv-primary)] underline underline-offset-2 hover:opacity-90"
            >
              {coordsLine}
            </a>
          ) : coordsLine ? (
            coordsLine
          ) : (
            "—"
          )}
          {coordsLine && coordsOpenUrl ? (
            <span className="mt-1 block text-xs text-[var(--lv-ink-muted)]">Opens the same pin in Google Maps.</span>
          ) : null}
        </dd>
      </div>
    </>
  );
}
