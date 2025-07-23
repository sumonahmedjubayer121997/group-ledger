
import { ArrowRight, Users, DollarSign, BarChart3, Shield, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">SplitWize</span>
          </div>
          <Button onClick={onGetStarted} className="bg-blue-600 hover:bg-blue-700">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Split expenses. <span className="text-blue-600">Stay friends.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Easily track and settle shared costs with anyone, anytime. No more awkward money conversations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onGetStarted}
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              onClick={scrollToHowItWorks}
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6"
            >
              See How It Works
            </Button>
          </div>
          
          {/* Free Usage Badge */}
          <div className="mt-8">
            <Badge variant="secondary" className="text-green-700 bg-green-100 px-4 py-2 text-base">
              <CheckCircle className="h-4 w-4 mr-2" />
              Free to use – no hidden fees
            </Badge>
          </div>

          {/* Hero Visual */}
          <div className="mt-12 bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-blue-100 to-green-100 rounded-lg p-6">
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 mb-4">Weekend Trip to Lake Tahoe</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white rounded p-3">
                    <span className="text-gray-600">Gas</span>
                    <span className="font-medium">$120.00</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded p-3">
                    <span className="text-gray-600">Airbnb</span>
                    <span className="font-medium">$320.00</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded p-3">
                    <span className="text-gray-600">Groceries</span>
                    <span className="font-medium">$85.50</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800">Your share:</span>
                    <span className="font-bold text-blue-600 text-lg">$131.38</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Create a Group</h3>
              <p className="text-gray-600">
                Invite friends, family, or roommates to join your expense group
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Add Expenses</h3>
              <p className="text-gray-600">
                Log shared expenses and choose how to split them among the group
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Split & Settle</h3>
              <p className="text-gray-600">
                See who owes what and settle up with integrated payment options
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose SplitWize?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage shared expenses effortlessly
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle className="text-lg">Easy Group Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Set up groups in seconds and invite members with a simple link
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader>
                <DollarSign className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle className="text-lg">Real-Time Splitting</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Split expenses equally, by percentage, or custom amounts instantly
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle className="text-lg">Analytics & Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track spending patterns and get insights into your group expenses
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-10 w-10 text-red-600 mb-2" />
                <CardTitle className="text-lg">Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your financial data is encrypted and protected with enterprise-grade security
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Join thousands of happy users worldwide</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">
                  "SplitWize made our group vacation so much easier! No more awkward conversations about who owes what."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    S
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Sarah Chen</p>
                    <p className="text-gray-600 text-sm">College Student</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-white">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">
                  "Perfect for managing household expenses with roommates. The interface is clean and intuitive."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                    M
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Mike Rodriguez</p>
                    <p className="text-gray-600 text-sm">Software Engineer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">
                  "Love the analytics feature! It helps us understand our spending habits as a family."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    E
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Emily Johnson</p>
                    <p className="text-gray-600 text-sm">Working Parent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Splitting Smarter?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of users who have simplified their shared expenses with SplitWize
          </p>
          <Button 
            onClick={onGetStarted}
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6"
          >
            Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="h-6 w-6" />
                <span className="text-xl font-bold">SplitWize</span>
              </div>
              <p className="text-gray-400">
                Making shared expenses simple and stress-free for everyone.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Use</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SplitWize. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
