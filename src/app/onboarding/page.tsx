"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2, ArrowRight, ArrowLeft, Check, Sparkles, Home, Layers,
  CheckCircle2, Compass, Palette, IndianRupee, Heart, ShieldCheck
} from "lucide-react";
import { submitOnboarding } from "@/app/actions/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [propertyType, setPropertyType] = useState("Apartment (3BHK)");
  const [carpetArea, setCarpetArea] = useState(1650);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([
    "Living & Dining",
    "Master Bedroom",
    "Modular Kitchen",
  ]);

  const [selectedStyle, setSelectedStyle] = useState("Japandi");
  const [budgetTier, setBudgetTier] = useState("Premium (₹15L - ₹25L)");

  // Submitted project portal slug
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleRoom = (room: string) => {
    setSelectedRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const STYLES = [
    {
      id: "Japandi",
      name: "Japandi",
      desc: "Warm minimalism, light oak, organic textures, functional calm.",
      image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=60",
    },
    {
      id: "Contemporary",
      name: "Modern Contemporary",
      desc: "Clean geometry, subtle metallic accents, fluted panels, layered lighting.",
      image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=60",
    },
    {
      id: "NeoClassical",
      name: "Neo-Classical Luxury",
      desc: "Mouldings, wainscoting, marble inlays, rich brass trims, European elegance.",
      image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&auto=format&fit=crop&q=60",
    },
    {
      id: "Minimalist",
      name: "Warm Minimalist",
      desc: "Seamless joinery, concealed storage, neutral palettes, clutter-free.",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=60",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetEstimate = budgetTier.includes("25L") ? 2200000 : budgetTier.includes("15L") ? 1400000 : undefined;
    submitOnboarding({
      full_name: fullName, phone, email, address, property_type: propertyType, area_sqft: carpetArea,
      budget_label: budgetTier, budget_estimate: budgetEstimate, style: selectedStyle, rooms: selectedRooms,
    }).then((r) => {
      if (r.ok) {
        setSubmitted(r.reference);
        setStep(5);
      } else {
        setError(r.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">our studio</p>
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
                  We'll customize your interior design consultation based on these details.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Your Full Name *</label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohini & Siddharth Roy"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">WhatsApp / Phone *</label>
                    <Input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 00000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Property Address / Community *</label>
                  <Input
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
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="Apartment (2BHK)">Apartment (2BHK)</option>
                      <option value="Apartment (3BHK)">Apartment (3BHK)</option>
                      <option value="Apartment (4BHK / Penthouse)">Apartment (4BHK / Penthouse)</option>
                      <option value="Independent Villa">Independent Villa</option>
                      <option value="Commercial / Boutique Office">Commercial / Boutique Office</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Carpet Area (sqft)</label>
                    <Input
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
                    {[
                      "Living & Dining",
                      "Master Bedroom",
                      "Kids / Guest Bedroom",
                      "Modular Kitchen",
                      "Foyer & Entryway",
                      "Balcony / Deck",
                      "Pooja Room",
                      "Home Office / Study",
                      "Bathrooms & Vanity",
                    ].map((room) => {
                      const isSelected = selectedRooms.includes(room);
                      return (
                        <button
                          key={room}
                          type="button"
                          onClick={() => toggleRoom(room)}
                          className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-xs"
                              : "border-border hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{room}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
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
                    <div
                      key={st.id}
                      onClick={() => setSelectedStyle(st.id)}
                      className={`overflow-hidden rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-600 shadow-md ring-2 ring-indigo-200"
                          : "border-border hover:border-slate-300"
                      }`}
                    >
                      <div className="h-32 bg-slate-900 overflow-hidden relative">
                        <img
                          src={st.image}
                          alt={st.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <p className="font-bold text-sm text-foreground">{st.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{st.desc}</p>
                      </div>
                    </div>
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
                    {[
                      { tier: "Value (₹8L - ₹15L)", desc: "Commercial ply + laminates, essential storage" },
                      { tier: "Premium (₹15L - ₹25L)", desc: "Marine ply, acrylic/PU finishes, profiles, quartz" },
                      { tier: "Luxury (₹25L+)", desc: "Veneers, Italian marble, smart automation, custom brass" },
                    ].map((b) => (
                      <button
                        key={b.tier}
                        type="button"
                        onClick={() => setBudgetTier(b.tier)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          budgetTier === b.tier
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-900"
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
                <Button onClick={handleSubmit} className="gradient-primary border-0 text-white gap-2 shadow-sm">
                  <Sparkles className="w-4 h-4" /> Submit & Create Client Portal
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
                <Link href="/projects">
                  <Button variant="outline">
                    Return to CRM Projects
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
