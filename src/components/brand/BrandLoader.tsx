export const COMPANY_NAME = "Priya Designs Studio";

export function BrandMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="brand-loader__mark"
    >
      <path
        className="brand-loader__layer brand-loader__layer--one"
        pathLength="1"
        d="M32 10 56 23 32 36 8 23 32 10Z"
      />
      <path
        className="brand-loader__layer brand-loader__layer--two"
        pathLength="1"
        d="m8 32 24 13 24-13"
      />
      <path
        className="brand-loader__layer brand-loader__layer--three"
        pathLength="1"
        d="m8 41 24 13 24-13"
      />
    </svg>
  );
}

export function BrandLoader({
  label = "Preparing your experience",
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`brand-loader ${fullScreen ? "brand-loader--screen" : "brand-loader--section"}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="brand-loader__content">
        <div className="brand-loader__symbol">
          <svg
            className="brand-loader__construction"
            viewBox="0 0 160 160"
            fill="none"
            aria-hidden="true"
          >
            <path d="M20 44V20h24m72 0h24v24m0 72v24h-24m-72 0H20v-24" />
            <path className="brand-loader__guides" d="M80 8v144M8 80h144" />
            <circle cx="80" cy="80" r="52" />
          </svg>
          <BrandMark />
        </div>
        <p className="brand-loader__name">
          <span className="brand-loader__wordmark">
            {COMPANY_NAME.replace(/ Studio$/, "")}
          </span>{" "}
          <span className="brand-loader__studio">Studio</span>
        </p>
        <p className="brand-loader__discipline">Architecture &amp; interiors</p>
        <div className="brand-loader__track" aria-hidden="true">
          <span />
        </div>
        <p className="brand-loader__label">
          <span className="brand-loader__status-dot" aria-hidden="true" />
          {label}
          <span className="sr-only">. Please wait.</span>
        </p>
      </div>
      {fullScreen && (
        <p className="brand-loader__footer" aria-hidden="true">
          Bengaluru, India
          <span />
          Considered spaces. Beautifully lived.
        </p>
      )}
    </div>
  );
}
