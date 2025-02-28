
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart2, LineChart, PieChart, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 mb-6 text-sm rounded-full bg-primary/10 text-primary animate-fade-in">
              <span>Introduced by - Team Nexus</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 animate-fade-in">
              Visualize Your Data with <span className="text-gradient">Precision</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl animate-fade-in">
              Upload any dataset and instantly generate beautiful, interactive visualizations. Discover insights and patterns you never knew existed.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-2 animate-fade-in">
              <Link to="/upload">
                <Button className="px-6 py-6 rounded-lg" size="lg">
                  <Upload className="mr-2 h-5 w-5" /> Upload Dataset
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="px-6 py-6 rounded-lg" size="lg">
                  Explore Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 md:left-20 hidden md:block animate-float opacity-20">
          <BarChart2 className="h-24 w-24 text-primary" />
        </div>
        <div className="absolute top-1/4 right-4 md:right-40 hidden md:block animate-float opacity-20">
          <LineChart className="h-16 w-16 text-primary" />
        </div>
        <div className="absolute bottom-1/4 left-1/4 hidden md:block animate-float opacity-20">
          <PieChart className="h-20 w-20 text-primary" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform offers a comprehensive suite of tools for data visualization and analysis.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-hover bg-card rounded-xl p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Easy Data Upload</h3>
              <p className="text-muted-foreground">
                Simply drag and drop your CSV files to get started. Our system automatically detects columns and data types.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="card-hover bg-card rounded-xl p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Smart Visualizations</h3>
              <p className="text-muted-foreground">
                Our platform automatically generates the most appropriate visualizations based on your data structure.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="card-hover bg-card rounded-xl p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground">
                Uncover trends, patterns, and insights with our built-in analytical tools and AI-powered suggestions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Moving Text Banner */}
      <div className="bg-primary text-primary-foreground py-4 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-text-slide">
          <div className="flex space-x-4 px-4">
            {Array(10).fill("Visualize • Analyze • Discover • Decide • ").map((text, i) => (
              <span key={i} className="text-lg font-medium">{text}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Data?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of data professionals who use our platform to make better decisions through data visualization.
          </p>
          <Link to="/upload">
            <Button className="px-8 py-6 rounded-lg" size="lg">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
