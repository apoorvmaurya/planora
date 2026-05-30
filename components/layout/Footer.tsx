"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);
const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
);

export function Footer() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const productLinks = [
    { name: "Features", href: "/#features" },
    { name: "Coming Soon", href: "/coming-soon" },
    { name: "Templates", href: "/templates" },
    { name: "Guides", href: "/guides" },
  ];

  const companyLinks = [
    { name: "About Us", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ];

  const socialLinks = [
    { icon: TwitterIcon, href: "#", label: "Twitter", color: "hover:text-[#1DA1F2] hover:border-[#1DA1F2]" },
    { icon: InstagramIcon, href: "#", label: "Instagram", color: "hover:text-[#E1306C] hover:border-[#E1306C]" },
    { icon: GithubIcon, href: "#", label: "GitHub", color: "hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-white" },
  ];

  return (
    <footer className="w-full border-t border-slate-200/50 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-xl transition-colors duration-500 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-24 left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-[#1D9E75]/5 dark:bg-[#1D9E75]/10 rounded-full blur-[120px]" />
        <div className="absolute -top-16 right-[15%] w-48 h-48 bg-blue-500/[0.03] dark:bg-blue-500/[0.08] rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* ===== Main Footer Content ===== */}
        <div className="py-16 sm:py-20 lg:py-24">
          <div className="flex flex-col gap-16 lg:gap-20">
            
            {/* Top Row: Branding and Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
              
              {/* Brand block — Spans left side on desktop/tablet, centered on mobile */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-5">
                <Link href="/" className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white hover:opacity-90 transition-opacity">
                  Plan<span className="text-[#1D9E75]">ora</span>
                </Link>
                <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-[1.7] max-w-sm">
                  Turning &quot;we should hang out&quot; into &quot;here&apos;s the boarding pass&quot;. The ultimate collaborative trip planner.
                </p>
                {/* Social Icons */}
                <div className="flex gap-3 pt-2">
                  {socialLinks.map((social, index) => {
                    const Icon = social.icon;
                    return (
                      <motion.a
                        key={index}
                        href={social.href}
                        aria-label={social.label}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-10 h-10 rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-all duration-300 shadow-sm ${social.color}`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </motion.a>
                    );
                  })}
                </div>
              </div>

              {/* Links block — Spans right side, aligning side-by-side links */}
              <div className="grid grid-cols-2 gap-8 sm:gap-12 max-w-[280px] sm:max-w-xs mx-auto w-full md:max-w-none md:mx-0 md:justify-end">
                {/* Product links */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-[0.15em] mb-5 sm:mb-6">
                    Product
                  </h4>
                  <ul className="space-y-4">
                    {productLinks.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="relative text-slate-500 dark:text-slate-400 hover:text-[#1D9E75] dark:hover:text-teal-400 font-medium text-sm sm:text-[15px] transition-colors duration-300 group inline-block"
                        >
                          {link.name}
                          <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#1D9E75] dark:bg-teal-400 transition-all duration-300 group-hover:w-full rounded-full" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company links */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-[0.15em] mb-5 sm:mb-6">
                    Company
                  </h4>
                  <ul className="space-y-4">
                    {companyLinks.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="relative text-slate-500 dark:text-slate-400 hover:text-[#1D9E75] dark:hover:text-teal-400 font-medium text-sm sm:text-[15px] transition-colors duration-300 group inline-block"
                        >
                          {link.name}
                          <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#1D9E75] dark:bg-teal-400 transition-all duration-300 group-hover:w-full rounded-full" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Center Row: Newsletter Section */}
            <div className="flex flex-col items-center text-center space-y-6 pt-12 border-t border-slate-200/30 dark:border-slate-800/40 w-full max-w-2xl mx-auto">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-[0.2em]">
                  Stay Updated
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-[15px] leading-relaxed max-w-md">
                  Join our mailing list to receive the latest updates, templates, and travel guides.
                </p>
              </div>
              <div className="relative flex items-center w-full max-w-md pt-2">
                <input
                  type="email"
                  placeholder="your.email@domain.com"
                  className="w-full bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 rounded-xl py-3.5 pl-5 pr-[5.5rem] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] dark:focus:border-teal-500 transition-all duration-300 shadow-sm"
                />
                <button className="absolute right-2 bg-[#1D9E75] hover:bg-[#15805e] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-[#1D9E75]/20">
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Divider ===== */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200/60 dark:via-slate-800/60 to-transparent" />

        {/* ===== Bottom Bar ===== */}
        <div className="py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400 dark:text-slate-500">
          <p className="font-medium">
            © {mounted ? new Date().getFullYear() : 2026} Planora. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 font-medium">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" /> for better trips.
          </p>
        </div>
      </div>
    </footer>
  );
}
