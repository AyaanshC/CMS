"use client";

import { useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, ArrowRight, ArrowLeft, Check, Sparkles, CheckCircle2 } from "lucide-react";
import { submitOnboarding } from "@/app/actions/onboarding";

import type {IntakeOptions} from "@/lib/onboarding/options";
export default function EnquiryForm({options,studioName}:{options:IntakeOptions;studioName:string}) {


  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form State
  const [fullName, setFullName] = useState("");
  const [website,setWebsite]=useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [propertyType, setPropertyType] = useState(options.property_types[0]);
  const [carpetArea, setCarpetArea] = useState(1650);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const [selectedStyle, setSelectedStyle] = useState(options.styles[0].id);
  const [budgetTier, setBudgetTier] = useState(options.budget_tiers[0].tier);

  // Submitted project portal slug
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleRoom = (room: string) => {
    setSelectedRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const STYLES=options.styles;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    const budgetEstimate = options.budget_tiers.find(b=>b.tier===budgetTier)?.estimate;
    const r = await submitOnboarding({
      website,full_name: fullName, phone, email, address, property_type: propertyType, area_sqft: carpetArea,
      budget_label: budgetTier, budget_estimate: budgetEstimate, style: selectedStyle, rooms: selectedRooms,
    });
      if (r.ok) {
        setSubmitted(r.reference);
        setStep(5);
      } else {
        setError(r.error);
      }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">{studioName}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Client Design Intake</p>
            </div>
          </div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-primary">
            Staff Portal →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full px-4 py-8 flex-1">
        {step <= 4 && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span className="font-medium text-foreground">
                {step === 1 && "Personal & Property Details"}
                {step === 2 && "Scope & Rooms"}
                {step === 3 && "Design Aesthetics"}
                {step === 4 && "Budget & Handover Timeline"}
              </span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-1.5" />
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <Card className="shadow-sm border border-border">
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Tell us about you & your home</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;ll customize your interior design consultation based on these details.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Your Full Name *</label>
                  <Input aria-label="Your Full Name *"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohini & Siddharth Roy"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">WhatsApp / Phone *</label>
                    <Input aria-label="WhatsApp / Phone *"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 00000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Email Address</label>
                    <Input aria-label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Property Address / Community *</label>
                  <Input aria-label="Property Address / Community *"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Tower 3, Flat 1204, Prestige Lakeside Habitat, Varthur"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  disabled={!fullName.trim() || !phone.trim() || !address.trim()}
                  onClick={() => setStep(2)}
                  className="gradient-primary border-0 text-white gap-2"
                >
                  Continue to Scope <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <Card className="shadow-sm border border-border">
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Property Specifications & Scope</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Select which rooms require design, carpentry, and styling.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Property Type</label>
                    <select aria-label="Property Type"
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {options.property_types.map(type=><option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Carpet Area (sqft)</label>
                    <Input aria-label="Carpet Area (sqft)"
                      type="number"
                      value={carpetArea}
                      onChange={(e) => setCarpetArea(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">
                    Spaces in Scope (Click to toggle)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {options.rooms.map((room) => {
                      const isSelected = selectedRooms.includes(room);
                      return (
                        <button
                          key={room}
                          type="button"
                          onClick={() => toggleRoom(room)}
                          className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
                            isSelected
                              ? "border-primary bg-accent/80 text-primary shadow-xs"
                              : "border-border hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{room}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="gradient-primary border-0 text-white gap-2">
                  Style Quiz <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <Card className="shadow-sm border border-border">
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Select Your Aesthetic Vibe</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Which design aesthetic resonates best with your envisioned lifestyle?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STYLES.map((st) => {
                  const isSelected = selectedStyle === st.id;
                  return (
                    <button type="button" aria-pressed={isSelected}
                      key={st.id}
                      onClick={() => setSelectedStyle(st.id)}
                      className={`overflow-hidden rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary shadow-md ring-2 ring-primary/20"
                          : "border-border hover:border-slate-300"
                      }`}
                    >
                      <div className="h-32 bg-slate-900 overflow-hidden relative">
                        {st.image&&<img
                          src={st.image}
                          alt={st.name}
                          className="w-full h-full object-cover"
                        />}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <p className="font-bold text-sm text-foreground">{st.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{st.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep(4)} className="gradient-primary border-0 text-white gap-2">
                  Budget & Timeline <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <Card className="shadow-sm border border-border">
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Target Budget & Final Review</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  This helps our team curate matching materials, hardware, and finishes.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">Target Budget Tier</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {options.budget_tiers.map((b) => (
                      <button
                        key={b.tier}
                        type="button"
                        onClick={() => setBudgetTier(b.tier)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          budgetTier === b.tier
                            ? "border-primary bg-accent/70 text-primary"
                            : "border-border hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <p className="font-bold text-xs">{b.tier}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{b.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-border text-xs space-y-1.5">
                  <p className="font-bold text-foreground">Intake Summary</p>
                  <p className="text-muted-foreground">Client: <span className="font-semibold text-foreground">{fullName}</span> ({phone})</p>
                  <p className="text-muted-foreground">Location: <span className="font-semibold text-foreground">{address}</span></p>
                  <p className="text-muted-foreground">Scope: <span className="font-semibold text-foreground">{selectedRooms.join(", ")}</span> ({carpetArea} sqft)</p>
                  <p className="text-muted-foreground">Aesthetic: <span className="font-semibold text-foreground">{selectedStyle}</span></p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                {error && <p role="alert" className="text-sm text-destructive mb-2">{error}</p>}
                <Button disabled={busy} onClick={handleSubmit} className="gradient-primary border-0 text-white gap-2 shadow-sm">
                  <Sparkles className="w-4 h-4" /> {busy ? "Submitting…" : "Submit project enquiry"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: Success & Portal Created */}
        {submitted && (
          <Card className="shadow-lg border-emerald-200 bg-white text-center p-8">
            <CardContent className="space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <Badge className="bg-emerald-600 text-white border-0 text-xs mb-2">
                  Enquiry Submitted
                </Badge>
                <h2 className="text-2xl font-bold text-foreground">Welcome aboard, {fullName}!</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Thank you. Your reference is {submitted}. Our team will call you within one working day.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link href="/">
                  <Button variant="outline">
                    Return to studio website
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-4 text-center text-xs text-muted-foreground">
        Powered by our studio · Interior Designer Client Management System
      </footer>
    </div>
  );
}
