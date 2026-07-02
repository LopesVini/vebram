import Navbar from "@/components/layout/Navbar";
import AboutSection from "@/components/sections/AboutSection";
import DifferentialsSection from "@/components/sections/DifferentialsSection";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

const Sobre = () => {
  useScrollToTop();
  return (
  <>
    <Navbar />
    <main className="pt-20">
      <AboutSection />
      <DifferentialsSection />
    </main>
    <Footer />
  </>
  );
};

export default Sobre;
