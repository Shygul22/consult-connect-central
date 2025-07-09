
import { DynamicHero } from "@/components/landing/DynamicHero";
import { ServiceCategories } from "@/components/landing/ServiceCategories";
import { CallToAction } from "@/components/landing/CallToAction";
import { FeaturedConsultants } from "@/components/landing/FeaturedConsultants";
import { InteractiveStats } from "@/components/landing/InteractiveStats";
import { InteractiveNavigation } from "@/components/landing/InteractiveNavigation";
import { ScrollToTop } from "@/components/landing/ScrollToTop";
import { BlogSection } from "@/components/landing/BlogSection";

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <InteractiveNavigation />
      <main className="flex-1">
        <DynamicHero />
        <div className="space-y-16 md:space-y-24 lg:space-y-32">
          <InteractiveStats />
          <ServiceCategories />
          <FeaturedConsultants />
          <BlogSection />
          <CallToAction />
        </div>
      </main>
      <ScrollToTop />
    </div>
  );
};

export default Index;
