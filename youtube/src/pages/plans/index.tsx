import { Crown, Check } from "lucide-react";
import { useUser } from "@/src/lib/AuthContext";
import axiosInstance from "@/src/lib/axiosinstance";
import { useEffect, useState } from "react";

const PLANS = [
  {
    key: "free",
    label: "Free",
    price: 0,
    minutes: 5,
    color: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    features: ["Watch 5 minutes per video", "Post comments", "Like & share videos"],
  },
  {
    key: "bronze",
    label: "Bronze",
    price: 10,
    minutes: 7,
    color: "border-orange-400",
    badge: "bg-orange-100 text-orange-700",
    features: ["Watch 7 minutes per video", "All Free features", "Priority support"],
  },
  {
    key: "silver",
    label: "Silver",
    price: 50,
    minutes: 10,
    color: "border-gray-400",
    badge: "bg-gray-100 text-gray-700",
    features: ["Watch 10 minutes per video", "All Bronze features", "HD streaming"],
  },
  {
    key: "gold",
    label: "Gold",
    price: 100,
    minutes: -1,
    color: "border-yellow-400",
    badge: "bg-yellow-100 text-yellow-700",
    features: ["Unlimited watch time", "All Silver features", "Ad-free experience", "Invoice by email"],
    popular: true,
  },
];

const PlansPage = () => {
  const { user } = useUser();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [isProcessing, setIsProcessing] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get(`/plan/status/${user._id}`);
        setCurrentPlan(res.data.plan || "free");
      } catch (error) {
        console.log(error);
      }
    };
    fetchPlan();

    // Load Razorpay
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [user]);

  const handleUpgrade = async (planKey: string) => {
    if (!user) { setMessage("Please login to upgrade."); return; }
    if (planKey === "free" || planKey === currentPlan) return;

    setIsProcessing(planKey);
    setMessage("");

    try {
      const orderRes = await axiosInstance.post("/plan/create-order", { plan: planKey });
      const order = orderRes.data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "YourTube",
        description: `${order.planName} Plan`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosInstance.post("/plan/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              plan: planKey,
            });
            if (verifyRes.data.success) {
              setCurrentPlan(planKey);
              setMessage(`🎉 ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated! Invoice sent to ${user.email}`);
            }
          } catch {
            setMessage("Payment verification failed.");
          } finally {
            setIsProcessing("");
          }
        },
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#CC0000" },
        modal: { ondismiss: () => setIsProcessing("") },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      setIsProcessing("");
      setMessage("Failed to initiate payment.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-gray-500">Upgrade for more watch time and exclusive features</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-6 text-center">
          {message}
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`relative border-2 ${plan.color} rounded-2xl p-6 flex flex-col ${
              plan.popular ? "shadow-lg scale-105" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
            )}

            <div className={`inline-block self-start text-xs font-semibold px-3 py-1 rounded-full mb-4 ${plan.badge}`}>
              {plan.label}
            </div>

            <div className="mb-4">
              {plan.price === 0 ? (
                <span className="text-3xl font-bold">Free</span>
              ) : (
                <span className="text-3xl font-bold">Rs.{plan.price}</span>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {plan.minutes === -1 ? "Unlimited watch time" : `${plan.minutes} min per video`}
              </p>
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.key)}
              disabled={plan.key === "free" || currentPlan === plan.key || !!isProcessing}
              className={`w-full py-2 rounded-xl text-sm font-semibold transition ${
                currentPlan === plan.key
                  ? "bg-green-100 text-green-700 cursor-default"
                  : plan.key === "free"
                  ? "bg-gray-100 text-gray-400 cursor-default"
                  : "bg-gray-900 hover:bg-gray-700 text-white"
              }`}
            >
              {currentPlan === plan.key
                ? "✓ Current Plan"
                : plan.key === "free"
                ? "Default"
                : isProcessing === plan.key
                ? "Processing..."
                : `Upgrade to ${plan.label}`}
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        Payments are secured by Razorpay. Invoice will be sent to your registered email after payment.
      </p>
    </div>
  );
};

export default PlansPage;