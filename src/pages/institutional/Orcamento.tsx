import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import GetStarted from "@/components/sections/GetStarted";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

const Orcamento = () => {
  useScrollToTop();
  useEffect(() => {
  }, []);

  return (
    <div className="bg-background min-h-screen text-foreground antialiased">
      <Navbar />
      <main className="pt-20">
        <GetStarted />
      </main>
      <Footer />
    </div>
  );
};

export default Orcamento;
