"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Starter", price: 0, yearly: 0, popular: false,
    desc: "Kick the tires. NBA-only, one card a day.",
    features: ["Daily NBA card", "Basic chat analyst", "Model edges on moneylines", "Pass-day discipline built in"],
  },
  {
    name: "Pro", price: 29, yearly: 290, popular: true,
    desc: "For the bettor who plays most nights.",
    features: ["Everything in Starter", "All sports", "PrizePicks / Underdog board grading", "Props, totals & parlays", "Unlimited chat + image uploads"],
  },
  {
    name: "Elite", price: 79, yearly: 790, popular: false,
    desc: "Maximum edge and earliest features.",
    features: ["Everything in Pro", "Line-movement & CLV alerts", "Priority model + faster cards", "Early access to new sports", "Personal tracking & units log"],
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Pricing</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Plans that pay for themselves</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Start free. Upgrade when the edges start cashing.</p>

        <div className="mt-8 flex justify-center">
          <div className="relative flex rounded-full border border-slate-200 bg-slate-100 p-1">
            {(["Monthly", "Yearly"] as const).map((label, i) => {
              const active = (i === 1) === yearly;
              return (
                <button key={label} onClick={() => setYearly(i === 1)} className="relative z-10 rounded-full px-5 py-2 text-sm font-medium">
                  {active && <motion.span layoutId="billing-pill" className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 30 }} />}
                  <span className={active ? "text-slate-900" : "text-slate-500"}>{label}{label === "Yearly" && <span className="ml-1 text-blue-600">−17%</span>}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.price;
          return (
            <div key={plan.name}
              className={`group relative flex flex-col rounded-2xl border bg-white p-7 transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? "border-blue-300 shadow-[0_20px_60px_-20px_rgba(37,99,235,0.5)] ring-1 ring-blue-200"
                  : "border-slate-200 hover:border-blue-300 hover:shadow-[0_20px_50px_-20px_rgba(37,99,235,0.4)]"
              }`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">Most popular</span>
              )}
              <h3 className="font-display text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{plan.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-slate-900">${price}</span>
                <span className="text-sm text-slate-500">/{yearly ? "year" : "month"}</span>
              </div>

              {/* Stripe checkout wires in here later. */}
              <Link href="/app"
                className={`mt-6 w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-[0_10px_30px_-8px_rgba(37,99,235,0.6)]"
                    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}>
                {price === 0 ? "Start free" : "Get started"}
              </Link>

              <ul className="mt-7 space-y-3 border-t border-slate-100 pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">Payments via Stripe (coming soon). Cancel anytime.</p>
    </section>
  );
}
