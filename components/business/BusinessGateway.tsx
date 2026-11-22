"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Store } from "lucide-react";

export default function BusinessGateway() {
  return <main className="klin-business-page">
    <Link href="/" className="klin-business-back"><ArrowLeft size={15}/> Main menu</Link>
    <div className="klin-home-eyebrow"><BriefcaseBusiness size={14}/> KLIN BUSINESS EXCHANGE</div>
    <h1>Shop or Create a Business</h1>
    <p className="klin-business-intro">Choose whether you want to start your own business with Klin or shop from other creators.</p>
    <div className="klin-business-options">
      <Link href="/builder?type=business" className="klin-business-option"><span><BriefcaseBusiness size={23}/></span><h2>Create a Business</h2><p>Klin will help you plan your business, shape its offer, and build the website and tools it needs.</p><b>Start creating <ArrowUpRight size={15}/></b></Link>
      <Link href="/marketplace" className="klin-business-option"><span><Store size={23}/></span><h2>Shop</h2><p>Browse businesses and products listed by Klin creators. Open listings and preview what is available.</p><b>Browse the shop <ArrowUpRight size={15}/></b></Link>
    </div>
  </main>;
}
