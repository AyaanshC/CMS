import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  FileText,
  FolderLock,
  Layers,
  MapPin,
  MessageSquare,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
              P
            </div>
            <div>
              <span className="font-heading text-lg font-bold tracking-tight block text-foreground">
                Priya Designs Studio
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block -mt-0.5">
                Architecture & Interiors &bull; Bengaluru
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#projects" className="hover:text-foreground transition-colors">
              Signature Works
            </a>
            <a href="#services" className="hover:text-foreground transition-colors">
              Disciplines
            </a>
            <a href="#process" className="hover:text-foreground transition-colors">
              Practice Process
            </a>
            <a href="#portal" className="hover:text-foreground transition-colors">
              Client Portal
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/portal/sharma-residence-2024"
              className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-foreground transition-all flex items-center gap-1.5"
            >
              <FolderLock className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>Client Portal</span>
            </Link>

            <Link
              href="/login"
              className="text-xs font-medium px-3.5 py-2 rounded-lg border border-border/80 hover:bg-muted text-foreground transition-colors"
            >
              Studio Login
            </Link>

            <Link
              href="/onboarding"
              className="hidden sm:inline-flex text-xs font-semibold px-4 py-2 rounded-lg bg-neutral-900 hover:bg-black text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-all shadow-xs"
            >
              Start a Project
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 md:py-28 bg-neutral-950 text-white">
        {/* Background Visual */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/studio-showcase.jpg"
            alt="Priya Designs Studio Showcase"
            fill
            sizes="100vw"
            priority
            className="object-cover object-center opacity-40 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Bespoke Architecture & Turnkey Interiors</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-tight">
              Spaces designed with <span className="font-semibold text-white">distinction</span>, executed with{" "}
              <span className="font-semibold text-white">discipline</span>.
            </h1>

            <p className="text-base sm:text-lg text-neutral-300 font-normal leading-relaxed">
              We create luxury private residences and corporate flagship environments. Transparent
              itemised BOQs, three-way procurement matching, and a live client portal keep every
              detail accountable from concept to handover.
            </p>

            <div className="pt-4 flex flex-wrap gap-4 items-center">
              <Link
                href="/portal/sharma-residence-2024"
                className="px-6 py-3.5 rounded-xl bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-100 transition-all shadow-lg flex items-center gap-2"
              >
                <span>Explore Live Client Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/onboarding"
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white font-medium text-sm transition-all"
              >
                Begin Project Consultation
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-16 pt-10 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">14+</p>
              <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">Years of Practice</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">85+</p>
              <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">Turnkey Projects</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">100%</p>
              <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">Transparent BOQs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">Zero</p>
              <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">Surprise Cost Overruns</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects Showcase */}
      <section id="projects" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">
                Curated Portfolio
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Signature Works
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Each residence and commercial space is crafted with artisanal materials, custom
              joinery, and verified site supervision.
            </p>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Project 1: Sharma Villa */}
            <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-xs hover:shadow-md transition-all flex flex-col">
              <div className="relative h-64 overflow-hidden bg-neutral-900">
                <Image
                  src="/studio-showcase.jpg"
                  alt="Sharma Villa Interior"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20">
                    Live Execution &bull; 65% Complete
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Indiranagar, Bengaluru
                    </span>
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" /> 3,200 sqft
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground tracking-tight">Sharma Villa</h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    Contemporary minimalist 4BHK with Dyna Italian marble, fluted walnut walls, and
                    concealed architectural brass profiles.
                  </p>
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Client Portal Active
                  </span>
                  <Link
                    href="/portal/sharma-residence-2024"
                    className="text-xs font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    View Project Portal <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Project 2: TechCorp Office */}
            <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-xs hover:shadow-md transition-all flex flex-col">
              <div className="relative h-64 overflow-hidden bg-neutral-900">
                <Image
                  src="/techcorp-office.jpg"
                  alt="TechCorp HQ Office"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20">
                    Commercial &bull; 35% Complete
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Whitefield, Bengaluru
                    </span>
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" /> 6,200 sqft
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground tracking-tight">
                    TechCorp Global Headquarters
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    Collaborative executive floor with acoustic timber pods, modular workstations,
                    and biophilic atrium lounges.
                  </p>
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">In Design Development</span>
                  <Link
                    href="/portal/techcorp-office-2024"
                    className="text-xs font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    View Project Portal <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Project 3: Reddy Penthouse */}
            <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-xs hover:shadow-md transition-all flex flex-col">
              <div className="relative h-64 overflow-hidden bg-neutral-900">
                <Image
                  src="/reddy-penthouse.jpg"
                  alt="Reddy Penthouse"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20">
                    Residential &bull; Concept Locked
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> HSR Layout, Bengaluru
                    </span>
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" /> 2,400 sqft
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground tracking-tight">
                    Reddy Penthouse Duplex
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    Warm Scandinavian aesthetics featuring bleached oak cabinetry, textured lime
                    wash finishes, and terrace lounge.
                  </p>
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">BOQ Finalized</span>
                  <Link
                    href="/onboarding"
                    className="text-xs font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    Similar Project Plan <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Portal Highlight Section */}
      <section id="portal" className="py-20 bg-neutral-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-neutral-300 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>The Client-Facing Experience</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white leading-snug">
                Total transparency throughout your build.{" "}
                <span className="font-semibold text-white">Live on your phone.</span>
              </h2>

              <p className="text-sm text-neutral-300 leading-relaxed">
                We believe trust is built on real-time data, not guesswork. Our proprietary client
                portal gives homeowners direct oversight of their project.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">
                      Live Site Stories & Photo Feeds
                    </span>
                    <span className="text-xs text-neutral-400">
                      View progress photos, react, and leave direct feedback as rooms take shape.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">
                      Itemised Digital BOQ & Approvals
                    </span>
                    <span className="text-xs text-neutral-400">
                      Approve or decline line items, materials, and change orders with full cost
                      visibility.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">
                      Real-Time Snag Resolution
                    </span>
                    <span className="text-xs text-neutral-400">
                      Track touch-ups and punch list fixes with photographic proof before final
                      milestone sign-off.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  href="/portal/sharma-residence-2024"
                  className="px-6 py-3 rounded-xl bg-white text-neutral-900 font-semibold text-sm hover:bg-neutral-100 transition-all flex items-center gap-2"
                >
                  <span>Open Sharma Villa Client Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Portal Card Preview */}
            <div className="rounded-2xl bg-neutral-950 border border-white/10 p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Sharma Villa &bull; Client Portal</p>
                    <p className="text-xs text-neutral-400">Managed by Priya Designs Studio</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                  65% Handover Progress
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Execution Milestone 3 of 5</span>
                  <span>Target: Nov 30, 2026</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-[65%]" />
                </div>
              </div>

              {/* Site Update Preview */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200">Latest Site Update</span>
                  <span className="text-neutral-500">2 days ago</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  &ldquo;Dyna Italian Marble flooring has been laid and sealed. Recessed architectural
                  warm profile lighting is now active in the living room.&rdquo;
                </p>
                <div className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
                  <span>👍 5 Likes</span>
                  <span>❤️ 3 Loved</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 pt-2">
                <span>Verified by Studio Project Manager</span>
                <Link
                  href="/portal/sharma-residence-2024"
                  className="text-white hover:underline font-medium inline-flex items-center gap-1"
                >
                  Enter full portal &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disciplines & Services */}
      <section id="services" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              End-to-End Architectural Disciplines
            </h2>
            <p className="text-sm text-muted-foreground">
              We eliminate the friction between architectural concept and on-site reality by
              unifying design and contracting under one studio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Spatial Architecture</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Civil re-planning, structural enhancements, vastu alignment, and daylight analysis
                tailored to your family.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Turnkey Execution</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dedicated on-site project managers, weekly quality audits, and guaranteed timeline
                deliverables.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Transparent BOQs</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Granular line-item pricing with manufacturer specifications, unit rates, and zero
                hidden escalation fees.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Custom Joinery</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hand-selected natural veneers, Italian PU finishes, German Blum hardware, and bespoke
                millwork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Process */}
      <section id="process" className="py-20 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">
              Methodology
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Our 5-Stage Practice Roadmap
            </h2>
            <p className="text-sm text-muted-foreground">
              How your design progresses from initial consultation to finished keys.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-center">
            <div className="p-5 rounded-xl bg-background border border-border/80 space-y-2">
              <span className="text-xs font-bold font-mono text-muted-foreground">01</span>
              <h4 className="text-sm font-semibold text-foreground">Discovery Call</h4>
              <p className="text-xs text-muted-foreground">
                Site survey, budget framing, and architectural lifestyle briefing.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-background border border-border/80 space-y-2">
              <span className="text-xs font-bold font-mono text-muted-foreground">02</span>
              <h4 className="text-sm font-semibold text-foreground">3D Visual Concept</h4>
              <p className="text-xs text-muted-foreground">
                Photorealistic renders, material swatches, and lighting plans.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-background border border-border/80 space-y-2">
              <span className="text-xs font-bold font-mono text-muted-foreground">03</span>
              <h4 className="text-sm font-semibold text-foreground">BOQ Freeze</h4>
              <p className="text-xs text-muted-foreground">
                Detailed itemized specifications approved on the portal.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-background border border-border/80 space-y-2">
              <span className="text-xs font-bold font-mono text-muted-foreground">04</span>
              <h4 className="text-sm font-semibold text-foreground">Site Execution</h4>
              <p className="text-xs text-muted-foreground">
                Civil, electricals, carpentry, and live portal photo updates.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-background border border-border/80 space-y-2">
              <span className="text-xs font-bold font-mono text-muted-foreground">05</span>
              <h4 className="text-sm font-semibold text-foreground">Snag & Handover</h4>
              <p className="text-xs text-muted-foreground">
                Full 48-point quality audit, snag fixes, and warranty handover.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Onboarding Section */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl bg-neutral-950 text-white p-10 md:p-16 text-center space-y-6 relative overflow-hidden shadow-xl">
            <div className="max-w-xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white leading-tight">
                Ready to plan your <span className="font-semibold text-white">dream space</span>?
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Tell us about your property, timeline, and design aesthetic. Our team will review
                your brief and schedule a personalized studio consultation.
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <Link
                  href="/onboarding"
                  className="px-6 py-3 rounded-xl bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-100 transition-all shadow-md"
                >
                  Start Project Brief
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all"
                >
                  Studio Staff Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/60 border-t border-border mt-auto py-14">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-8 text-xs text-muted-foreground">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
                P
              </div>
              <span className="font-heading font-bold text-sm text-foreground">
                Priya Designs Studio
              </span>
            </div>
            <p className="max-w-xs leading-relaxed">
              Bespoke architecture, luxury residential interiors, and turnkey project contracting.
            </p>
            <p className="font-mono text-[11px]">GSTIN: 29AABCP1234A1Z5 &bull; PAN: AABCP1234A</p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Studio Location
            </p>
            <p>Suite 402, Prestige Meridian, 14 MG Road</p>
            <p>Bengaluru, Karnataka 560001, India</p>
            <p className="flex items-center gap-1.5 pt-1">
              <Phone className="w-3.5 h-3.5" /> +91 98765 43210
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Navigation
            </p>
            <p>
              <Link href="/portal/sharma-residence-2024" className="hover:text-foreground">
                Client Portal Access
              </Link>
            </p>
            <p>
              <Link href="/onboarding" className="hover:text-foreground">
                Client Onboarding Wizard
              </Link>
            </p>
            <p>
              <Link href="/login" className="hover:text-foreground">
                Studio Management MIS
              </Link>
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-3">
          <span>&copy; {new Date().getFullYear()} Priya Designs Studio. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <span>&bull;</span>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <span>&bull;</span>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
