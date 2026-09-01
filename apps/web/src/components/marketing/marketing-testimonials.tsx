"use client";

const TESTIMONIALS = [
  {
    metric: "15%",
    metricLabel: "Less fuel cost",
    quote: "We eliminated fuel theft by linking fuel cards to Reanzly's ledger. Routes optimized automatically. I thought it would take months. It took a week.",
    author: "Rahul Sharma",
    title: "Operations Head, VRL Logistics",
    initials: "RS",
  },
  {
    metric: "2×",
    metricLabel: "Faster invoicing",
    quote: "Our billing team used to spend days reconciling PODs. Now an invoice hits the client inbox before my team opens their laptop. They're bored. I'm happy.",
    author: "Sneha Patel",
    title: "CFO, Rivigo",
    initials: "SP",
  },
  {
    metric: "100%",
    metricLabel: "Fleet visibility",
    quote: "FASTag, GPS, maintenance logs. It was a fragmented mess before. Now it's one dashboard. We stopped asking 'where is the truck' at 3am.",
    author: "Vikram Singh",
    title: "Fleet Manager, Delhivery",
    initials: "VS",
  },
];

export function MarketingTestimonials() {
  return (
    <section className="bg-[#fafafa] py-20 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="mb-12">
          <p className="mb-3 text-[13px] uppercase tracking-[0.12em] text-[#9a9a9a]">Customer results</p>
          <h2 className="text-[36px] font-[500] leading-[1.15] md:text-[48px]"
            style={{ letterSpacing: "-1.44px", color: "#171717" }}>
            Actual numbers.{" "}
            <span style={{ color: "#9a9a9a" }}>Not marketing numbers.</span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i}
              className="flex flex-col justify-between rounded-[12px] border border-[#dfdfdf] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div>
                {/* Metric */}
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-[52px] font-[500] leading-none text-[#1AA06D]"
                    style={{ letterSpacing: "-1.44px" }}>
                    {t.metric}
                  </span>
                  <span className="text-[13px] uppercase tracking-wider text-[#9a9a9a]">{t.metricLabel}</span>
                </div>
                <p className="text-[15px] font-[400] leading-[1.6] text-[#707070]">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-[#ededed] pt-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfdfdf] bg-[#fafafa] text-[12px] font-[500] text-[#707070]">
                  {t.initials}
                </div>
                <div>
                  <p className="text-[13px] font-[500] text-[#171717]">{t.author}</p>
                  <p className="text-[12px] text-[#9a9a9a]">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
