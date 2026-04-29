import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const brewStyles = ["Hot", "Iced"];
const methods = ["Percolation", "Immersion", "Hybrid"];

const roastLevels = {
  1: { label: "Light", temperature: "100°C" },
  2: { label: "Medium-Light", temperature: "96°C" },
  3: { label: "Medium", temperature: "93°C" },
  4: { label: "Medium-Dark", temperature: "90°C" },
};

const defaultSettings = {
  brewStyle: "Hot",
  method: "Percolation",
  dose: "15",
  ratio: "16.67",
  roastLevel: "1",
  grinder: "KINGrinder K7",
};

const storageKey = "v60-switch-brew-calculator-settings";

const grinders = {
  "KINGrinder K7": {
    notes: "Based on your current V60 sweet spot around 100 clicks.",
    settings: {
      Hot: {
        Percolation: "100 clicks",
        Immersion: "90–95 clicks",
        Hybrid: "95–100 clicks",
      },
      Iced: {
        Percolation: "95–100 clicks",
        Immersion: "85–90 clicks",
        Hybrid: "90–95 clicks",
      },
    },
  },
  "1Zpresso ZP6 Special": {
    notes:
      "Start here, then adjust by taste. ZP6 often lands around 40–50 clicks for pour-over starting points.",
    settings: {
      Hot: {
        Percolation: "45–50 clicks",
        Immersion: "40–45 clicks",
        Hybrid: "42–48 clicks",
      },
      Iced: {
        Percolation: "42–48 clicks",
        Immersion: "38–44 clicks",
        Hybrid: "40–46 clicks",
      },
    },
  },
};

const recipeRules = {
  Hot: {
    Percolation: {
      icePercent: 0,
      title: "Classic V60-style percolation",
      steps: ({ bloom, remaining }) => [
        "Rinse filter and preheat the Switch with valve open.",
        `Add coffee, then bloom with ${bloom}g water for 40 seconds.`,
        `Pulse pour the remaining ${remaining}g water in 3–4 gentle pours.`,
        "Aim for a total drawdown around 2:45–3:30.",
      ],
    },
    Immersion: {
      icePercent: 0,
      title: "Full immersion Switch brew",
      steps: ({ hotWater }) => [
        `Close the Switch valve and add ${hotWater}g hot water first.`,
        "Add coffee, stir or swirl gently to wet all grounds.",
        "Steep for 3:30–4:30 depending on roast and taste.",
        "Open valve and drain fully.",
      ],
    },
    Hybrid: {
      icePercent: 0,
      title: "Hybrid bloom + immersion",
      steps: ({ bloom, remaining }) => [
        `Start with valve open and bloom with ${bloom}g water for 40–45 seconds.`,
        `Close valve, add the remaining ${remaining}g water.`,
        "Steep until around 3:15 total brew time.",
        "Open valve and drain. Finish around 4:00–4:30.",
      ],
    },
  },
  Iced: {
    Percolation: {
      icePercent: 0.4,
      title: "Iced percolation over ice",
      steps: ({ ice, bloom, remaining }) => [
        `Put ${ice}g ice in the server. Keep the Switch valve open.`,
        `Bloom with ${bloom}g hot water for 40 seconds.`,
        `Pulse pour the remaining ${remaining}g hot water slowly.`,
        "Swirl the server to chill and dilute evenly.",
      ],
    },
    Immersion: {
      icePercent: 0.4,
      title: "Iced full immersion",
      steps: ({ ice, hotWater }) => [
        `Put ${ice}g ice in the server. Close the Switch valve.`,
        `Add ${hotWater}g hot water into the brewer, then add coffee.`,
        "Steep for 3:00–4:00. Stir or swirl gently once.",
        "Open valve and drain over ice. Swirl to finish.",
      ],
    },
    Hybrid: {
      icePercent: 0.4,
      title: "Iced hybrid Switch brew",
      steps: ({ ice, bloom, remaining }) => [
        `Put ${ice}g ice in the server. Start with valve open.`,
        `Bloom with ${bloom}g hot water for 40 seconds.`,
        `Close valve and add the remaining ${remaining}g hot water.`,
        "Steep until around 2:45–3:15, then open valve and drain over ice.",
      ],
    },
  },
};

function round(value) {
  return Math.round(Number(value) || 0);
}

function getPositiveNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getInitialSettings() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return { ...defaultSettings, loadedFromStorage: false };

    const parsed = JSON.parse(saved);

    return {
      ...defaultSettings,
      ...parsed,
      loadedFromStorage: true,
    };
  } catch {
    return { ...defaultSettings, loadedFromStorage: false };
  }
}

function Card({ children, className = "" }) {
  return (
    <div className={`border ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function IconBadge({ children }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-lg">
      {children}
    </span>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <Card className="rounded-2xl shadow-sm border-neutral-200 bg-white/80">
      <CardContent className="p-4 flex items-center gap-3">
        <IconBadge>{icon}</IconBadge>
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
          <div className="text-lg font-semibold text-neutral-900">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldLabel({ icon, children }) {
  return (
    <span className="text-sm font-medium flex items-center gap-2">
      <span>{icon}</span>
      {children}
    </span>
  );
}

export default function App() {
  const initialSettings = useMemo(() => getInitialSettings(), []);
  const [brewStyle, setBrewStyle] = useState(initialSettings.brewStyle);
  const [method, setMethod] = useState(initialSettings.method);
  const [dose, setDose] = useState(initialSettings.dose);
  const [ratio, setRatio] = useState(initialSettings.ratio);
  const [roastLevel, setRoastLevel] = useState(initialSettings.roastLevel);
  const [grinder, setGrinder] = useState(initialSettings.grinder);
  const [loadedFromStorage] = useState(initialSettings.loadedFromStorage);

  useEffect(() => {
    const settings = { brewStyle, method, dose, ratio, roastLevel, grinder };
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [brewStyle, method, dose, ratio, roastLevel, grinder]);

  const result = useMemo(() => {
    const safeBrewStyle = recipeRules[brewStyle] ? brewStyle : defaultSettings.brewStyle;
    const safeMethod = recipeRules[safeBrewStyle][method] ? method : defaultSettings.method;
    const safeGrinder = grinders[grinder] ? grinder : defaultSettings.grinder;
    const safeRoastLevel = roastLevels[roastLevel] ? roastLevel : defaultSettings.roastLevel;
    const rule = recipeRules[safeBrewStyle][safeMethod];
    const roast = roastLevels[safeRoastLevel];
    const doseInGrams = getPositiveNumber(dose, getPositiveNumber(defaultSettings.dose));
    const ratioValue = getPositiveNumber(ratio, getPositiveNumber(defaultSettings.ratio));
    const total = round(doseInGrams * ratioValue);
    const ice = round(total * rule.icePercent);
    const hotWater = Math.max(total - ice, 0);
    const bloom = Math.min(50, hotWater);
    const remaining = Math.max(hotWater - bloom, 0);
    const grinderData = grinders[safeGrinder];

    return {
      ...rule,
      brewStyle: safeBrewStyle,
      method: safeMethod,
      ratio: ratioValue,
      roastLabel: roast.label,
      temperature: roast.temperature,
      total,
      ice,
      hotWater,
      bloom,
      remaining,
      grind: grinderData.settings[safeBrewStyle]?.[safeMethod] || "Adjust by taste",
      grinderNote: grinderData.notes,
      steps: rule.steps({ total, ice, hotWater, bloom, remaining }),
    };
  }, [brewStyle, method, dose, ratio, roastLevel, grinder]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-neutral-100 p-4 sm:p-8 text-neutral-900">
      <div className="max-w-3xl mx-auto space-y-5">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <div className="inline-flex items-center justify-center p-3 rounded-3xl bg-white shadow-sm mb-3 text-4xl">
            ☕
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            V60 Switch Brew Calculator
          </h1>
          <p className="mt-2 text-neutral-600">
            A quick dose calculator with adjustable brew settings when you want to tinker.
          </p>
          {loadedFromStorage && (
            <div className="mt-3 inline-flex rounded-full bg-neutral-950 px-4 py-2 text-xs font-medium text-white shadow-sm">
              Showing last used settings
            </div>
          )}
        </motion.header>

        <Card className="rounded-3xl shadow-md bg-white/90 border-neutral-200">
          <CardContent className="p-5 sm:p-6">
            <label className="space-y-3 block">
              <FieldLabel icon="⚖️">Coffee (grams)</FieldLabel>
              <input
                type="number"
                min="5"
                max="40"
                step="0.5"
                value={dose}
                onChange={(event) => setDose(event.target.value)}
                className="w-full rounded-3xl border border-neutral-300 bg-white px-5 py-5 text-4xl font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </label>
          </CardContent>
        </Card>

        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon="💧" label="Total mass" value={`${result.total}g`} />
          <StatCard icon="⚙️" label="Grind" value={result.grind} />
          <StatCard icon="🌡️" label="Temperature" value={result.temperature} />
          <StatCard icon="🔥" label="Hot water" value={`${result.hotWater}g`} />
          <StatCard icon="❄️" label="Ice" value={result.ice > 0 ? `${result.ice}g` : "None"} />
          <StatCard icon="☕" label="Bloom" value={`${result.bloom}g`} />
        </section>

        <Card className="rounded-3xl shadow-md bg-white/90 border-neutral-200">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-900">Brew settings</div>
                <div className="text-sm text-neutral-500">
                  Defaults stay put. Adjust when the beans demand drama.
                </div>
              </div>
              <div className="rounded-full bg-neutral-100 p-1 flex gap-1">
                {brewStyles.map((style) => {
                  const isActive = brewStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setBrewStyle(style)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-neutral-950 text-white shadow-sm"
                          : "text-neutral-600 hover:bg-white"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-2">
                <FieldLabel icon="💧">Brew method</FieldLabel>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {methods.map((methodName) => (
                    <option key={methodName} value={methodName}>
                      {methodName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <FieldLabel icon="⚙️">Grinder</FieldLabel>
                <select
                  value={grinder}
                  onChange={(event) => setGrinder(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {Object.keys(grinders).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <FieldLabel icon="📐">Ratio</FieldLabel>
                <div className="flex items-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-neutral-900">
                  <span className="text-neutral-500 mr-1">1:</span>
                  <input
                    type="number"
                    min="10"
                    max="20"
                    step="0.01"
                    value={ratio}
                    onChange={(event) => setRatio(event.target.value)}
                    className="w-full bg-transparent text-base focus:outline-none"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel icon="🔥">Roast level</FieldLabel>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                    {result.roastLabel}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={roastLevel}
                  onChange={(event) => setRoastLevel(event.target.value)}
                  className="w-full accent-neutral-950"
                />
                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>Light</span>
                  <span>Medium-Dark</span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-md bg-white border-neutral-200 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 sm:p-6 border-b bg-neutral-950 text-white">
              <div className="text-sm text-neutral-300">
                {result.brewStyle} • {result.method} • {result.roastLabel}
              </div>
              <h2 className="text-2xl font-bold mt-1">{result.title}</h2>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <span>⏱️</span> Recipe steps
                </h3>
                <ol className="space-y-3">
                  {result.steps.map((step, index) => (
                    <li key={`${index}-${step}`} className="flex gap-3">
                      <span className="flex-none w-7 h-7 rounded-full bg-neutral-900 text-white text-sm flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-neutral-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600 bg-neutral-50">
                <div className="font-medium text-neutral-900 mb-1">Grinder note</div>
                {result.grinderNote} If the cup is sour or drains too fast, go finer. If bitter,
                dry, or choking, go coarser.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/70 border-neutral-200">
          <CardContent className="p-5 flex items-start gap-3 text-sm text-neutral-600">
            <span className="text-lg leading-none mt-0.5">➕</span>
            <p>
              Future grinder support is simple: add another grinder profile with settings for
              Hot/Iced and Percolation/Immersion/Hybrid. The app logic already expects more
              grinders.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
