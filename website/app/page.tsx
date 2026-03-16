import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Architecture from "@/components/Architecture";
import DemoScenarios from "@/components/DemoScenarios";
import TechStack from "@/components/TechStack";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Architecture />
      <DemoScenarios />
      <TechStack />
      <Footer />
    </div>
  );
}
