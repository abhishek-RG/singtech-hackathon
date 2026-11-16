// SingTech AI lockup: the S mark from the logo artwork plus the name as live text, ink "SingTech" and red "AI".
// Text instead of the artwork's wordmark, which reads "Singtel AI".
export function BrandLockup({ height = 30, tone = "light", tagline = false }: { height?: number; tone?: "light" | "dark"; tagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="SingTech AI">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/singtech-ai-mark.png" alt="" aria-hidden width={Math.round(height * 1.27)} height={height} style={{ height, width: "auto" }} />
      <span aria-hidden className="flex flex-col leading-none">
        <span className={`font-[family-name:var(--font-jakarta)] font-extrabold tracking-[-0.03em] ${tone === "dark" ? "text-white" : "text-[#0A0A0C]"}`} style={{ fontSize: Math.round(height * 0.72) }}>
          SingTech <span className="text-st-red">AI</span>
        </span>
        {tagline && <span className={`mt-1 text-[10px] tracking-[0.3em] ${tone === "dark" ? "text-white/80" : "text-secondary"}`}>Smarter. Together.</span>}
      </span>
    </span>
  );
}
