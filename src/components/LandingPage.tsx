import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Users,
  DollarSign,
  BarChart3,
  Shield,
  Star,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LandingPageProps {
  onGetStarted: () => void;
}

const AnimatedExpenseCards: React.FC = () => {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimating(true);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % expenseCards.length);
        setAnimating(false);
      }, 400); // animation duration
    }, 3500);
    return () => clearTimeout(timer);
  }, [active]);

  const card = expenseCards[active];

  return (
    <div
      className={`bg-white rounded-3xl shadow-2xl p-8 flex flex-col gap-4 max-w-md mx-auto border ${
        card.accent
      } transition-all duration-500 ${
        animating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
      style={{ minHeight: 320 }}
    >
      <h3 className="font-semibold text-gray-800 mb-2 text-lg flex items-center gap-2">
        {card.title}
        <span className="animate-pulse text-xs text-blue-400">●</span>
      </h3>
      <div className="space-y-2">
        {card.items.map((item, idx) => (
          <div
            key={item.label}
            className={`flex justify-between items-center ${item.color} rounded p-3 transition-all duration-300`}
            style={{
              transform: animating ? "translateX(40px)" : "translateX(0)",
            }}
          >
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-800">Your share:</span>
          <span className="font-bold text-blue-600 text-xl">{card.share}</span>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-2">
        {expenseCards.map((_, idx) => (
          <button
            key={idx}
            className={`w-2 h-2 rounded-full ${
              active === idx ? "bg-blue-500" : "bg-gray-300"
            } transition-all duration-300`}
            aria-label={`Show card ${idx + 1}`}
            onClick={() => setActive(idx)}
          />
        ))}
      </div>
    </div>
  );
};

const expenseCards = [
  {
    title: "Trip to Sylhet, Bangladesh",
    items: [
      { label: "Gas", value: "$120.00", color: "bg-blue-50" },
      { label: "Airbnb", value: "$320.00", color: "bg-green-50" },
      { label: "Groceries", value: "$85.50", color: "bg-purple-50" },
    ],
    share: "$131.38",
    accent: "border-blue-100",
  },
  {
    title: "Roommate Monthly Expenses",
    items: [
      { label: "Rent", value: "$950.00", color: "bg-green-50" },
      { label: "Utilities", value: "$120.00", color: "bg-blue-50" },
      { label: "Internet", value: "$45.00", color: "bg-purple-50" },
    ],
    share: "$371.67",
    accent: "border-green-100",
  },
  {
    title: "Friends Night Out",
    items: [
      { label: "Dinner", value: "$180.00", color: "bg-purple-50" },
      { label: "Drinks", value: "$60.00", color: "bg-blue-50" },
      { label: "Ride Share", value: "$35.00", color: "bg-green-50" },
    ],
    share: "$91.67",
    accent: "border-purple-100",
  },
];

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const scrollToHowItWorks = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-green-100 flex flex-col">
      {/* Redesigned Header */}
      <header className="w-full bg-white/80 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <DollarSign className="h-9 w-9 text-blue-600" />
            <span className="text-3xl font-extrabold text-blue-700 tracking-tight">
              SplitWize
            </span>
          </div>
          <Button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white px-6 py-2 text-lg rounded-full shadow"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Modern Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100 py-20">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Split expenses.
              <br /> <span className="text-blue-600">Stay friends.</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-lg">
              Track, split, and settle shared costs with anyone. No more awkward
              money talks—just simple, smart group budgeting.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-lg px-8 py-5 rounded-full shadow"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={scrollToHowItWorks}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-5 rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                See How It Works
              </Button>
            </div>
            <div className="mt-8">
              <Badge
                variant="secondary"
                className="text-green-700 bg-green-100 px-5 py-2 text-base rounded-full shadow"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Free to use – no hidden fees
              </Badge>
            </div>
          </div>
          {/* Animated Expense Cards Carousel */}
          <AnimatedExpenseCards />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-blue-700 mb-4">
              How SplitWize Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Create a Group
              </h3>
              <p className="text-gray-600 text-base">
                Invite friends, family, or roommates to join your expense group.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow">
                <DollarSign className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Add Expenses
              </h3>
              <p className="text-gray-600 text-base">
                Log shared expenses and choose how to split them among the
                group.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow">
                <BarChart3 className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Split & Settle
              </h3>
              <p className="text-gray-600 text-base">
                See who owes what and settle up with integrated payment options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Redesigned */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-blue-700 mb-4">
              Why SplitWize?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage shared expenses effortlessly
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <Card className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow border border-blue-100">
              <CardHeader>
                <Users className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle className="text-lg font-bold">
                  Easy Group Creation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Set up groups in seconds and invite members with a simple
                  link.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow border border-green-100">
              <CardHeader>
                <DollarSign className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle className="text-lg font-bold">
                  Real-Time Splitting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Split expenses equally, by percentage, or custom amounts
                  instantly.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow border border-purple-100">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle className="text-lg font-bold">
                  Analytics & Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track spending patterns and get insights into your group
                  expenses.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow border border-red-100">
              <CardHeader>
                <Shield className="h-10 w-10 text-red-600 mb-2" />
                <CardTitle className="text-lg font-bold">
                  Secure & Private
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your financial data is encrypted and protected with
                  enterprise-grade security.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials - Redesigned */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-blue-700 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of happy users worldwide
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-100">
              <CardContent className="pt-8">
                <div className="flex mb-4 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-6 w-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 text-lg italic">
                  "SplitWize made our group vacation so much easier! No more
                  awkward conversations about who owes what."
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    S
                  </div>
                  <div className="ml-4">
                    <p className="font-bold text-gray-900">Sarah Chen</p>
                    <p className="text-gray-600 text-sm">College Student</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-white border border-green-100">
              <CardContent className="pt-8">
                <div className="flex mb-4 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-6 w-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 text-lg italic">
                  "Perfect for managing household expenses with roommates. The
                  interface is clean and intuitive."
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    M
                  </div>
                  <div className="ml-4">
                    <p className="font-bold text-gray-900">Mike Rodriguez</p>
                    <p className="text-gray-600 text-sm">Software Engineer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-white border border-purple-100">
              <CardContent className="pt-8">
                <div className="flex mb-4 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-6 w-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 text-lg italic">
                  "Love the analytics feature! It helps us understand our
                  spending habits as a family."
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    E
                  </div>
                  <div className="ml-4">
                    <p className="font-bold text-gray-900">Emily Johnson</p>
                    <p className="text-gray-600 text-sm">Working Parent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA - Redesigned */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold mb-4">
            Ready to Split Smarter?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of users who have simplified their shared expenses
            with SplitWize.
          </p>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-10 py-6 rounded-full shadow"
          >
            Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer - Redesigned */}
      <footer className="bg-gray-900 text-white py-14 mt-auto">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-7 w-7" />
                <span className="text-2xl font-extrabold">SplitWize</span>
              </div>
              <p className="text-gray-400 text-base">
                Making shared expenses simple and stress-free for everyone.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-lg">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-lg">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-lg">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-8 text-center text-gray-400">
            <p>
              &copy; 2025 SplitWize. Developed with ❤️ by{" "}
              <a href="sumonahmed.info" className="underline">
                Sumon Ahmed
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
