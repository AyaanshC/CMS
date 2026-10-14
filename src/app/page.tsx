import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Layers3,
  Menu,
  Ruler,
  Compass,
  Hammer,
  Check,
  MapPin,
} from "lucide-react";

const works = [
  {
    name: "Sharma Villa",
    type: "Residential interiors",
    location: "Indiranagar, Bengaluru",
    image: "/studio-showcase.jpg",
    detail: "Natural stone. Warm walnut. Room to breathe.",
  },
  {
    name: "TechCorp Headquarters",
    type: "Workplace design",
    location: "Whitefield, Bengaluru",
    image: "/techcorp-office.jpg",
    detail: "A considered space for ideas and collaboration.",
  },
  {
    name: "Reddy Penthouse",
    type: "Private residence",
    location: "HSR Layout, Bengaluru",
    image: "/reddy-penthouse.jpg",
    detail: "Quiet textures and a lighter way of living.",
  },
];
const services = [
  {
    icon: Compass,
    title: "Architecture",
    text: "Thoughtful planning, natural light, and spaces that respond to the way you live.",
  },
  {
    icon: Ruler,
    title: "Interior design",
    text: "Materials, details, and bespoke joinery brought together with a considered point of view.",
  },
  {
    icon: Hammer,
    title: "Turnkey execution",
    text: "One studio to coordinate your design, site work, and the details that make it complete.",
  },
];
const process = [
  [
    "Discover",
    "We start with your space, your aspirations, and the practicalities of your brief.",
  ],
  [
    "Design",
    "Plans, materials, and visual concepts bring a shared direction into focus.",
  ],
  [
    "Detail",
    "An itemised scope and estimate give every decision a clear foundation.",
  ],
  [
    "Deliver",
    "Site updates, quality checks, and a considered handover bring the design to life.",
  ],
];

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-[100] bg-primary p-3 text-white focus:not-sr-only focus:fixed"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-10 lg:px-16">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Layers3 className="size-8 text-primary" strokeWidth={1.25} />
            <span>
              <span className="block text-[13px] font-semibold tracking-tight sm:text-sm">
                Priya Designs Studio
              </span>
              <span className="mt-1 block text-[8px] uppercase tracking-[0.22em] text-muted-foreground sm:text-[9px]">
                Architecture & interiors
              </span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-xs text-muted-foreground xl:flex"
          >
            <a
              href="#projects"
              className="transition-colors hover:text-primary"
            >
              Selected work
            </a>
            <a
              href="#services"
              className="transition-colors hover:text-primary"
            >
              Our practice
            </a>
            <a href="#process" className="transition-colors hover:text-primary">
              Our approach
            </a>
          </nav>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="hidden text-xs text-muted-foreground hover:text-primary sm:block"
            >
              Studio login
            </Link>
            <Link
              href="/onboarding"
              className="hidden h-10 items-center gap-3 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
            >
              Start a conversation <ArrowUpRight className="size-3.5" />
            </Link>
            <details className="relative xl:hidden">
              <summary
                aria-label="Open menu"
                className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border border-border [&::-webkit-details-marker]:hidden"
              >
                <Menu className="size-5" />
              </summary>
              <nav
                aria-label="Mobile navigation"
                className="absolute right-0 top-12 flex w-56 flex-col rounded-xl border border-border bg-card p-2 text-sm shadow-xl"
              >
                <a href="#projects" className="rounded-lg p-3 hover:bg-muted">
                  Selected work
                </a>
                <a href="#services" className="rounded-lg p-3 hover:bg-muted">
                  Our practice
                </a>
                <a href="#process" className="rounded-lg p-3 hover:bg-muted">
                  Our approach
                </a>
                <Link href="/portal" className="rounded-lg p-3 hover:bg-muted">
                  Client portal
                </Link>
                <Link href="/login" className="rounded-lg p-3 hover:bg-muted">
                  Studio login
                </Link>
                <Link
                  href="/onboarding"
                  className="rounded-lg p-3 font-medium text-primary hover:bg-accent"
                >
                  Start a project
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-12 pt-12 sm:px-10 lg:min-h-[660px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-16 lg:py-16">
          <div className="flex flex-col items-start justify-center py-2 lg:py-10">
            <p className="eyebrow mb-7 flex items-center gap-3">
              <span className="h-px w-8 bg-primary" />A Bengaluru design
              practice
            </p>
            <h1 className="font-editorial max-w-xl text-[clamp(3.3rem,5.3vw,5.4rem)] leading-[1.07]">
              Considered spaces.
              <br />
              <span className="italic text-primary">Beautifully lived.</span>
            </h1>
            <p className="mt-7 max-w-sm text-sm leading-[1.9] text-muted-foreground">
              Architecture and interiors shaped around you. We bring clarity,
              care, and a quiet attention to detail to every space we create.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-7">
              <Link
                href="/onboarding"
                className="inline-flex h-12 items-center gap-5 rounded-md bg-primary px-6 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Tell us about your project <ArrowUpRight className="size-4" />
              </Link>
              <a
                href="#projects"
                className="inline-flex items-center gap-2 border-b border-foreground/30 pb-1 text-xs font-medium"
              >
                Explore our work <ArrowRight className="size-3.5" />
              </a>
            </div>
            <div className="mt-12 flex items-center gap-3 text-[10px] tracking-wide text-muted-foreground">
              <MapPin className="size-3.5" />
              Bengaluru, India
              <span className="mx-1 h-3 w-px bg-border" />
              Residential & commercial
            </div>
          </div>
          <figure className="relative min-h-[360px] overflow-hidden rounded-t-[100px] rounded-b-lg sm:min-h-[460px] lg:min-h-[550px]">
            <Image
              src="/studio-showcase.jpg"
              alt="A warm contemporary living room with stone finishes and walnut joinery"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/65 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-7 text-white">
              <span>
                <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/75">
                  Featured residence
                </span>
                <span className="font-editorial text-3xl">Sharma Villa</span>
              </span>
              <span className="text-[10px] text-white/80">
                Indiranagar · Bengaluru
              </span>
            </figcaption>
          </figure>
        </section>

        <section
          id="services"
          className="scroll-mt-20 border-y border-border bg-card/50"
        >
          <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-10 md:grid-cols-3 lg:px-16">
            {services.map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className="flex gap-4 md:border-r md:border-border md:pr-6 md:last:border-0"
              >
                <Icon
                  className="mt-1 size-5 shrink-0 text-primary"
                  strokeWidth={1.4}
                />
                <div>
                  <p className="mb-2 text-sm font-semibold">
                    {title}
                    <span className="ml-3 text-[9px] font-normal text-muted-foreground">
                      0{i + 1}
                    </span>
                  </p>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="projects"
          className="mx-auto max-w-[1440px] scroll-mt-20 px-5 py-20 sm:px-10 lg:px-16 lg:py-24"
        >
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow mb-3">Selected work</p>
              <h2 className="font-editorial text-4xl sm:text-5xl">
                Every space, a point of view.
              </h2>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              A glimpse into the homes and workplaces that reflect our approach
              to thoughtful design.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {works.map((work, i) => (
              <article key={work.name} className="group">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={work.image}
                    alt={work.name + " interior design"}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-4 rounded bg-background/95 px-2.5 py-1.5 text-[9px] uppercase tracking-wider">
                    {work.type}
                  </span>
                </div>
                <div className="mt-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {work.location}
                    </p>
                    <h3 className="mt-1.5 text-lg font-medium">{work.name}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {work.detail}
                    </p>
                  </div>
                  <span className="font-editorial text-xl text-muted-foreground/60">
                    0{i + 1}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="process"
          className="scroll-mt-20 border-y border-border bg-[#efeee8]"
        >
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-10 lg:px-16">
            <p className="eyebrow mb-3">Our approach</p>
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <h2 className="font-editorial text-4xl sm:text-5xl">
                Clarity at every step.
              </h2>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                A collaborative journey, with the right conversations and
                decisions along the way.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {process.map(([title, text], i) => (
                <div key={title} className="border-t border-foreground/20 pt-5">
                  <span className="text-[11px] text-primary">0{i + 1}</span>
                  <h3 className="mb-3 mt-6 text-base font-semibold">{title}</h3>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="portal"
          className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-20 sm:px-10 lg:grid-cols-2 lg:gap-24 lg:px-16 lg:py-24"
        >
          <div>
            <p className="eyebrow mb-4">Designed for peace of mind</p>
            <h2 className="font-editorial text-4xl leading-tight sm:text-5xl">
              Closer to your project.
              <br />
              <span className="italic text-primary">Wherever you are.</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              Your dedicated client portal keeps the important details in one
              place, so you can follow progress and make decisions with
              confidence.
            </p>
            <ul className="my-7 space-y-3 text-xs">
              {[
                "Progress updates and photographs from your site",
                "Estimates, approvals, and payment records",
                "A direct conversation with your design team",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="size-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/portal"
              className="inline-flex items-center gap-4 border-b border-primary/40 pb-1 text-xs font-semibold text-primary"
            >
              Go to your client portal <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card p-7 shadow-[0_16px_60px_-30px_rgb(35_50_40_/_0.2)] sm:p-9">
            <div className="flex items-center gap-3 border-b border-border pb-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent">
                <Layers3 className="size-5 text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold">Your project, in focus</p>
                <p className="text-[10px] text-muted-foreground">
                  A shared space for you and your studio
                </p>
              </div>
            </div>
            <div className="relative my-6 aspect-[16/9] overflow-hidden rounded-lg">
              <Image
                src="/reddy-penthouse.jpg"
                alt="Soft natural materials in a residential interior"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="grid grid-cols-3 divide-x divide-border text-center">
              {["Project updates", "Design approvals", "Conversations"].map(
                (label, i) => (
                  <div key={label} className="px-2">
                    <span className="mb-2 block text-[9px] text-primary">
                      0{i + 1}
                    </span>
                    <span className="text-[10px] font-medium">{label}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="bg-[#283e34] text-[#faf8f3]">
          <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 px-5 py-16 sm:px-10 md:flex-row md:items-center lg:px-16">
            <div>
              <p className="mb-4 text-[9px] uppercase tracking-[0.2em] text-white/60">
                Let’s make room for something beautiful
              </p>
              <h2 className="font-editorial text-4xl sm:text-5xl">
                Your next chapter starts here.
              </h2>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex h-12 shrink-0 items-center gap-6 rounded-md bg-background px-6 text-xs font-semibold text-foreground transition-colors hover:bg-white"
            >
              Start your project <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-[1440px] px-5 py-10 sm:px-10 lg:px-16">
        <div className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <Layers3 className="size-7 text-primary" strokeWidth={1.3} />
            <div>
              <p className="text-sm font-semibold">Priya Designs Studio</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Architecture & interiors · Bengaluru
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <Link href="/portal" className="hover:text-primary">
              Client portal
            </Link>
            <Link href="/login" className="hover:text-primary">
              Studio login
            </Link>
            <Link href="/onboarding" className="hover:text-primary">
              Project enquiries <ArrowUpRight className="ml-1 inline size-3" />
            </Link>
          </div>
        </div>
        <p className="pt-6 text-[10px] text-muted-foreground">
          © 2026 Priya Designs Studio. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
