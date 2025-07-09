
import { serviceCategories } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function ServiceCategories() {
  return (
    <section id="services" className="py-16 sm:py-20 lg:py-32 bg-gradient-to-br from-warm-sage/10 to-healing-teal/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-3xl sm:text-4xl">🧠</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-trust-navy font-serif">
              Specialized Therapy for
            </h2>
          </div>
          
          {/* Target Audience Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto mb-8 text-left">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/50 rounded-lg backdrop-blur-sm">
              <span className="text-xl sm:text-2xl">🎓</span>
              <span className="text-sm sm:text-base text-trust-navy font-medium">Students confused about their career path</span>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/50 rounded-lg backdrop-blur-sm">
              <span className="text-xl sm:text-2xl">🧑‍💼</span>
              <span className="text-sm sm:text-base text-trust-navy font-medium">Working professionals juggling too much</span>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/50 rounded-lg backdrop-blur-sm">
              <span className="text-xl sm:text-2xl">🔁</span>
              <span className="text-sm sm:text-base text-trust-navy font-medium">Career changers facing uncertainty</span>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/50 rounded-lg backdrop-blur-sm">
              <span className="text-xl sm:text-2xl">📈</span>
              <span className="text-sm sm:text-base text-trust-navy font-medium">Entrepreneurs battling burnout</span>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/50 rounded-lg backdrop-blur-sm md:col-span-2 xl:col-span-2">
              <span className="text-xl sm:text-2xl">🕒</span>
              <span className="text-sm sm:text-base text-trust-navy font-medium">Anyone struggling with goal-setting & time management</span>
            </div>
          </div>
        </div>
        
        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 mb-12 lg:mb-16">
          {serviceCategories.map((service) => (
            <Card key={service.name} className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-therapy group bg-gradient-to-br from-card to-warm-sage/5 h-full">
              <div className="h-48 w-full overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.name} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="bg-therapy-gradient text-white p-3 rounded-full shadow-calming flex-shrink-0">
                  <service.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-trust-navy font-serif">{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <p className="text-muted-foreground mb-4 text-sm sm:text-base leading-relaxed">{service.description}</p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6 flex-grow">
                  {service.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-calming-green rounded-full mt-2 flex-shrink-0"></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full group/btn bg-therapy-gradient hover:opacity-90 shadow-calming mt-auto" asChild>
                  <Link to="/client">
                    Match Me with a Therapist
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Call to Action */}
        <div className="bg-healing-gradient rounded-2xl p-6 sm:p-8 lg:p-12 text-center text-white shadow-therapy">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 lg:mb-6 font-serif flex items-center justify-center gap-2">
            <span>💡</span>
            Why Therapy for Career Growth?
          </h3>
          <p className="mb-6 lg:mb-8 max-w-3xl mx-auto opacity-90 text-sm sm:text-base lg:text-lg leading-relaxed">
            Sometimes, what holds us back isn't skill — it's self-doubt, stress, or lack of clarity. 
            Therapy helps you set realistic goals, master productivity without burnout, and build confidence in your choices.
          </p>
          <Button size="lg" variant="secondary" className="bg-white/20 backdrop-blur-sm hover:bg-white/30 border-white/30 text-sm sm:text-base" asChild>
            <a href="mailto:hello@zenjourney.in">
              Create My Personal Growth Plan
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
